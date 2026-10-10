// SPDX-License-Identifier: MIT
/**
 * The render worker's pure core: one request in, one `DotSvgResult` out. Kept
 * apart from `render-worker.ts` (which owns `parentPort`) so it is testable
 * without a worker thread.
 *
 * `renderDotSvg` never throws for a bad diagram: dot-engine 2.x throws a
 * `TypeError` for an unregistered engine or a non-string source, and the core
 * turns that into an error result, so the host always receives an answer.
 */
import {
  renderDotSvg,
  resolveConfig,
  type DotSvgResult,
  type ResolvedConfig,
} from '@knowvah/dot-core';
import type { EngineName } from '@knowvah/dot-engine';

/** A render request as posted by `DotRenderService`. */
export interface RenderRequest {
  dot: string;
  engine: string;
  /** Remap black strokes/text to `currentColor` (follow the editor theme). */
  useCurrentColor?: boolean;
}

// `useCurrentColor` remaps the diagram's black strokes/text to `currentColor`
// so it can follow the editor theme. It is off by default: Graphviz paints a
// white diagram background, so native black stays legible in every theme (with
// the remap on, a dark theme's near-white foreground would vanish on white).
// The caller (preview-manager) passes the setting per render; cache both
// resolved configs so we build each at most once.
const configCache = new Map<boolean, ResolvedConfig>();
function configFor(useCurrentColor: boolean): ResolvedConfig {
  let config = configCache.get(useCurrentColor);
  if (config === undefined) {
    config = resolveConfig({ useCurrentColor });
    configCache.set(useCurrentColor, config);
  }
  return config;
}

/** Render one request to inline SVG, or to the first error. */
export function handleRenderRequest(req: RenderRequest): DotSvgResult {
  return renderDotSvg(
    req.dot,
    req.engine as EngineName,
    configFor(req.useCurrentColor ?? false),
  );
}
