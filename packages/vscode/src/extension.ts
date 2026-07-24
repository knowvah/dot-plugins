// SPDX-License-Identifier: MIT
/**
 * VS Code extension entry: wires the DOT preview `PreviewManager` to commands
 * and document events, and contributes the DOT fence renderer to the built-in
 * Markdown preview. Syntax highlighting and language association are declarative
 * (`package.json` `contributes`).
 */
import type MarkdownIt from 'markdown-it';
import * as vscode from 'vscode';
import {
  PreviewManager,
  configuredDefaultEngine,
  configuredUseCurrentColor,
} from './preview-manager.js';
import { extendMarkdownIt } from './markdown.js';

/** The API VS Code reads from `activate()` to extend the Markdown preview. */
export interface DotExtensionApi {
  extendMarkdownIt(md: MarkdownIt): MarkdownIt;
}

export function activate(context: vscode.ExtensionContext): DotExtensionApi {
  const workerPath = vscode.Uri.joinPath(
    context.extensionUri,
    'dist',
    'render-worker.js',
  ).fsPath;
  const manager = new PreviewManager(context.workspaceState, workerPath);
  vscode.workspace.textDocuments.forEach((doc) => manager.refreshDiagnostics(doc));

  context.subscriptions.push(
    manager,
    vscode.commands.registerCommand('dot.showPreview', () => {
      const doc = vscode.window.activeTextEditor?.document;
      if (doc?.languageId === 'dot') manager.showPreview(doc);
    }),
    vscode.commands.registerCommand('dot.selectEngine', () => void manager.selectEngine()),
    vscode.commands.registerCommand('dot.clearEngineOverride', (uri?: vscode.Uri) =>
      void manager.clearOverride(uri),
    ),
    vscode.languages.registerCodeActionsProvider('dot', manager, {
      providedCodeActionKinds: [vscode.CodeActionKind.QuickFix],
    }),
    vscode.workspace.onDidOpenTextDocument((doc) => manager.refreshDiagnostics(doc)),
    vscode.workspace.onDidCloseTextDocument((doc) => manager.closed(doc)),
    vscode.workspace.onDidChangeTextDocument((e) => manager.onDidChange(e)),
  );

  // The Markdown preview uses the configured default engine for blocks with no
  // per-block `engine=` directive, and the configured currentColor remap. Both
  // are read here (per extendMarkdownIt call) so a settings change applies on
  // the next preview refresh.
  return {
    extendMarkdownIt: (md) =>
      extendMarkdownIt(md, configuredDefaultEngine(), configuredUseCurrentColor()),
  };
}

export function deactivate(): void {
  // Everything is disposed via context.subscriptions (incl. the PreviewManager).
}
