// SPDX-License-Identifier: EPL-2.0
//
// Minimal TextMate grammar for the Graphviz DOT language, reused (verbatim)
// from the graphviz-ts docs (docs-site/.vitepress/dot.tmLanguage.ts). It is
// EPL-2.0 — the license of graphviz-ts — not the MIT license of this plugin;
// this single demo file retains its original license. Registered with
// VitePress/Shiki via markdown.languages so `dot` fences the plugin does not
// render (e.g. `no-render` blocks) are syntax-highlighted instead of falling
// back to plain text (Shiki bundles no `dot` grammar).

import type { LanguageRegistration } from 'shiki';

export const dotLang: LanguageRegistration = {
  name: 'dot',
  scopeName: 'source.dot',
  aliases: ['graphviz', 'gv'],
  patterns: [
    { include: '#comment' },
    { include: '#keyword' },
    { include: '#string' },
    { include: '#operator' },
    { include: '#number' },
    { include: '#attribute' },
  ],
  repository: {
    comment: {
      patterns: [
        { name: 'comment.block.dot', begin: '/\\*', end: '\\*/' },
        { name: 'comment.line.double-slash.dot', match: '//.*$' },
        { name: 'comment.line.number-sign.dot', match: '^\\s*#.*$' },
      ],
    },
    // DOT keywords are case-insensitive (graph/Graph/GRAPH all valid).
    keyword: {
      patterns: [
        {
          name: 'keyword.control.dot',
          match: '(?i)\\b(strict|graph|digraph|subgraph|node|edge)\\b',
        },
      ],
    },
    string: {
      patterns: [
        {
          name: 'string.quoted.double.dot',
          begin: '"',
          end: '"',
          patterns: [{ name: 'constant.character.escape.dot', match: '\\\\.' }],
        },
      ],
    },
    operator: {
      patterns: [
        { name: 'keyword.operator.edge.dot', match: '->|--' },
        { name: 'keyword.operator.assignment.dot', match: '=' },
      ],
    },
    number: {
      patterns: [{ name: 'constant.numeric.dot', match: '\\b-?\\d+(\\.\\d+)?\\b' }],
    },
    attribute: {
      patterns: [{ name: 'variable.other.dot', match: '\\b[A-Za-z_][A-Za-z0-9_]*\\b' }],
    },
  },
};
