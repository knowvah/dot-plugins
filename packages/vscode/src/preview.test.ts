import { describe, it, expect } from 'vitest';
import { previewDocument, resolveEngine } from './preview.js';

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

describe('previewDocument', () => {
  it('wraps inline SVG in a themed HTML document with a scoped CSP', () => {
    const html = previewDocument({ svg: '<svg id="g"></svg>' }, CSP);
    expect(html).toContain('<!DOCTYPE html>');
    expect(html).toContain('<svg id="g">');
    expect(html).toContain("default-src 'none'");
    expect(html).toContain(`style-src ${CSP}`);
    expect(html).toContain('--vscode-editor-foreground');
    expect(html).not.toContain('class="error"');
  });

  it('renders an escaped error panel when there is no SVG', () => {
    const html = previewDocument({ error: 'boom <x> & fail' }, CSP);
    expect(html).toContain('class="error"');
    expect(html).toContain('role="alert"');
    expect(html).toContain('boom &lt;x&gt; &amp; fail');
    expect(html).not.toContain('<svg');
  });
});
