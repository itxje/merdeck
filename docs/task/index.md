# Merdeck - Task List

> Updated: 2026-09-11

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
