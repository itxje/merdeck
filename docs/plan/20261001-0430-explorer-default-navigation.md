# 20261001-0430-explorer-default-navigation Default directory navigation and direct type controls

- **status**: implementing
- **createdAt**: 2026-10-01 04:30
- **approvedAt**: 2026-10-01 04:30 (owner explicitly requested the correction)
- **relatedTask**: 20261001-0430-explorer-default-navigation

## Context

Restoring a remembered non-All type replaces the homepage directory listing with recursive file results. The hidden dropdown also makes returning to All inconvenient.

## Proposal

Start each page with All, independently of old stored type preferences. Use the existing single-selection toggle-group component for visible All, Mermaid, MD and HTML controls below the search input. Preserve type searches and within-page selection. Verify default folders, direct click and keyboard selection, narrow widths, reload behavior and existing navigation in real browsers.

## Scope

File-filter state, file-tree controls, scoped styling, relevant unit/browser tests and task records. No backend or storage contract changes.

## Risks

Controls must fit the minimum 180px explorer width and remain usable on phones. Exactly one type stays selected, and reload must ignore existing stored preferences. Recursive search and ordinary directory navigation must keep their existing explicit semantics.
