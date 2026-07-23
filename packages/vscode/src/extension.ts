// SPDX-License-Identifier: MIT
/**
 * VS Code extension host: a `.dot` / `.gv` live preview. The `dot.showPreview`
 * command renders the active DOT document to inline SVG in a webview beside the
 * editor and keeps it in sync as the document changes. Rendering runs in a
 * terminable worker (see `render-service.ts`) so a non-terminating graph is
 * killed on timeout rather than freezing the host. Syntax highlighting and the
 * Markdown-preview plugin are contributed separately.
 */
import * as path from 'node:path';
import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { previewDocument, resolveEngine } from './preview.js';
import { DotRenderService } from './render-service.js';
import { extendMarkdownIt } from './markdown.js';

const VIEW_TYPE = 'dot.preview';
const DEBOUNCE_MS = 200;
const DEFAULT_TIMEOUT_SECONDS = 60;

/** The API VS Code reads from `activate()` to extend the Markdown preview. */
export interface DotExtensionApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
}

function previewTitle(doc: vscode.TextDocument, engine: string): string {
  const base = path.basename(doc.uri.fsPath);
  return engine === 'dot' ? `Preview ${base}` : `Preview ${base} (${engine})`;
}

/** The file-preview render timeout in ms, from settings (read per render, so a
 * live change applies without a reload). */
function renderTimeoutMs(): number {
  const seconds = vscode.workspace
    .getConfiguration('dot')
    .get<number>('preview.renderTimeoutSeconds', DEFAULT_TIMEOUT_SECONDS);
  return Math.max(1, seconds) * 1000;
}

export function activate(context: vscode.ExtensionContext): DotExtensionApi {
  const workerPath = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'render-worker.js',
  ).fsPath;
  const renderer = new DotRenderService(workerPath, renderTimeoutMs);

  const panels = new Map<string, vscode.WebviewPanel>();
  const debounces = new Map<string, ReturnType<typeof setTimeout>>();

  const update = async (
    panel: vscode.WebviewPanel,
    doc: vscode.TextDocument,
  ): Promise<void> => {
    const text = doc.getText();
    const version = doc.version;
    panel.title = previewTitle(doc, resolveEngine(text)); // immediate feedback
    const result = await renderer.render({ dot: text, engine: resolveEngine(text) });
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
        previewTitle(doc, resolveEngine(doc.getText())),
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false, retainContextWhenHidden: true },
      );
      panel.onDidDispose(() => panels.delete(key));
      panels.set(key, panel);
    }
    void update(panel, doc);
    panel.reveal(vscode.ViewColumn.Beside, true);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('dot.showPreview', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc !== undefined && doc.languageId === 'dot') openPreview(doc);
    }),
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

  // Contribute the DOT fence renderer to VS Code's built-in Markdown preview.
  return { extendMarkdownIt };
}

export function deactivate(): void {
  // Preview panels and the render service are disposed via context.subscriptions.
}
