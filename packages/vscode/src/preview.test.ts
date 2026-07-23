import { describe, it, expect } from 'vitest';
import {
  previewDocument,
  parseEngineDirective,
  resolveEngine,
} from './preview.js';

const CSP = 'vscode-webview://xyz';

describe('parseEngineDirective', () => {
  it('returns undefined when there is no directive', () => {
    expect(parseEngineDirective('digraph { a -> b }')).toBeUndefined();
  });

  it('reads a `// engine: <name>` line comment', () => {
    expect(parseEngineDirective('// engine: neato\ngraph { a -- b }')).toBe(
      'neato',
    );
  });

  it('reads a `# engine = <name>` line comment (case-insensitive)', () => {
    expect(parseEngineDirective('#  ENGINE = FDP\ngraph { a -- b }')).toBe('fdp');
  });

  it('scans past blank/comment lines but stops at graph content', () => {
    expect(parseEngineDirective('\n// header\n// engine: circo\ndigraph {}')).toBe(
      'circo',
    );
    // a directive after the graph body is ignored
    expect(parseEngineDirective('digraph {}\n// engine: neato')).toBeUndefined();
  });

  it('ignores an unknown engine name', () => {
    expect(parseEngineDirective('// engine: bogus\ndigraph {}')).toBeUndefined();
  });
});

describe('resolveEngine (layered precedence)', () => {
  it('prefers a remembered override over everything', () => {
    expect(
      resolveEngine({ override: 'fdp', directive: 'neato', fallback: 'dot' }),
    ).toBe('fdp');
  });

  it('uses the in-file directive when there is no override', () => {
    expect(resolveEngine({ directive: 'neato', fallback: 'circo' })).toBe('neato');
  });

  it('falls back to the configured default when nothing else applies', () => {
    expect(resolveEngine({ fallback: 'twopi' })).toBe('twopi');
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
