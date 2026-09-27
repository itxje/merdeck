# 20260918-1426-agent-engine-list-and-html-layout Restore the agent engine list and rework the HTML preview layout

- **status**: completed
- **author**: html-preview/20260918-1426
- **created**: 2026-09-18 14:26

## Purpose

Make the AI file editor list every configured engine again, including Google Antigravity, and give HTML
document previews a deliberate reading layout instead of the window-filling standalone template shape.

## Background & Analysis

1. `web/src/features/agents/api.ts` rejected any capability response with more than two providers
   (`item.providers.length > 2`). That bound predates the `agy` adapter, so a service configured with
   `MERDECK_CODEX_PATH`, `MERDECK_CLAUDE_PATH` and `MERDECK_AGY_PATH` answered with three providers and the
   decoder threw `invalid_response`. The panel then showed "Engine: Not configured", "Model: Not available"
   and "The agent capability check failed.", and no engine could be selected at all.
2. `MERDECK_AGY_PATH` was never documented in `README.md` or `.env.example`, so the third engine was
   invisible to operators even when the decoder allowed it.
3. HTML preview layout problems, reproduced with a pandoc-generated document:
   - `.html-document-view:has(nav)` used `display: flex` over the article's direct children, so a document
     that leaves its content beside the contents list (pandoc's default: `nav` plus loose headings,
     paragraphs and tables) turned every top-level element into its own column.
   - Nothing capped the measure, so prose ran the full pane width on wide displays.
   - The contents list was styled for `nav a`, but same-document anchors render as
     `button.document-link`, so every entry kept the underlined link treatment.
   - Tailwind preflight removes list markers, so document lists rendered without bullets or numbers.
   - Tables could not scroll, table headers were centred against left-aligned bodies, inline `code` had no
     treatment, and `scroll-margin-top: 5rem` left a gap under every anchor jump inside the scrolling pane.

## Changes

1. `web/src/features/agents/api.ts`: derive the provider bound from the known provider list
   (`agentProviders`) instead of the literal `2`, and validate ids against the same list.
2. `web/src/features/agents/api.test.ts`: decode a three-provider capability response and still reject a
   duplicate fourth entry.
3. `web/src/features/document/html-document-view.tsx`: render the first top-level `nav` as the sidebar and
   keep the remaining nodes in one `.html-document-body` column, so every document has the same shape; wrap
   tables in a `.html-document-table` scroll frame that keeps the table element (and its role) intact.
4. `web/src/features/document/html-document-view.test.tsx`: assert that the contents list leads the
   article, that every other node shares the body column, and that a table keeps its role inside the frame.
5. `web/src/index.css`: replace the flex layout with a centred two-column grid (contents sidebar plus a
   `52rem` measure), restyle the contents list for anchors rendered as buttons, restore list markers for
   document content, left-align table headers, add table scroll frames, code and `pre` treatment, `hr`,
   blockquote and heading rhythm, and stack the sidebar above the content on narrow viewports.
6. `README.md` and `.env.example`: document `MERDECK_AGY_PATH` beside the other provider paths.

## Verification

- `bun run --cwd web test` for the decoder and document view suites.
- Local preview of a pandoc document, a contents-plus-loose-siblings document and a short document at
  1920, 1440 and 820 CSS pixels, in light and dark themes: no horizontal overflow, no clipped tables, the
  contents list stays sticky beside the whole document and stacks above it when narrow.
- `bun run check:ci` and `git diff --check`.

## Notes

- Document `<style>` blocks remain inert in practice: `scopeCss` rejects any stylesheet containing a control
  character, and that test includes newlines, so only single-line stylesheets survive. The preview therefore
  relies on application CSS, which this plan treats as the intended behaviour for an embedded pane;
  standalone templates size themselves to a whole window (`height: 100vh`, fixed drawers) and would fight the
  pane if their stylesheets applied. Revisiting that policy needs its own proposal, including how `url()` in
  document CSS stays offline.
