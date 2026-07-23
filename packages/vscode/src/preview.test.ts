import { describe, it, expect } from 'vitest';
import { renderPreviewHtml, resolveEngine } from './preview.js';

const CSP = 'vscode-webview://xyz';

describe('resolveEngine', () => {
  it('defaults to dot when there is no directive', () => {
    expect(resolveEngine('digraph { a -> b }')).toBe('dot');
  });

  it('reads a `// engine: <name>` line comment', () => {
    expect(resolveEngine('// engine: neato\ngraph { a -- b }')).toBe('neato');
  });

  it('reads a `# engine = <name>` line comment (and is case-insensitive)', () => {
    expect(resolveEngine('#  ENGINE = FDP\ngraph { a -- b }')).toBe('fdp');
  });

  it('scans past blank/comment lines but stops at graph content', () => {
    expect(resolveEngine('\n// header\n// engine: circo\ndigraph {}')).toBe(
      'circo',
    );
    // a directive after the graph body is ignored
    expect(resolveEngine('digraph {}\n// engine: neato')).toBe('dot');
  });

  it('ignores an unknown engine name (falls back to dot)', () => {
    expect(resolveEngine('// engine: bogus\ndigraph {}')).toBe('dot');
  });
});

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
