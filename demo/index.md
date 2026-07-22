# vitepress-plugin-graphviz demo

Each ` ```dot ` block below is rendered to inline SVG **at build time** — view
source on this page and you'll see `<svg>`, not a `<script>` or a code block.

## A directed graph (default `dot` engine)

```dot
digraph {
  rankdir=LR;
  node [shape=box, style=rounded];
  parse -> layout -> render;
  parse -> "getLayout()";
  layout -> "getLayout()";
}
```

## A different engine per block

```dot {engine=neato}
graph {
  a -- b;
  b -- c;
  c -- a;
  a -- d;
}
```

## Opt a block out of rendering (keeps it as highlighted source)

```dot no-render
digraph { this -> stays -> as -> source }
```

## An intentional error renders a readable panel

```dot
digraph { a -> }
```
