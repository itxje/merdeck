# 20260916-1945-remove-html-preview-restrictions Remove HTML preview restrictions and notice banner

- **status**: completed
- **createdAt**: 2026-09-16 19:45
- **approvedAt**: 2026-09-16 19:45 UTC
- **relatedTask**: 20260916-1945-remove-html-preview-restrictions

## Context

The user requested: "Safe preview: scripts, styles, forms, media and external resources are not executed or loaded. 这个限制和提示去掉" and confirmed to remove the notice bar and lift restrictions on images, media, and styles. Subsequent feedback requested removing excess screen margin/padding to utilize screen space and ensuring the Google Antigravity engine appears in the engine selection.

Previously:
- HTML documents displayed a sticky notice at the top: `<p className="html-document-notice" role="status">Safe preview: scripts, styles, forms, media and external resources are not executed or loaded.</p>`.
- `html-policy.ts` turned all `img`, `picture`, `audio`, `video` elements into inert text placeholders (`Image: ...`, `Media: ...`).
- `<style>` tags were in `dropped`.
- Inline `style` and `class` attributes were ignored.
- The view constrained width via `calc((100% - 1360px) / 2)` and `max-width: 980px` on main.
- `lode.toml` missed `MERDECK_AGY_PATH`, and `agy` provider label was `Antigravity` instead of `Google Antigravity`.

## Proposal

1. **Remove Notice Banner**:
   - In `web/src/features/document/html-document-view.tsx`, remove the `notice` element completely.
   - In `web/src/index.css`, clean up `.html-document-view > .html-document-notice`.
2. **Support Images & Media**:
   - Allow `img`, `audio`, `video`, `source`, `picture` in `allowed` and `HtmlElementTag`.
   - In `html-policy.ts`:
     - Allow safe `src` attributes (http, https, data: for images, and project-relative paths).
     - Extract `alt`, `width`, `height`, `controls` safely.
     - Project them as element nodes with validated attributes instead of text placeholders.
   - In `html-document-view.tsx`:
     - Render `img` with `src`, `alt`, `loading="lazy"`.
     - Render `audio` / `video` with `controls`, `src`.
3. **Styles & Layout Utilization**:
   - Support scoped `<style>` and inline CSS properties in `html-policy.ts`.
   - Remove 1360px centered padding and 980px max-width on main in `web/src/index.css` to allow full width utilization.
4. **Google Antigravity Engine**:
   - Rename provider label to `Google Antigravity`.
   - Fix `agy models` output parsing to cleanly strip CR spinner updates.
   - Add `MERDECK_AGY_PATH` to `lode.toml`.
5. **Keep Security Boundaries**:
   - Scripts (`<script>`, `on*` event handlers, `javascript:` URLs) remain strictly refused.
   - Remote execution sinks remain blocked.
6. **Tests & Quality Gate**:
   - Update `html-policy.test.ts` and `html-document-view.test.tsx` to verify images and media render and notice is gone.
   - Update `html-document.spec.ts`.
   - Run all quality checks.
