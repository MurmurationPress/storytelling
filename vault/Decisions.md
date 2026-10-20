---
type: decision-log
status: active
---

# Decisions

## 2026-10-20 — Record ideas before opening tickets

**Ted's explicit direction:** create a repository, include the vault in it and use the vault to develop ideas before launching into tickets. The purpose is buying thinking time.

Consequence: initialise a notebook, not an implementation backlog. No tickets or application scaffolding are part of this step.

## 2026-10-20 — Obsidian is the present workshop

**Ted's explicit direction:** use a tool he understands and can enhance. Its long-term suitability is unresolved.

Consequence: use readable Markdown and a minimal vault setup; do not assume an Obsidian plugin must be the final product.

## 2026-10-20 — Begin source exploration with Art

**Ted's selected candidate:** Art from CONSTRAINT is a good starting point.

Consequence: inspect and storyboard that chapter before making detailed prototype requirements. PRIME/JANUS dialogue presentation can be explored separately.

## 2026-10-20 — Do not constrain the project to Ghost

**Ted's explicit direction:** an independent site is possible.

Consequence: leave platform and hosting choices open.

## Initial setup choices

**Assistant's initial choices:** working name `murmuration-storytelling`; recommend a private remote repository while working with manuscript material; keep the vault under `vault/` so future code can live alongside it.

**Ted's subsequent choice:** created the private repository [MurmurationPress/storytelling](https://github.com/MurmurationPress/storytelling) and supplied its URL for the prepared vault to be added. The vault lives under `vault/`, alongside repository-level documentation. The earlier repository name was provisional; no product name is settled.

No product name, markup syntax, technology stack, business model or delivery schedule is agreed.

## 2026-10-20 — Sequential app experience; wiki reading model dropped

**Ted's explicit clarification:** the publication is delivered in sequence in a managed app-like environment. He has stopped considering a wiki as the reading model because controlling navigation would be too difficult.

Consequence: retain modular composition as an authoring possibility, but do not treat links as permission for free traversal of the narrative. Asides can remain contextual and bounded. Details of revisiting read material remain open.

**Ted's requested next investigation:** check existing platforms before committing to building our own. An initial documentation comparison is in [[Existing Platforms]]. No platform is selected and no purchase or implementation is authorised by that comparison.

## 2026-10-20 — Authorised focused Planetary Model EPUB experiment

**Ted's explicit direction:** build and evaluate the first small EPUB 3 capability prototype, using the current authoritative Planetary Model manuscript, preserving wording and the existing image, with reader-owned page turns. Create a branch and PR; do not merge or publish a site.

This authorises implementation of the extract experiment only. The earlier thinking-space constraint continues to apply to general platform work. No publishing platform, general authoring language, hosting service or technology stack is selected by this work.

**Original experiment finding, qualified by the subsequent playback investigation in [[Planetary Model EPUB Test]]:** Thorium Desktop 3.5.1 on Linux supports the tested mixed-layout sequence and explicitly started YAML performance with native page turns. Automatic encounter-triggered playback was not established; Begin output is required. Other reader/platform support remains unverified. See [[Planetary Model EPUB Test]] for source pin, artifact and evidence.


## 2026-10-20 — Repair explicit-start playback within PR #1

**Ted's direction:** investigate the reported immediate full-reveal defect using default-reader native tests, correct playback without changing his settings, preserve authored content and reader page turns, and keep the existing PR unmerged. Automatic arrival activation remains outside this repair.

**Finding:** the original symptom has not reproduced locally; playback-v2 hardens demonstrated colour/visibility failure paths and has temporal native evidence. Ted's exact failure cause is not established. Preserve the original success report as history rather than replacing it with an unqualified correction claim. See [[Planetary Model EPUB Test]].
