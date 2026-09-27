# 20260918-1426-agent-engine-list-and-html-layout Restore the agent engine list and rework the HTML preview layout

- **status**: completed
- **priority**: P1
- **owner**: html-preview/20260918-1426
- **createdAt**: 2026-09-18 14:26

## Description

The AI file editor reported "The agent capability check failed." with "Engine: Not configured" and no Google
Antigravity entry, and the HTML document preview layout read poorly. Resolves the user report: "检查下这个什么
问题，另外google agy那像也没加上去，还在整个html布局优化下，太差了".

## ActiveForm

Bound the capability decoder to the known provider list, documented `MERDECK_AGY_PATH`, and reworked the HTML
preview into a centred sidebar-plus-measure layout with scrollable tables and restored list markers.

## Dependencies

- **blocked by**: (none)
- **blocks**: (none)

## Notes

- Root cause of the failed capability check: `decodeAgentCapabilities` refused more than two providers, so a
  service with codex, claude and agy configured failed validation and the panel fell back to "Not configured".
- Layout rework details and the document `<style>` limitation are recorded in
  [the plan](../plan/20260918-1426-agent-engine-list-and-html-layout.md).
