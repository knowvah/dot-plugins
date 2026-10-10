// @vitest-environment jsdom
import { describe, it, expect, beforeAll, afterEach, vi } from 'vitest';
import { renderDiagram } from './browser.js';

const WEB_FONT = 'JetBrains Mono';
const DOT_WITH_WEB_FONT = `digraph { node [fontname="${WEB_FONT}"]; a -> b }`;
const SYNTAX_ERROR_MESSAGE = 'There is a syntax error in the DOT source.';
const UNEXPECTED_EOF_MESSAGE = 'The DOT source ended unexpectedly';

interface FakeFontSet {
  load: ReturnType<typeof vi.fn<(font: string) => Promise<{ status?: string }[]>>>;
}

/** Install a fake `document.fonts`, the default font set of renderSvgAsync. */
function installFontSet(load: FakeFontSet['load']): void {
  Object.defineProperty(document, 'fonts', {
    value: { load },
    configurable: true,
  });
}

beforeAll(() => {
  // jsdom defines `document`, so force the headless estimate measurer.
  process.env.GV_TEXT_MEASURER = 'estimate';
  process.env.GV_FONT_QUIET = '1';
});

afterEach(() => {
  Reflect.deleteProperty(document, 'fonts');
  vi.restoreAllMocks();
  vi.doUnmock('@knowvah/dot-engine');
  vi.resetModules();
});

describe('renderDiagram (browser, async)', () => {
  it('waits for the web fonts the graph uses before it resolves', async () => {
    let releaseFont: (faces: { status?: string }[]) => void = () => {};
    const load: FakeFontSet['load'] = vi.fn(
      () => new Promise((resolve) => (releaseFont = resolve)),
    );
    installFontSet(load);

    let settled = false;
    const pending = renderDiagram(DOT_WITH_WEB_FONT, 'dot', false).then((s) => {
      settled = true;
      return s;
    });
    await vi.waitFor(() => expect(load).toHaveBeenCalled());
    await new Promise((r) => setTimeout(r, 20));
    expect(settled).toBe(false); // layout is held back until the font loads

    releaseFont([{ status: 'loaded' }]);
    const state = await pending;
    expect(load).toHaveBeenCalledTimes(1);
    expect(load.mock.calls[0]?.[0]).toContain(WEB_FONT);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
  });

  it('still renders when a web font fails to load (fallback font)', async () => {
    installFontSet(vi.fn(() => Promise.reject(new Error('network down'))));
    const state = await renderDiagram(DOT_WITH_WEB_FONT, 'dot', false);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
  });

  it('does not expose font issues on the state', async () => {
    installFontSet(vi.fn(() => Promise.reject(new Error('network down'))));
    const state = await renderDiagram(DOT_WITH_WEB_FONT, 'dot', false);
    expect(Object.keys(state)).toEqual(['svg']);
  });

  it('strips the prolog and applies currentColor to the async SVG', async () => {
    const state = await renderDiagram('digraph { a -> b }', 'dot', true);
    expect(state.svg?.startsWith('<svg')).toBe(true);
    expect(state.svg).toContain('currentColor');
    expect(state.svg).not.toContain('stroke="black"');
  });

  it('maps a thrown ParseError to its friendly message', async () => {
    const state = await renderDiagram('nope {{{', 'dot', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toBe(SYNTAX_ERROR_MESSAGE);
  });

  it('maps an unexpected end of input to its friendly message', async () => {
    const state = await renderDiagram('digraph { a ->', 'dot', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toContain(UNEXPECTED_EOF_MESSAGE);
  });

  it('maps an unknown engine TypeError to its message, not a rejection', async () => {
    const state = await renderDiagram('digraph { a }', 'foo', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toContain('The argument "engine" is invalid');
    expect(state.error).toContain('Received "foo"');
  });

  it('normalizes the engine name before handing it to the engine', async () => {
    const state = await renderDiagram('graph { a -- b }', '  NEATO ', false);
    expect(state.error).toBeUndefined();
    expect(state.svg).toContain('<svg');
  });

  it('maps an UNSUPPORTED_FEATURE RenderError to a friendly error', async () => {
    const state = await renderDiagram(
      'graph { mode=hier; a -- b }',
      'neato',
      false,
    );
    expect(state.svg).toBeUndefined();
    expect(state.error).toBe(
      'The graph uses a Graphviz feature that dot-engine does not support yet.',
    );
  });

  it('maps a non-string source TypeError to its message', async () => {
    const state = await renderDiagram(42 as never, 'dot', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toContain('must be of type string');
  });

  it('stringifies a thrown non-Error value', async () => {
    vi.resetModules();
    vi.doMock('@knowvah/dot-engine', () => ({
      renderSvgAsync: () => Promise.reject('boom'),
      isGvError: () => false,
    }));
    const { renderDiagram: mocked } = await import('./browser.js');
    expect(await mocked('digraph { a }', 'dot', false)).toEqual({
      error: 'boom',
    });
  });

  it('maps a failed lazy import of the engine to an error, not a rejection', async () => {
    vi.resetModules();
    vi.doMock('@knowvah/dot-engine', () => {
      throw new Error('chunk failed to load');
    });
    const { renderDiagram: mocked } = await import('./browser.js');
    // vitest rewraps a throwing factory; the point is that it surfaces as
    // `{ error }` instead of a rejection.
    const state = await mocked('digraph { a }', 'dot', false);
    expect(state.svg).toBeUndefined();
    expect(state.error).toMatch(/error when mocking a module/);
  });
});
