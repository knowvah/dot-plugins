/**
 * `<DotDiagram>` — a React component that renders Graphviz DOT to SVG in the
 * browser, via `@knowvah/dot-core/browser`. @knowvah/dot-engine is loaded lazily on
 * first render. Server-side rendering emits an empty wrapper; the SVG is filled
 * in on mount.
 *
 * ```tsx
 * import { DotDiagram } from '@knowvah/dot-react';
 * import '@knowvah/dot-react/style.css';
 *
 * <DotDiagram dot="digraph { a -> b }" engine="dot" useCurrentColor />
 * ```
 */
import React, { useEffect, useState } from 'react';
import { renderDiagram, type DiagramState } from '@knowvah/dot-core/browser';

export interface DotDiagramProps {
  /** Raw DOT source. */
  dot: string;
  /** Layout engine. Default `"dot"`. */
  engine?: string;
  /** Wrapper CSS class. Default `"dot-diagram"` (error panel: `<class>-error`). */
  wrapperClass?: string;
  /** Remap black strokes/text to `currentColor` (theme-aware). Default `false`. */
  useCurrentColor?: boolean;
}

export function DotDiagram({
  dot,
  engine = 'dot',
  wrapperClass = 'dot-diagram',
  useCurrentColor = false,
}: DotDiagramProps): React.ReactElement {
  const [state, setState] = useState<DiagramState>({});

  useEffect(() => {
    let alive = true;
    void renderDiagram(dot, engine, useCurrentColor).then((s) => {
      if (alive) setState(s);
    });
    return () => {
      alive = false;
    };
  }, [dot, engine, useCurrentColor]);

  if (state.error != null) {
    return (
      <div className={`${wrapperClass}-error`} role="alert">
        {state.error}
      </div>
    );
  }
  return (
    <div
      className={wrapperClass}
      dangerouslySetInnerHTML={{ __html: state.svg ?? '' }}
    />
  );
}

export default DotDiagram;
