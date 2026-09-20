# Merdeck - Task List

> Updated: 2026-09-16

## Usage

Each task links to a detail file. Update only existing checkbox markers; append new tasks after creating their detail files. Markers: `[ ]` pending, `[-]` in progress, `[x]` completed, `[~]` closed. Priority: P0 (blocking), P1 (high), P2 (medium), P3 (low).

Claim before investigation: change the pending index marker to `[-]`, set the detail status to `in_progress` and a neutral role owner, then re-read both files. Leave dependent tasks pending and unassigned until their prerequisites complete. Record investigation and proposal in task Notes before implementation.

## Tasks

- [x] [**BOOT-001 Establish repository foundation**](BOOT-001.md) `P1`
- [x] [**STACK-001 Establish the stack and contracts**](STACK-001.md) `P1`
- [x] [**DESIGN-001 Create the interface prototype**](DESIGN-001.md) `P1`
- [~] [**FILE-001 Implement scoped file operations**](FILE-001.md) `P1`
- [x] [**API-001 Implement HTTP access and change notifications**](API-001.md) `P1`
- [x] [**UI-001 Implement the diagram editor interface**](UI-001.md) `P1`
- [x] [**TEST-001 Verify acceptance and browser behavior**](TEST-001.md) `P1`
- [x] [**REVIEW-001 Review the complete implementation**](REVIEW-001.md) `P1`
- [x] [**DOC-001 Deliver reproducible instructions and evidence**](DOC-001.md) `P1`
- [x] [**SAFETY-001 Investigate lossless saves and filesystem containment**](SAFETY-001.md) `P0`
- [x] [**SAVE-001 Complete practical file saves on a verified filesystem**](SAVE-001.md) `P1`
- [x] [**NATIVE-001 Prepare ordinary Linux filesystem verification**](NATIVE-001.md) `P1`
- [x] [**CI-001 Verify continuous integration and executable releases**](CI-001.md) `P1`
- [x] [**DOMAIN-001 Configure verified HTTPS domain access**](DOMAIN-001.md) `P1`
- [x] [**RENDER-001 Preserve ordinary Mermaid label line breaks**](RENDER-001.md) `P1`
- [x] [**LAYOUT-001 Keep file drawer contents within narrow viewports**](LAYOUT-001.md) `P2`
- [x] [**RENDER-002 Support ordinary flowchart labels, fan-out and bounded classes**](RENDER-002.md) `P1`
- [x] [**READ-001 Stabilize validated reads across file replacement**](READ-001.md) `P1`
- [x] [**BRAND-001 Rename the product to Merdeck and replace the brand mark**](BRAND-001.md) `P1`
- [x] [**PREVIEW-001 Give diagram subgraphs a visible neutral background**](PREVIEW-001.md) `P2`
- [x] [**BRAND-002 Show the brand mark on the sign-in page**](BRAND-002.md) `P2`
- [x] [**PREVIEW-002 Zoom and pan the preview with the mouse**](PREVIEW-002.md) `P2`
- [x] [**EDIT-001 Edit flowchart node labels from the preview**](EDIT-001.md) `P2`
- [x] [**LAYOUT-002 Resize and collapse the source and preview panes**](LAYOUT-002.md) `P2`
- [x] [**PREVIEW-003 Keep styled node labels readable in both colour schemes**](PREVIEW-003.md) `P1`
- [x] [**SESSION-001 Keep browser sessions across service restarts**](SESSION-001.md) `P2`
- [x] [**LAYOUT-003 Redesign the application header controls**](LAYOUT-003.md) `P2`
- [x] [**FILE-002 Manage project files from the explorer**](FILE-002.md) `P2`
- [x] [**LAYOUT-004 Select Markdown diagrams from the explorer only**](LAYOUT-004.md) `P2`
- [x] [**LAYOUT-005 Remove duplicated labels from the explorer footer and status bar**](LAYOUT-005.md) `P2`
- [x] [**AUTH-001 Open the workspace without an access token by default**](AUTH-001.md) `P2`
- [x] [**DOC-002 Correct stale integration and authentication statements**](DOC-002.md) `P3`
- [x] [**UPDATE-001 Detect deployed application updates safely**](UPDATE-001.md) `P2`
- [x] [**DOC-003 Keep hosted instance hostnames and addresses out of the repository**](DOC-003.md) `P1`
- [x] [**CI-002 Accept the root brand icon in release manifests**](CI-002.md) `P1`
- [x] [**RELEASE-001 Publish the first version-tag release**](RELEASE-001.md) `P2`
- [x] [**FILE-003 List only the chosen file types in the explorer**](FILE-003.md) `P2`
- [x] [**RELEASE-002 Publish one stable release archive**](RELEASE-002.md) `P2`
- [x] [**PREVIEW-004 Allow a text colour in class definitions**](PREVIEW-004.md) `P3`
- [x] [**LAYOUT-006 Show the running version in the status bar**](LAYOUT-006.md) `P3`
- [x] [**RELEASE-003 Publish one architecture-independent bundle**](RELEASE-003.md) `P1`
- [x] [**PREVIEW-005 Accept bounded node styling in the preview**](PREVIEW-005.md) `P3`
- [x] [**STORAGE-001 Evaluate write admission for host-shared virtiofs project storage**](STORAGE-001.md) `P2`
- [x] [**STORAGE-002 Admit host-shared storage under a content identity model**](STORAGE-002.md) `P2`
- [x] [**PREVIEW-006 Fit a Gantt chart to its bars, not to its today marker**](PREVIEW-006.md) `P3`
- [x] [**PREVIEW-007 Accept a title-only front matter**](PREVIEW-007.md) `P3`
- [x] [**LAYOUT-007 Let the explorer be resized**](LAYOUT-007.md) `P3`
- [x] [**PREVIEW-008 Stop reading a colour declaration as an entity**](PREVIEW-008.md) `P2`
- [x] [**NAV-001 Open a linked diagram from the preview**](NAV-001.md) `P2`
- [x] [**FILE-004 Skip compiled build output during discovery**](FILE-004.md) `P3`
- [x] [**CONFIG-001 Default the tree scan to a wide, shallow walk**](CONFIG-001.md) `P2`
- [x] [**LAYOUT-008 Move the file bar into the header**](LAYOUT-008.md) `P3`
- [x] [**NAV-002 Preserve linked flowchart layout and titled file navigation**](NAV-002.md) `P1`
- [x] [**PREVIEW-009 Accept bidirectional sequence messages and bounded front matter configuration**](PREVIEW-009.md) `P2`
- [x] [**PREVIEW-010 Preserve inert addresses and note text in diagram previews**](PREVIEW-010.md) `P2`
- [x] [**LAYOUT-009 Distinguish folders from files in the explorer**](LAYOUT-009.md) `P2`
- [x] [**PREVIEW-011 Refuse only the preview security boundary and admit the remaining Mermaid syntax**](PREVIEW-011.md) `P1`

- [x] [**20260913-1737-directory-navigation-design Directory navigation prototype and frontend proposal**](20260913-1737-directory-navigation-design.md) `P1`
- [x] [**20260913-1626-directory-browsing-contract Directory browsing investigation and contract**](20260913-1626-directory-browsing-contract.md) `P1`

- [x] [**20260913-1637-directory-backend Implement bounded directory browsing backend**](20260913-1637-directory-backend.md) `P1`

- [x] [**20260913-1657-streaming-directory-investigation Investigate bounded directory primitives**](20260913-1657-streaming-directory-investigation.md) `P1`
- [x] [**20260913-1802-directory-frontend Implement directory navigation and frontend acceptance**](20260913-1802-directory-frontend.md) `P1`
- [x] [**20260913-2030-explorer-order Sort the loaded explorer window**](20260913-2030-explorer-order.md) `P2`
- [x] [**20260913-2045-directory-search Search a folder and its subfolders**](20260913-2045-directory-search.md) `P1`
- [-] [**20260913-2142-markdown-document Render whole Markdown documents**](20260913-2142-markdown-document.md) `P2`
- [x] [**20260914-1105-search-file-types List chosen file types from subfolders**](20260914-1105-search-file-types.md) `P1`
- [x] [**20260914-1150-directory-poll-save-race Keep directory polls out of a save's change window**](20260914-1150-directory-poll-save-race.md) `P2`
- [x] [**20260914-1517-mobile-file-drawer Fix the mobile project-files drawer**](20260914-1517-mobile-file-drawer.md) `P1`
- [x] [**20260914-1559-source-pane-e2e-ordering Investigate source-pane end-to-end ordering instability**](20260914-1559-source-pane-e2e-ordering.md) `P2`
- [x] [**20260914-2308-release-mobile-drawer Release the mobile file drawer fix**](20260914-2308-release-mobile-drawer.md) `P1`
- [x] [**20260914-2342-fix-nested-folder-browsing Fix nested folder browsing**](20260914-2342-fix-nested-folder-browsing.md) `P1`
- [x] [**20260915-0046-release-nested-folder-browsing Release the nested folder browsing fix**](20260915-0046-release-nested-folder-browsing.md) `P1`
- [x] [**20260915-0119-investigate-mobile-project-files-listing Investigate the mobile Project files listing**](20260915-0119-investigate-mobile-project-files-listing.md) `P1`
- [x] [**20260915-0156-release-short-mobile-file-listing Release the short mobile file-listing fix**](20260915-0156-release-short-mobile-file-listing.md) `P1`
- [x] [**20260915-0230-compact-mobile-drawer-header Compact the mobile drawer header**](20260915-0230-compact-mobile-drawer-header.md) `P1`
- [x] [**20260915-0403-release-compact-mobile-drawer-header Release the compact mobile drawer header fix**](20260915-0403-release-compact-mobile-drawer-header.md) `P1`
- [x] [**20260915-0516-encoded-angle-placeholder Render encoded angle placeholders safely**](20260915-0516-encoded-angle-placeholder.md) `P1`
- [-] [**20260915-0903-release-markdown-and-p2-repairs Release Markdown documents and P2 repairs**](20260915-0903-release-markdown-and-p2-repairs.md) `P1`
- [x] [**20260915-0924-split-angle-marker Restore split encoded-angle markers safely**](20260915-0924-split-angle-marker.md) `P0`
- [x] [**20260916-0011-html-document-support Add HTML document support**](20260916-0011-html-document-support.md) `P2`
- [x] [**20260916-0018-markdown-heading-hierarchy Restore Markdown heading hierarchy**](20260916-0018-markdown-heading-hierarchy.md) `P2`
- [-] [**20260916-0023-release-markdown-heading-fix Release the Markdown heading fix**](20260916-0023-release-markdown-heading-fix.md) `P1`
- [x] [**20260916-0040-ai-editing-chat Add an AI editing chat**](20260916-0040-ai-editing-chat.md) `P1`
- [x] [**20260916-0227-table-header-borders Frame document table headers**](20260916-0227-table-header-borders.md) `P2`
- [x] [**20260916-0228-release-html-ai-editor Release HTML documents and the AI file editor**](20260916-0228-release-html-ai-editor.md) `P1`
- [x] [**20260916-0425-open-access-agents Allow agent providers with open access**](20260916-0425-open-access-agents.md) `P1`
- [x] [**20260916-0457-release-open-access-agents Release open-access agent support**](20260916-0457-release-open-access-agents.md) `P1`
- [-] [**20260916-0555-configure-deployed-agent-providers Configure deployed agent providers**](20260916-0555-configure-deployed-agent-providers.md) `P1`
- [x] [**20260916-1328-fix-html-void-elements Fix safe-HTML void element rendering**](20260916-1328-fix-html-void-elements.md) `P1`
- [x] [**20260916-1335-release-html-void-elements Release safe-HTML void element fix**](20260916-1335-release-html-void-elements.md) `P1`
- [x] [**20260916-1346-support-agy-agent-provider Add Antigravity (agy) AI agent provider**](20260916-1346-support-agy-agent-provider.md) `P1`
- [x] [**20260916-1405-release-agy-agent-provider Release Antigravity (agy) agent provider**](20260916-1405-release-agy-agent-provider.md) `P1`
- [x] [**20260916-1415-improve-html-document-rendering Improve HTML document rendering and layout**](20260916-1415-improve-html-document-rendering.md) `P1`
- [x] [**20260916-1945-remove-html-preview-restrictions Remove HTML preview restrictions and notice banner**](20260916-1945-remove-html-preview-restrictions.md) `P1`
- [x] [**20260916-2030-release-v0.14.1 Release v0.14.1**](20260916-2030-release-v0.14.1.md) `P1`
- [x] [**20260917-0148-fix-html-topbar-and-ids Hide standalone template topbar and bind HTML element IDs**](20260917-0148-fix-html-topbar-and-ids.md) `P1`
- [x] [**20260917-0150-release-v0.14.2 Release v0.14.2**](20260917-0150-release-v0.14.2.md) `P1`
- [x] [**20260918-1426-agent-engine-list-and-html-layout Restore the agent engine list and rework the HTML preview layout**](20260918-1426-agent-engine-list-and-html-layout.md) `P1`
- [x] [**20260918-1524-agent-panel-dock-and-model-switch Keep the agent panel usable after a turn and enlarge document type**](20260918-1524-agent-panel-dock-and-model-switch.md) `P1`
- [x] [**20260918-1558-release-v0.14.4 Release v0.14.4**](20260918-1558-release-v0.14.4.md) `P1`
- [x] [**20260918-1627-agent-current-file-context Attach the previewed file to agent turns**](20260918-1627-agent-current-file-context.md) `P1`
- [x] [**20260918-1701-release-v0.15.0 Release v0.15.0**](20260918-1701-release-v0.15.0.md) `P1`
- [x] [**20260918-1741-agent-stream-event-budget Count streamed text once against the turn budget**](20260918-1741-agent-stream-event-budget.md) `P1`
- [x] [**20260919-0108-release-v0.15.1 Release v0.15.1**](20260919-0108-release-v0.15.1.md) `P1`
- [x] [**20260919-0136-agent-selection-persistence-and-html-width Keep the chosen engine and model across a reload, widen the HTML reading measure**](20260919-0136-agent-selection-persistence-and-html-width.md) `P2`
- [x] [**20260919-0146-release-v0.15.2 Release v0.15.2**](20260919-0146-release-v0.15.2.md) `P1`
- [x] [**20260919-0816-markdown-contents-and-type Give the Markdown preview a contents list and larger type**](20260919-0816-markdown-contents-and-type.md) `P1`
- [x] [**20260919-0908-release-v0.16.0 Release v0.16.0**](20260919-0908-release-v0.16.0.md) `P1`
- [x] [**20260919-1727-markdown-contents-mobile-layout Collapse the Markdown contents list on narrow viewports**](20260919-1727-markdown-contents-mobile-layout.md) `P2`
- [x] [**20260919-1735-release-v0.16.1 Release v0.16.1**](20260919-1735-release-v0.16.1.md) `P1`
- [x] [**20260919-1736-ui-refresh-plan Plan a UI refresh: type, colour, interaction, mobile**](20260919-1736-ui-refresh-plan.md) `P2`
- [x] [**20260919-1759-type-ramp-monospace-paths Type ramp and monospace paths**](20260919-1759-type-ramp-monospace-paths.md) `P2`
- [x] [**20260919-1815-accent-and-warning-colour Accent and warning colour**](20260919-1815-accent-and-warning-colour.md) `P2`
- [x] [**20260919-1930-explorer-density Explorer density**](20260919-1930-explorer-density.md) `P2`
- [x] [**20260919-2015-design-record-density-figures Design record density figures**](20260919-2015-design-record-density-figures.md) `P3`
- [x] [**20260920-0014-explorer-name-wrapping Explorer name wrapping**](20260920-0014-explorer-name-wrapping.md) `P2`
- [x] [**20260920-0100-phone-layout Phone layout**](20260920-0100-phone-layout.md) `P2`
- [x] [**20260920-0530-name-wrapping-third-line Explorer name wrapping: a third line**](20260920-0530-name-wrapping-third-line.md) `P1`
- [x] [**20260920-0630-release-v0.17.0 Release v0.17.0**](20260920-0630-release-v0.17.0.md) `P1`
- [x] [**20260920-0720-refresh-followups Interface refresh follow-ups: row alignment and heading navigation**](20260920-0720-refresh-followups.md) `P1`
- [x] [**20260920-0805-release-v0.17.1 Release v0.17.1**](20260920-0805-release-v0.17.1.md) `P1`
- [x] [**20260920-1837-agent-sheet-and-approvals AI file editor: a readable phone sheet, and no approval step**](20260920-1837-agent-sheet-and-approvals.md) `P1`
