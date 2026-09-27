# CommonMark context for diagram discovery

Date: 2026-09-07
Status: implemented subject to the verification evidence in FILE-001

## Problem and decision

The original line scanner rejected entire Markdown documents on ordinary list,
blockquote, link/reference, HTML and indented-code lines. This prevented valid
unrelated top-level diagrams in normal project READMEs from being edited.
Maintaining block context locally would duplicate a CommonMark parser.

Use `mdast-util-from-markdown` **2.0.3**, the latest stable version returned by the
[official npm registry](https://registry.npmjs.org/mdast-util-from-markdown/latest)
on 2026-09-07. Pin this one runtime dependency exactly in the root package; keep
the sibling frontend manifest/lock unchanged. Its dependencies already existed
in the root lock through tooling, so promoting it to a direct runtime dependency
requires no transitive version changes. It is ESM, MIT-licensed and includes
TypeScript declarations. It has no native, FFI, database or rendering dependency.
The package's unpacked size in registry metadata is 97,286 bytes; this is not a
claim about the size of the complete dependency graph or production executable.

Registry integrity:
`sha512-W4mAWTvSlKvf8L6J+VN9yLSqQ9AOAAvHuoDAmPkz4dHf553m5gVj2ejadHJhoJmcmxEnOv6Pa8XJhpxE93kb8Q==`.
The package's current API is documented in its
[official README](https://github.com/syntax-tree/mdast-util-from-markdown).
`fromMarkdown(value)` returns a CommonMark root. Only direct root children whose
node type is `code` and decoded `lang` is exactly `mermaid` are candidates.
Lists and blockquotes contain descendant nodes; raw HTML, indented code and
reference definitions remain their own node kinds. No extensions or renderer
are enabled. HTML is parsed only for context, never executed or returned.

## Lossless boundary

[AST positions](https://github.com/syntax-tree/unist#point) include one-based
source lines and JavaScript character offsets. Character offsets must not be
used as byte offsets. Strip an initial BOM only from parser input, then locate
candidate opener/closer lines in a forward scan of the original buffer. That
scan preserves original BOM-inclusive UTF-8 offsets, CRLF/LF, Unicode and every
unrelated byte. Validate the exact original fence delimiters and keep the
existing byte-span replacement and complete-file version protocol. Do not use
normalized AST values for replacement or serialize the document.

Only top-level, explicitly closed Mermaid fences are editable. Nested container
fences, unclosed candidates and candidates requiring partial tab deindentation
are individually omitted; they do not make unrelated supported top-level blocks
unavailable. The block ordinal counts only selectable blocks. CommonMark—not
visual indentation alone—determines whether a fence belongs to a list or quote.
For HTML block types terminated by a blank line, the blank line remains necessary
after a closing tag before a new top-level fence can be recognized.

## Compatibility and verification

The package's included declarations compile against the pinned TypeScript 6.0.3
configuration; runtime compatibility is verified with project-local Bun 1.4.2.
Node 24.20.0 and existing dependency versions remain unchanged. Regressions cover
ordinary contexts, excluded nested/literal contexts, multi-block real saves,
BOM/CRLF/non-ASCII spans and fence-injection rejection. Frozen-install and full
quality results are recorded in [FILE-001](../task/FILE-001.md). Registry and API
inspection scratch is preserved under ignored `tmp/markdown-*`.
