// SPDX-License-Identifier: MIT
/**
 * The `.dot`/`.gv` preview imperative shell: owns webview panels, the render
 * worker, per-file engine memory, and the engine-conflict diagnostic. Pure
 * logic (engine resolution, conflict detection, HTML wrapping) lives in
 * `preview.ts`; this module is the vscode-coupled glue that `extension.ts`
 * wires to commands and events.
 */
import * as path from 'node:path';
import type { BuiltinEngine } from 'graphviz-ts';
import * as vscode from 'vscode';
import { normalizeEngine } from '@knowvah/dot-core';
import {
  previewDocument,
  parseEngineDirective,
  engineConflict,
  resolveEngine,
  BUILTIN_ENGINES,
  type EngineSources,
} from './preview.js';
import { DotRenderService } from './render-service.js';

const VIEW_TYPE = 'dot.preview';
const DEBOUNCE_MS = 200;
const DEFAULT_TIMEOUT_SECONDS = 60;
const ENGINE_KEY_PREFIX = 'dot.engine:';
const ENGINE_CONFLICT_CODE = 'engine-override-conflict';

function isBuiltinEngine(name: string | undefined): name is BuiltinEngine {
  return name !== undefined && (BUILTIN_ENGINES as readonly string[]).includes(name);
}

/** The configured default engine (`dot.preview.defaultEngine`), validated. */
export function configuredDefaultEngine(): BuiltinEngine {
  const name = normalizeEngine(
    vscode.workspace.getConfiguration('dot').get<string>('preview.defaultEngine', 'dot'),
  );
  return isBuiltinEngine(name) ? name : 'dot';
}

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

export class PreviewManager
  implements vscode.CodeActionProvider, vscode.Disposable
{
  private readonly panels = new Map<string, vscode.WebviewPanel>();
  private readonly debounces = new Map<string, ReturnType<typeof setTimeout>>();
  private readonly diagnostics = vscode.languages.createDiagnosticCollection('dot');
  private readonly renderer: DotRenderService;

  constructor(
    private readonly state: vscode.Memento,
    workerPath: string,
  ) {
    this.renderer = new DotRenderService(workerPath, renderTimeoutMs);
  }

  dispose(): void {
    this.renderer.disposeAll();
    this.diagnostics.dispose();
  }

  private engineOf(doc: vscode.TextDocument): BuiltinEngine {
    return resolveEngine(enginesFor(this.state, doc, true));
  }

  private async render(
    panel: vscode.WebviewPanel,
    doc: vscode.TextDocument,
  ): Promise<void> {
    const text = doc.getText();
    const version = doc.version;
    const engine = this.engineOf(doc);
    panel.title = previewTitle(doc, engine);
    const result = await this.renderer.render({ dot: text, engine });
    // Drop a stale render: the panel closed, or a newer edit superseded it.
    if (this.panels.get(doc.uri.toString()) !== panel || doc.version !== version) return;
    panel.webview.html = previewDocument(result, panel.webview.cspSource);
  }

  showPreview(doc: vscode.TextDocument): void {
    const key = doc.uri.toString();
    let panel = this.panels.get(key);
    if (panel === undefined) {
      panel = vscode.window.createWebviewPanel(
        VIEW_TYPE,
        previewTitle(doc, this.engineOf(doc)),
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false, retainContextWhenHidden: true },
      );
      panel.onDidDispose(() => this.panels.delete(key));
      this.panels.set(key, panel);
    }
    void this.render(panel, doc);
    panel.reveal(vscode.ViewColumn.Beside, true);
  }

  onDidChange(e: vscode.TextDocumentChangeEvent): void {
    this.refreshDiagnostics(e.document);
    const key = e.document.uri.toString();
    const panel = this.panels.get(key);
    if (panel === undefined) return;
    clearTimeout(this.debounces.get(key));
    this.debounces.set(
      key,
      setTimeout(() => void this.render(panel, e.document), DEBOUNCE_MS),
    );
  }

  closed(doc: vscode.TextDocument): void {
    this.diagnostics.delete(doc.uri);
  }

  async selectEngine(): Promise<void> {
    const doc = vscode.window.activeTextEditor?.document;
    if (doc === undefined || doc.languageId !== 'dot') return;
    const current = this.engineOf(doc);
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
    const base = resolveEngine(enginesFor(this.state, doc, false));
    await this.state.update(
      engineKey(doc.uri),
      picked.engine === base ? undefined : picked.engine,
    );
    this.refreshDiagnostics(doc);
    this.showPreview(doc);
  }

  async clearOverride(uri?: vscode.Uri): Promise<void> {
    const target = uri ?? vscode.window.activeTextEditor?.document.uri;
    if (target === undefined) return;
    await this.state.update(engineKey(target), undefined);
    const doc = vscode.workspace.textDocuments.find(
      (d) => d.uri.toString() === target.toString(),
    );
    if (doc === undefined) return;
    this.refreshDiagnostics(doc);
    const panel = this.panels.get(target.toString());
    if (panel !== undefined) void this.render(panel, doc);
  }

  refreshDiagnostics(doc: vscode.TextDocument): void {
    if (doc.languageId !== 'dot') return;
    const conflict = engineConflict(doc.getText(), rememberedEngine(this.state, doc.uri));
    if (conflict === undefined) {
      this.diagnostics.delete(doc.uri);
      return;
    }
    const range = new vscode.Range(
      conflict.line,
      conflict.start,
      conflict.line,
      conflict.end,
    );
    const diag = new vscode.Diagnostic(
      range,
      `This file declares engine "${conflict.engine}", but a remembered selection "${conflict.override}" is overriding it in the preview. Pick "${conflict.engine}" via DOT: Select Layout Engine, or use the Quick Fix, to clear the override.`,
      vscode.DiagnosticSeverity.Warning,
    );
    diag.source = 'dot';
    diag.code = ENGINE_CONFLICT_CODE;
    this.diagnostics.set(doc.uri, [diag]);
  }

  provideCodeActions(
    doc: vscode.TextDocument,
    _range: vscode.Range | vscode.Selection,
    ctx: vscode.CodeActionContext,
  ): vscode.CodeAction[] {
    return ctx.diagnostics
      .filter((d) => d.code === ENGINE_CONFLICT_CODE)
      .map((d) => {
        const fix = new vscode.CodeAction(
          'Clear remembered engine override',
          vscode.CodeActionKind.QuickFix,
        );
        fix.command = {
          command: 'dot.clearEngineOverride',
          title: 'Clear remembered engine override',
          arguments: [doc.uri],
        };
        fix.diagnostics = [d];
        fix.isPreferred = true;
        return fix;
      });
  }
}
