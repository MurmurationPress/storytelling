# Legacy chat subtext review — 2026-11-02

**0.18.0**, based on main `5aea18c` (merged #36), focused branch
`feature/chat-subtext`. The sample, original legacy wrappers, converted scene and
supporting definition are wholly synthetic. No PrimeTrilogy manuscript, actual
adaptation, image-import implementation or production reader was changed.

The converter's former rejection of nonempty third fields is replaced by optional
message-owned subtext. The bare `@subtext` marker and existing `  | text` lines keep
metadata outside dialogue and permit exact multiline content without a new quoted
value grammar. [Authoring guide](../../../CHAT-SUBTEXT.md) ·
[review project](../../../samples/chat-subtext-project/).

## Screenshots

Current chat shows a responding wait and then a **whole completed message**;
there is no new character-typing mode. Waiting captures contain neither message
body nor subtext; completion captures contain both in the same bubble.

| Reader / layout | During responding wait | Completed first message | Complete exchange |
| --- | --- | --- | --- |
| HTTP, desktop 1100px | [waiting](web-1100-waiting.png) | [message](web-1100-message.png) | [exchange](web-1100-complete.png) |
| HTTP, narrow 375px | [waiting](web-375-waiting.png) | [message](web-375-message.png) | [exchange](web-375-complete.png) |
| Installed VSIX, desktop | [waiting](native-desktop-waiting.png) | [message](native-desktop-message.png) | [exchange](native-desktop-complete.png) |
| Installed VSIX, narrow editor group | [waiting](native-narrow-waiting.png) | [message](native-narrow-message.png) | [exchange](native-narrow-complete.png) |

## Executed validation

- `npm test`: **356/356**; `npm run check`; both reader bundles; VSIX package pass.
- Focused coverage: exact reported Companion example, absent/empty/whitespace/
  nonempty fields, consecutive inherited speakers, multiline whitespace and
  Unicode, escaped pipes/braces, wikilink pipes, malformed/ambiguous wrappers,
  directive-looking content, safe literal HTML, CRLF/containing fences/beat bytes,
  source-located note references, conversion idempotence, positional completion/
  hover, document/selection diff/Apply/Cancel/stale guards and one editor edit.
- Injected-clock player checks prove identical calculated/authored steps with
  and without subtext, no new sound/typing events, pause/speed, native immediate
  message reveal, ticks, replay/restart/Previous/Next, retired callbacks, reduced
  motion and source-update cancellation.
- **Linux VS Code 1.144.0, installed 0.18.0 VSIX**, disposable profile:
  desktop/narrow waiting and completion, native Reveal, pause/speed, consecutive
  messages, unchanged outgoing alignment/read ticks, multiline note association,
  safe literal HTML, supporting panel, no overflow and navigation cancellation.
  Real conversion diff/**Apply/Undo passes**; the legacy source is restored
  exactly and disk remains unchanged. [Native report](native.json).
- **Chrome 156.0.8078.79 on Linux, actual HTTP-served isolated export**:
  desktop/narrow, no early subtext in DOM or accessibility snapshot, atomic
  message completion, pause/resume/speed, consecutive messages, read ticks,
  safe HTML, full Reveal, replay/restart/navigation/autoplay, reduced motion
  (including a preference change during the wait), restored mid-chat and beat
  state, note keyboard access/focus return and page overflow. All pass; no page
  errors or requests outside the export origin. [HTTP report](web.json).
- Text contrast is measured from composed ancestor backgrounds and text opacity.
  Subtext is 14.96px versus 17px body text. Recorded minimum contrast is 6.35:1
  in native dark preview and 8.04:1 in HTTP light theme; HTTP dark also passes
  the 4.5:1 assertion. The note follows its body inside the same list item, is
  not aria-hidden or live, and occurs once in the first-message accessibility
  snapshot. DOM/accessibility-tree inspection is not human screen-reader testing.
- Existing standalone chat-wikilink regression passes, including titles, speaker
  links, message links, supporting panels and keyboard behaviour without subtext.
  Existing parser/player/typeout/metadata/migration tests stay in the full suite.

The sole State note is first accessible in the last message's subtext. Its preview
and full text define the already displayed label; there are no later story events
or onward links. This is a point-of-access editorial check, not an automatic
spoiler filter.

## Package and scope limits

Local artifact: `tools/story-teller/story-teller-0.18.0.vsix`; synthetic source ZIP:
`/tmp/story-teller-chat-subtext-review-0.18.0.zip`. Neither is a production deployment
or Marketplace publication. SHA-256:

```text
66e7b998617536ff4288f0c6ed10b2e4f417cb13b6a37f34968875e4680c68dc
```

[Package audit](package.json) checks both bundled readers, parser, converter,
IntelliSense, stylesheet and guide against the tested tree. Samples, screenshots
and tests are excluded; there are 417 archive entries. Source review project
assets are not required by the installed extension.

The prior [component-metadata migration Undo limitation](../formatted-media/native-migration.json)
remains separately unresolved: its earlier native assertion failed in 0.17.0 and
unchanged 0.16.0, with cause unconfirmed. This task's successful native **chat**
conversion Undo does not establish that different scope has been fixed. Migration
production code is unchanged. There is no existing project-wide legacy chat
conversion command; project scene/document/selection conversion and portable
project export are covered, not a newly invented bulk workflow.

Early browser-driver iterations assumed virtual time stayed frozen while taking
screenshots; Playwright's installed clock advances with wall time until explicitly
paused. The final driver freezes it before navigation, checks clear timing margins
and retains exact clock assertions in deterministic tests. During implementation,
a reduced-motion guard was retained specifically so the expanded native Reveal
function cannot accidentally skip existing chat waits. No failing driver attempt
is counted as a passing run.

No actual Safari/iPad/iPhone, touch hardware, Windows/macOS, human screen-reader
or audible-sound session was performed. No new chat/subtext sound exists. Author
acceptance remains open. No merge, deployment or extension publication occurred.
