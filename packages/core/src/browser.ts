/**
 * Browser-side render: a DOT string becomes SVG (or an error message), for
 * client-mode components. graphviz-ts is imported lazily so it is only fetched
 * when a diagram actually mounts. No Node built-ins — safe for the browser.
 *
 * This is the `@knowvah/dot-core/browser` entry point.
 */
import type { EngineName } from '@knowvah/dot-engine';
import { currentColorRemap, normalizeEngine, toInlineSvg } from './shared.js';

/** The rendered outcome: `svg` on success, `error` on failure. */
export interface DiagramState {
  svg?: string;
  error?: string;
}

/** Render a DOT string to inline SVG (or an error message) in the browser. */
export async function renderDiagram(
  dot: string,
  engine: string,
  useCurrentColor: boolean,
): Promise<DiagramState> {
  try {
    const { tryRenderSvg } = await import('@knowvah/dot-engine');
    const result = tryRenderSvg(dot, normalizeEngine(engine) as EngineName);
    if (result.svg != null) {
      const inline = toInlineSvg(result.svg);
      return { svg: useCurrentColor ? currentColorRemap(inline) : inline };
    }
    return {
      error: result.errors?.[0]?.friendlyMessage ?? 'Failed to render graph.',
    };
  } catch (e) {
    return { error: e instanceof Error ? e.message : String(e) };
  }
}
