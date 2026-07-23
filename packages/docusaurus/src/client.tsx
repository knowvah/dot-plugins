/**
 * `<DotDiagram>` — the React component the remark plugin emits. Renders a DOT
 * graph (its URI-encoded `graph` prop) to SVG in the browser on mount, via
 * `@knowvah/dot-core/browser`.
 *
 * Register it in Docusaurus by swizzling `src/theme/MDXComponents`:
 *
 * ```tsx
 * import MDXComponents from '@theme-original/MDXComponents';
 * import DotDiagram from '@knowvah/docusaurus-plugin-dot/client';
 * export default { ...MDXComponents, DotDiagram };
 * ```
 */
import React, { useEffect, useState } from 'react';
import { renderDiagram, type DiagramState } from '@knowvah/dot-core/browser';

export interface DotDiagramProps {
  /** URI-encoded DOT source. */
  graph: string;
  engine?: string;
  wrapperClass?: string;
  useCurrentColor?: boolean;
}

export default function DotDiagram({
  graph,
  engine = 'dot',
  wrapperClass = 'dot-diagram',
  useCurrentColor = false,
}: DotDiagramProps): React.ReactElement {
  const [state, setState] = useState<DiagramState>({});

  useEffect(() => {
    let alive = true;
    void renderDiagram(decodeURIComponent(graph), engine, useCurrentColor).then(
      (s) => {
        if (alive) setState(s);
      },
    );
    return () => {
      alive = false;
    };
  }, [graph, engine, useCurrentColor]);

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
