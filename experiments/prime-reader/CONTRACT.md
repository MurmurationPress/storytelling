# PRIME presentation extension v1

**Implemented here, not part of EPUB and not available in ordinary Thorium.** The host uses documented EPUB.js hooks and navigation APIs, ordinary DOM geometry and MessageChannel. No private toolkit IPC or fork is involved.

## Connection and identity

Before rendering this trusted state resource, the host's `book.spine.hooks.content` adds `<meta name="prime-presentation-v1" content="SESSION_TOKEN"/>`. The blocking `encounter-head.js` sees it before body paint and applies `prime-pending`; complete text retains geometry but is visually hidden. Normal readers do not receive the marker. Reduced motion skips the blank surface.

After the toolkit content hook has a rendered `Contents`, the host creates one MessageChannel and transfers its publication endpoint using `window.postMessage`. The component accepts a single `prime:connect` with version 1, matching token/publication/resource, a transferred port and `event.source === parent`. The target is this particular toolkit content window. The random token binds the host opt-in to that loaded resource; it is not a hostile-content security sandbox.

The component replies `ready` with:

```json
{"type":"ready","version":1,"publication":"planetary-model-encounter-v1","resource":"state.xhtml","component":"surface","instance":"per-document-random-UUID"}
```

The host replies first with an **inactive snapshot**, then reconciles actual presentation. A presentation message is:

```json
{"type":"presentation","version":1,"publication":"planetary-model-encounter-v1","resource":"state.xhtml","component":"surface","instance":"same-document-UUID","sequence":2,"active":true,"reason":"display-committed"}
```

Only the initial snapshot includes `restore: {position, done}`. A subsequent enter cannot reset progress. Unknown identities, wrong types/versions, non-increasing sequences and wrong instances are rejected before mutating playback state. A fresh document receives a fresh port and instance; detached content records are retired and their ports closed. Delayed registration gets a current inactive snapshot plus reconciliation, rather than depending on having heard an earlier page-turn event.

The component emits `progress` (same identities/sequence) with position, completion, active state, reason and diagnostic timing/counts. The host accepts progress only for that record's current sequence and saves it only for the latest primary instance. The controlled preloader cannot overwrite reading progress. No endpoint exposes native execution, filesystem access, arbitrary host commands or navigation gating.

## Actual presentation decision

The host serializes requests through toolkit `display`/`next`/`prev`. At **every navigation request** it sends inactive to current components and hides the reading viewport during the transaction. After toolkit navigation and two animation frames, the final queued transaction reveals the viewport. Intermediate rapid-turn transactions never activate a surface. Toolkit `relocated` updates the committed range; it is **necessary but not sufficient**.

Enter additionally requires all of:

- This record belongs to the primary reader, never the development preload rendition.
- No navigation is pending; the host document is foreground/visible.
- Its section index lies within the displayed location range and its `Contents` is in the primary rendition's current `getContents()`.
- The actual iframe is connected, with visible host ancestors and nonzero opacity.
- The component's bounds, transformed into host coordinates, intersect both its frame and the visible reader/browser viewport.

Resize, visibility restoration, location changes and late registration reconcile the decision. Host hiding/departure only deactivates; browser visibility never independently activates the publication. A loaded document or intersection measured only within an offscreen frame does not pass this decision. The offscreen test uses a second real EPUB.js rendition of the same packaged state, not a mocked location or hardcoded HTML copy.

This host owns one known, uncropped reading container and one `surface`. The decision is not a general browser compositor visibility oracle: unrelated overlay windows, arbitrary nested author clipping and all possible reader themes are not claimed. The optional development panel can overlap a small part of the reading area; it is not a second navigation/presentation mode. There are no controlled in-publication links that bypass the shell's turn path in this extract.

## Playback and storage

| Event / condition | Implemented policy |
| --- | --- |
| Initial inactive snapshot | Restore bounded character count/completion; reserve blank or saved prefix; no timer |
| First normal-motion enter | Start from blank; 3 characters per 65ms timeout |
| Leave during typing | Cancel timeout, retain prefix and report progress |
| Incomplete return | Resume saved prefix, without accumulating elapsed offscreen time |
| Completed return | Complete text, optional Replay |
| Reopen | Restore toolkit CFI and output from origin-local storage; start/resume only after positive presentation |
| Immediate reveal | Complete and persist immediately |
| Reduced motion | Readable static complete state with explanation; disabled Replay |
| Unsupported host | Complete readable text with explicit Begin if scripting works |
| No publication scripts | Complete readable text, hidden controls |

The complete text reserves space and remains available to accessibility APIs; the animated overlay is `aria-hidden`. Character bursts do not reflow controls. Screen-reader interaction has not been separately verified. Timing uses active timeouts, so busy browser rendering may stretch the nominal 5.135-second performance; it does not catch up while inactive.

Storage is local to this browser origin/profile and publication version. It is not synced. If localStorage is unavailable the shell continues in memory but reopening cannot be guaranteed. Clearing site data/reset reading intentionally resets both location and progress. This first version persists on progress and locator events rather than promising a crash-atomic checkpoint at every painted character.

Page turns are never conditional on completion or component acknowledgement. Arrow keys in the publication (including focused buttons) and reader buttons call toolkit navigation. Swipe detection is host integration, not new pagination. No TTS is enabled or needed.
