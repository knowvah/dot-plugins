---
title: eleventy-plugin-dot demo
---

# @knowvah/eleventy-plugin-dot demo

Each ` ```dot ` block below is rendered to inline SVG **at build time** by
Eleventy — view source and you'll see `<svg>`, no client script.

## A directed graph

```dot
digraph {
  rankdir=LR;
  parse -> layout -> render;
}
```

## A different engine per block

```dot engine=neato
graph {
  a -- b;
  b -- c;
  c -- a;
}
```

## Opt out (kept as source)

```dot no-render
digraph { this -> stays -> as -> source }
```
