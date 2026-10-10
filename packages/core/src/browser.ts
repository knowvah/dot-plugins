/**
 * Browser-side render: a DOT string becomes SVG (or an error message), for
 * client-mode components. @knowvah/dot-engine is imported lazily so it is only fetched
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

type DotEngine = typeof import('@knowvah/dot-engine');

/** The user-facing text for anything the engine (or its import) can throw. */
function errorMessage(e: unknown, engine: DotEngine | undefined): string {
  if (engine?.isGvError(e)) return e.friendlyMessage;
  return e instanceof Error ? e.message : String(e);
}

/**
 * Render a DOT string to inline SVG (or an error message) in the browser.
 *
 * Uses the engine's async API so the web fonts the graph names are loaded
 * (from `document.fonts`) before layout measures any text; otherwise labels
 * would be sized with a fallback font. Never rejects: dot-engine 2.x throws
 * `DotEngineError`s for bad DOT and `TypeError`s for a bad call (for example an
 * unregistered engine from a fence like `engine=foo`), all mapped to `{ error }`.
 *
 * The returned SVG is not sanitized (neither is `renderSvgAsync`): embed it
 * only for trusted DOT, or apply a Content-Security-Policy.
 */
export async function renderDiagram(
  dot: string,
  engine: string,
  useCurrentColor: boolean,
): Promise<DiagramState> {
  let loaded: DotEngine | undefined;
  try {
    loaded = await import('@knowvah/dot-engine');
    const { svg } = await loaded.renderSvgAsync(
      dot,
      normalizeEngine(engine) as EngineName,
    );
    const inline = toInlineSvg(svg);
    return { svg: useCurrentColor ? currentColorRemap(inline) : inline };
  } catch (e) {
    return { error: errorMessage(e, loaded) };
  }
}
