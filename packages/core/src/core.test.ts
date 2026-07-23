import { describe, it, expect } from 'vitest';
import {
  parseFenceInfo,
  toInlineSvg,
  currentColorRemap,
  resolveConfig,
  renderDotHtml,
  type ResolvedConfig,
} from './index.js';
import { renderDiagram } from './browser.js';

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
});
