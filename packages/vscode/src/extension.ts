// SPDX-License-Identifier: MIT
/**
 * VS Code extension host: a `.dot` / `.gv` live preview. `dot.showPreview`
 * renders the active document to inline SVG beside the editor (in a terminable
 * worker; see `render-service.ts`) and keeps it in sync. `dot.selectEngine`
 * lets the user pick the layout engine; a non-default choice is remembered per
 * document. Engine precedence: remembered pick → in-file `// engine:` directive
 * → `dot.preview.defaultEngine` → `dot`. Syntax highlighting and the Markdown
 * plugin are contributed separately.
 */
import * as path from 'node:path';
import type MarkdownIt from 'markdown-it';
import type { BuiltinEngine } from 'graphviz-ts';
import * as vscode from 'vscode';
import {
  previewDocument,
  parseEngineDirective,
  resolveEngine,
  BUILTIN_ENGINES,
  type EngineSources,
} from './preview.js';
import { DotRenderService } from './render-service.js';
import { extendMarkdownIt } from './markdown.js';

const VIEW_TYPE = 'dot.preview';
const DEBOUNCE_MS = 200;
const DEFAULT_TIMEOUT_SECONDS = 60;
const ENGINE_KEY_PREFIX = 'dot.engine:';

/** The API VS Code reads from `activate()` to extend the Markdown preview. */
export interface DotExtensionApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
}

function isBuiltinEngine(name: string | undefined): name is BuiltinEngine {
  return name !== undefined && (BUILTIN_ENGINES as readonly string[]).includes(name);
}

function configuredDefaultEngine(): BuiltinEngine {
  const name = vscode.workspace
    .getConfiguration('dot')
    .get<string>('preview.defaultEngine', 'dot');
  return isBuiltinEngine(name) ? name : 'dot';
}

/** File-preview render timeout in ms, from settings (read per render). */
function renderTimeoutMs(): number {
  const seconds = vscode.workspace
    .getConfiguration('dot')
    .get<number>('preview.renderTimeoutSeconds', DEFAULT_TIMEOUT_SECONDS);
  return Math.max(1, seconds) * 1000;
}

function engineKey(uri: vscode.Uri): string {
  return `${ENGINE_KEY_PREFIX}${uri.toString()}`;
}

function rememberedEngine(
  state: vscode.Memento,
  uri: vscode.Uri,
): BuiltinEngine | undefined {
  const name = state.get<string>(engineKey(uri));
  return isBuiltinEngine(name) ? name : undefined;
}

/** Assemble the engine sources for a document. `withOverride: false` yields the
 * "base" engine (directive/default) used to decide whether a pick is default. */
function enginesFor(
  state: vscode.Memento,
  doc: vscode.TextDocument,
  withOverride: boolean,
): EngineSources {
  return {
    override: withOverride ? rememberedEngine(state, doc.uri) : undefined,
    directive: parseEngineDirective(doc.getText()),
    fallback: configuredDefaultEngine(),
  };
}

function previewTitle(doc: vscode.TextDocument, engine: string): string {
  const base = path.basename(doc.uri.fsPath);
  return engine === 'dot' ? `Preview ${base}` : `Preview ${base} (${engine})`;
}

export function activate(context: vscode.ExtensionContext): DotExtensionApi {
  const state = context.workspaceState;
  const workerPath = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'render-worker.js',
  ).fsPath;
  const renderer = new DotRenderService(workerPath, renderTimeoutMs);

  const panels = new Map<string, vscode.WebviewPanel>();
  const debounces = new Map<string, ReturnType<typeof setTimeout>>();

  const engineOf = (doc: vscode.TextDocument): BuiltinEngine =>
    resolveEngine(enginesFor(state, doc, true));

  const update = async (
    panel: vscode.WebviewPanel,
    doc: vscode.TextDocument,
  ): Promise<void> => {
    const text = doc.getText();
    const version = doc.version;
    const engine = engineOf(doc);
    panel.title = previewTitle(doc, engine); // immediate feedback
    const result = await renderer.render({ dot: text, engine });
    // Drop a stale render: the panel closed, or a newer edit superseded this one.
    if (panels.get(doc.uri.toString()) !== panel || doc.version !== version) return;
    panel.webview.html = previewDocument(result, panel.webview.cspSource);
  };

  const openPreview = (doc: vscode.TextDocument): void => {
    const key = doc.uri.toString();
    let panel = panels.get(key);
    if (panel === undefined) {
      panel = vscode.window.createWebviewPanel(
        VIEW_TYPE,
        previewTitle(doc, engineOf(doc)),
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false, retainContextWhenHidden: true },
      );
      panel.onDidDispose(() => panels.delete(key));
      panels.set(key, panel);
    }
    void update(panel, doc);
    panel.reveal(vscode.ViewColumn.Beside, true);
  };

  const selectEngine = async (): Promise<void> => {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined || doc.languageId !== 'dot') return;
    const current = engineOf(doc);
    const picked = await vscode.window.showQuickPick(
      BUILTIN_ENGINES.map((engine) => ({
        label: engine,
        description: engine === current ? 'current' : undefined,
        engine,
      })),
      {
        title: 'DOT: Select Layout Engine',
        placeHolder: `Layout engine for ${path.basename(doc.uri.fsPath)}`,
      },
    );
    if (picked === undefined) return;
    // Remember a non-default pick; picking the base engine clears the override.
    const base = resolveEngine(enginesFor(state, doc, false));
    await state.update(engineKey(doc.uri), picked.engine === base ? undefined : picked.engine);
    openPreview(doc);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('dot.showPreview', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc !== undefined && doc.languageId === 'dot') openPreview(doc);
    }),
    vscode.commands.registerCommand('dot.selectEngine', () => void selectEngine()),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const key = e.document.uri.toString();
      const panel = panels.get(key);
      if (panel === undefined) return;
      clearTimeout(debounces.get(key));
      debounces.set(
        key,
        setTimeout(() => void update(panel, e.document), DEBOUNCE_MS),
      );
    }),
    { dispose: () => renderer.disposeAll() },
  );

  // Contribute the DOT fence renderer to VS Code's built-in Markdown preview,
  // using the configured default engine for blocks with no `engine=` directive.
  return { extendMarkdownIt: (md) => extendMarkdownIt(md, configuredDefaultEngine()) };
}

export function deactivate(): void {
  // Preview panels and the render service are disposed via context.subscriptions.
}
