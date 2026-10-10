import { describe, it, expect } from 'vitest';
import {
  parseFenceInfo,
  normalizeEngine,
  toInlineSvg,
  currentColorRemap,
  resolveConfig,
  renderDotHtml,
  renderDotSvg,
  type ResolvedConfig,
} from './index.js';
import { renderDiagram } from './browser.js';

describe('normalizeEngine', () => {
  it('lowercases and trims engine names', () => {
    expect(normalizeEngine('NEATO')).toBe('neato');
    expect(normalizeEngine('  Fdp  ')).toBe('fdp');
    expect(normalizeEngine('dot')).toBe('dot');
  });
});

describe('parseFenceInfo', () => {
  it('extracts the language', () => {
    expect(parseFenceInfo('dot')).toEqual({ lang: 'dot', noRender: false });
  });
  it('reads a space-separated engine', () => {
    expect(parseFenceInfo('dot engine=neato')).toMatchObject({ engine: 'neato' });
  });
  it('reads a quoted engine value', () => {
    expect(parseFenceInfo('dot engine="circo"')).toMatchObject({ engine: 'circo' });
  });
  it('tolerates the {brace} form (non-VitePress hosts)', () => {
    expect(parseFenceInfo('dot {engine=neato}')).toMatchObject({ engine: 'neato' });
  });
  it('normalizes the engine name (case-insensitive)', () => {
    expect(parseFenceInfo('dot engine=NEATO')).toMatchObject({ engine: 'neato' });
    expect(parseFenceInfo('dot engine="Circo"')).toMatchObject({ engine: 'circo' });
  });
  it('detects no-render / client / build flags', () => {
    expect(parseFenceInfo('dot no-render').noRender).toBe(true);
    expect(parseFenceInfo('dot client').mode).toBe('client');
    expect(parseFenceInfo('dot build').mode).toBe('build');
    expect(parseFenceInfo('dot').mode).toBeUndefined();
  });
});

describe('pure svg helpers', () => {
  it('toInlineSvg strips the prolog/doctype', () => {
    const doc = '<?xml version="1.0"?>\n<!DOCTYPE svg>\n<svg><g/></svg>';
    expect(toInlineSvg(doc)).toBe('<svg><g/></svg>');
  });
  it('currentColorRemap maps default black to currentColor', () => {
    expect(currentColorRemap('<path stroke="black" fill="#000"/>')).toBe(
      '<path stroke="currentColor" fill="currentColor"/>',
    );
  });
});

const CFG: ResolvedConfig = resolveConfig({});

describe('renderDotHtml (build-mode render)', () => {
  it('renders valid DOT to an inline-SVG wrapper', () => {
    const html = renderDotHtml('digraph { a -> b }', 'dot', CFG);
    expect(html).toContain('<div class="dot-diagram">');
    expect(html).toContain('<svg');
    expect(html).not.toContain('<?xml');
  });

  it('renders an error panel on invalid DOT (no throw by default)', () => {
    const html = renderDotHtml('nope {{{', 'dot', CFG);
    expect(html).toContain('dot-diagram-error');
    expect(html).not.toContain('<svg');
  });

  it('throws when onError is "throw"', () => {
    const cfg = resolveConfig({ onError: 'throw' });
    expect(() => renderDotHtml('nope {{{', 'dot', cfg)).toThrow(/dot-core/);
  });

  it('remaps to currentColor when requested', () => {
    const cfg = resolveConfig({ useCurrentColor: true });
    const html = renderDotHtml('digraph { a -> b }', 'dot', cfg);
    expect(html).toContain('currentColor');
    expect(html).not.toContain('stroke="black"');
  });

  it('accepts a mixed-case engine name (normalized before rendering)', () => {
    const html = renderDotHtml('graph { a -- b }', 'NEATO' as never, CFG);
    expect(html).toContain('<svg');
    expect(html).not.toContain('dot-diagram-error');
  });

  it('timeout safe-mode: renders a normal graph via the child process', () => {
    const cfg = resolveConfig({ timeout: 15000 });
    expect(renderDotHtml('digraph { a -> b }', 'dot', cfg)).toContain('<svg');
  });

  it('timeout safe-mode: aborts to an error panel when exceeded', () => {
    const cfg = resolveConfig({ timeout: 1 });
    const html = renderDotHtml('digraph { a -> b }', 'dot', cfg);
    expect(html).toContain('dot-diagram-error');
    expect(html.toLowerCase()).toMatch(/timeout|aborted/);
  });
});

// dot-engine 2.x throws (TypeError ERR_INVALID_ARG_VALUE / _TYPE) for an
// unregistered engine or a non-string source instead of returning { errors }.
// A fence such as ```dot engine=foo reaches the engine after normalizeEngine,
// which only lowercases, so a typo must become a readable panel, not a crash.
const UNKNOWN_ENGINE_PANEL = 'The argument &quot;engine&quot; is invalid';
const WORKER_FALLBACK_TEXT = 'could not be rendered in the worker process';
const UNSUPPORTED_FEATURE_TEXT =
  'The graph uses a Graphviz feature that dot-engine does not support yet.';
const UNSUPPORTED_FEATURE_DOT = 'graph { mode=hier; a -- b }';

describe('renderDotSvg / renderDotHtml (dot-engine 2.0 error contract)', () => {
  it('returns the engine TypeError as a structured error (in-process)', () => {
    const result = renderDotSvg('digraph { a }', 'foo' as never, CFG);
    expect(result.svg).toBeUndefined();
    expect(result.error?.type).toBe('render');
    expect(result.error?.message).toContain('Received "foo"');
    expect(result.error?.friendlyMessage).toContain('allowed: dot, neato');
  });

  it('renders an unknown engine as an error panel (in-process)', () => {
    const html = renderDotHtml('digraph { a }', 'foo' as never, CFG);
    expect(html).toContain('dot-diagram-error');
    expect(html).toContain(UNKNOWN_ENGINE_PANEL);
    expect(html).not.toContain('<svg');
  });

  it('shows the engine message once when it is also the friendly text', () => {
    const html = renderDotHtml('digraph { a }', 'foo' as never, CFG);
    expect(html).not.toContain('<code>');
  });

  it('renders an unknown engine as an error panel (child process)', () => {
    const cfg = resolveConfig({ timeout: 15000 });
    const html = renderDotHtml('digraph { a }', 'foo' as never, cfg);
    expect(html).toContain('dot-diagram-error');
    expect(html).toContain(UNKNOWN_ENGINE_PANEL);
    expect(html).not.toContain(WORKER_FALLBACK_TEXT);
  });

  it('renders a non-string source as an error panel (in-process)', () => {
    const html = renderDotHtml(42 as never, 'dot', CFG);
    expect(html).toContain('dot-diagram-error');
    expect(html).toContain('must be of type string');
  });

  it('renders a non-string engine as an error panel (in-process)', () => {
    const html = renderDotHtml('digraph { a }', 7 as never, CFG);
    expect(html).toContain('dot-diagram-error');
    expect(html).toContain('Graphviz render error');
  });

  it('renders UNSUPPORTED_FEATURE as an error panel (in-process)', () => {
    const html = renderDotHtml(UNSUPPORTED_FEATURE_DOT, 'neato', CFG);
    expect(html).toContain('dot-diagram-error');
    expect(html).toContain(UNSUPPORTED_FEATURE_TEXT);
    expect(html).toContain('mode=hier');
  });

  it('renders UNSUPPORTED_FEATURE as an error panel (child process)', () => {
    const cfg = resolveConfig({ timeout: 15000 });
    const html = renderDotHtml(UNSUPPORTED_FEATURE_DOT, 'neato', cfg);
    expect(html).toContain(UNSUPPORTED_FEATURE_TEXT);
    expect(html).toContain('mode=hier');
    expect(html).not.toContain(WORKER_FALLBACK_TEXT);
  });

  it('keeps the syntax-error location through the child process', () => {
    const cfg = resolveConfig({ timeout: 15000 });
    const html = renderDotHtml('digraph {\n  a ->\n', 'dot', cfg);
    expect(html).toContain('dot-diagram-error');
    expect(html).toMatch(/line \d+, column \d+/);
  });

  it('throws the real engine message when onError is "throw"', () => {
    const inProcess = resolveConfig({ onError: 'throw' });
    expect(() => renderDotHtml('digraph { a }', 'foo' as never, inProcess)).toThrow(
      /\[dot-core\].*Received "foo"/,
    );
    const child = resolveConfig({ onError: 'throw', timeout: 15000 });
    expect(() => renderDotHtml('digraph { a }', 'foo' as never, child)).toThrow(
      /\[dot-core\].*Received "foo"/,
    );
  });
});

describe('renderDiagram (browser render)', () => {
  it('renders valid DOT to an inline SVG fragment', async () => {
    const state = await renderDiagram('digraph { a -> b }', 'dot', false);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
    expect(state.svg).not.toContain('<?xml');
  });

  it('returns a friendly error for invalid DOT', async () => {
    const state = await renderDiagram('nope {{{', 'dot', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toBeTruthy();
  });

  it('applies currentColor when requested', async () => {
    const state = await renderDiagram('digraph { a -> b }', 'dot', true);
    expect(state.svg).toContain('currentColor');
  });

  it('accepts a mixed-case engine name', async () => {
    const state = await renderDiagram('graph { a -- b }', 'Neato', false);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
  });
});

describe('resolveConfig', () => {
  it('normalizes defaultEngine (case-insensitive)', () => {
    expect(resolveConfig({ defaultEngine: 'FDP' as never }).defaultEngine).toBe('fdp');
  });
  it('defaults defaultEngine to dot', () => {
    expect(resolveConfig({}).defaultEngine).toBe('dot');
  });
});
