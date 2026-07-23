import { describe, it, expect } from 'vitest';
import { renderPreviewHtml } from './preview.js';

const CSP = 'vscode-webview://xyz';

describe('renderPreviewHtml', () => {
  it('renders valid DOT to an inline <svg> document', () => {
    const html = renderPreviewHtml('digraph { a -> b }', CSP);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<svg');
    expect(html).not.toContain('class="error"');
  });

  it('embeds a Content-Security-Policy scoped to the webview source', () => {
    const html = renderPreviewHtml('digraph { a -> b }', CSP);
    expect(html).toContain('Content-Security-Policy');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain(`style-src ${CSP}`);
  });

  it('renders an error panel (not <svg>) for invalid DOT', () => {
    const html = renderPreviewHtml('nope {{{', CSP);
    expect(html).toContain('class="error"');
    expect(html).toContain('role="alert"');
    expect(html).not.toContain('<svg');
  });

  it('uses theme CSS variables so the diagram is theme-aware', () => {
    const html = renderPreviewHtml('digraph { a -> b }', CSP);
    expect(html).toContain('--vscode-editor-foreground');
  });
});
