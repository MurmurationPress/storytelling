---
type: prototype-study
status: tested-with-limitations
date: 2026-10-20
---

# PRIME Reader Integration

**Ted's authorised next experiment:** build a small browser reading shell using an existing EPUB toolkit, with an explicit versioned connection that tells PRIME when its surface is actually presented. This is separate from PR #1, which remains unmerged. No general publishing platform or Thorium fork is authorised.

The distinction remains: **the typing component works**. The ordinary EPUB investigation in [[Planetary Model EPUB Test]] did not establish a supported automatic encounter signal in unmodified Thorium 3.5.1. This experiment supplies that missing connection in a host that we control; it does not retroactively add it to standard EPUB or Thorium.

## Implemented experiment

The [small EPUB.js shell](../experiments/prime-reader/README.md) reads a separately named `planetary-model-encounter-v1.epub`. The toolkit opens the actual package, paginates prose and turns pages. The host uses documented hooks, a current displayed range, frame/component geometry and its own committed navigation transaction to send inactive/enter/leave. The component checks publication, resource, component, document-instance and ordered-message identities.

First normal-motion encounter starts on a reserved blank surface; leaving stops progress; incomplete return resumes; completed return shows full text with optional Replay. Location and progress are stored locally for reopening. Reveal and reduced-motion static output remain available. Without the host extension, the publication remains readable and can use explicit start when scripts are supported. The original playback-v2 and research packages are untouched.

EPUB.js's inspected layout path is global, so this derivative uses bounded reflowable state/image resources in place of the original fixed-layout overrides. Wording, YAML whitespace, prose order, original SVG and narrative image position are preserved. This is an explicitly documented presentation adaptation, not a manuscript edit.

## Evidence and limits

**Verified in Linux Chromium 149.0.7827.55:** actual EPUB.js turns at 1280×800 and 820×1180; >7s controlled invisible preload with zero progress; blank first arrival and sustained prefixes; early departure/quick and later resumption; natural/completed return; exact stored-checkpoint reopening; rapid turns/stale-message rejection; reveal, reduced motion, no-script/unsupported-host fallback; image placement/bounds and focused-control turns. Full replay measured 5.340s and 5.345s. Continuous browser recordings and computed samples support these findings. These are browser/toolkit tests, not native Thorium or iPad tests.

[Browser test results and temporal recordings](../experiments/prime-reader/RESULTS.md) distinguish the real EPUB.js integration from a simulated event demo, responsive tablet checks from actual iPad testing, and the custom extension from standard EPUB features. The artificial invisible preload is a second real toolkit rendition; it is not evidence of an EPUB.js default preload policy.

The reader is local and limited to the bundled trusted publication. Scripted EPUB.js content is not an untrusted-book security sandbox. There is no catalogue, account, authoring system, hosting deployment, narration workaround or reader fork. Browser-local storage is not cross-device persistence.

**Proposed next decision:** Ted should try the natural prose → performed state → prose sequence and assess the reading experience before choosing further toolkit work. Actual iPad Safari verification would be a separate compatibility check; no general platform choice follows from a successful Linux browser experiment.
