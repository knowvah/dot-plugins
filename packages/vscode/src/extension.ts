// SPDX-License-Identifier: MIT
/**
 * VS Code extension host: a `.dot` / `.gv` live preview. The `dot.showPreview`
 * command renders the active DOT document to inline SVG in a webview beside the
 * editor and keeps it in sync as the document changes. Syntax highlighting is
 * contributed declaratively (the `grammars` contribution in package.json); this
 * file only adds the preview.
 */
import * as path from 'node:path';
import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import { renderPreviewHtml } from './preview.js';
import { extendMarkdownIt } from './markdown.js';

const VIEW_TYPE = 'dot.preview';

/** The API VS Code reads from `activate()` to extend the Markdown preview. */
export interface DotExtensionApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
}

export function activate(context: vscode.ExtensionContext): DotExtensionApi {
  // One reusable preview panel per source document, keyed by URI.
  const panels = new Map<string, vscode.WebviewPanel>();

  const update = (panel: vscode.WebviewPanel, doc: vscode.TextDocument): void => {
    panel.webview.html = renderPreviewHtml(doc.getText(), panel.webview.cspSource);
  };

  const openPreview = (doc: vscode.TextDocument): void => {
    const key = doc.uri.toString();
    let panel = panels.get(key);
    if (panel === undefined) {
      panel = vscode.window.createWebviewPanel(
        VIEW_TYPE,
        `Preview ${path.basename(doc.uri.fsPath)}`,
        { viewColumn: vscode.ViewColumn.Beside, preserveFocus: true },
        { enableScripts: false, retainContextWhenHidden: true },
      );
      panel.onDidDispose(() => panels.delete(key));
      panels.set(key, panel);
    }
    update(panel, doc);
    panel.reveal(vscode.ViewColumn.Beside, true);
  };

  context.subscriptions.push(
    vscode.commands.registerCommand('dot.showPreview', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc !== undefined && doc.languageId === 'dot') openPreview(doc);
    }),
    vscode.workspace.onDidChangeTextDocument((e) => {
      const panel = panels.get(e.document.uri.toString());
      if (panel !== undefined) update(panel, e.document);
    }),
  );

  // Contribute the DOT fence renderer to VS Code's built-in Markdown preview.
  return { extendMarkdownIt };
}

export function deactivate(): void {
  // Preview panels are disposed via context.subscriptions / onDidDispose.
}
