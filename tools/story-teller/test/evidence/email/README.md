# Email callout review — 0.18.1

Automated checks on Linux, 2026-11-04. This is implementation evidence,
not author acceptance or iPad/Safari coverage. No merge or deployment.

- `npm run check` and `npm test`: pass, 359 tests.
- Converter matrix: email/Email/EMAIL/eMaIl, folded markers, LF/CRLF,
  titled/untitled, exact body (headers, emphasis, paragraphs, wikilinks,
  date/timestamp lines and nested fences), complete/partial selection,
  literal fenced examples, malformed header, repeat no-op.
- Command harness: native diff invocation, one Apply edit, Cancel, stale-source
  rejection, repeat no-op; existing selection/command regression coverage.
  Shared Apply/Undo implementation is unchanged. The full host sample's
  expected counts include the new email and its existing Undo check.
- Installed review VSIX: `STORY_TELLER_HOST_SCOPE=email
  STORY_TELLER_VSIX=/absolute/path/story-teller-0.18.1-email.vsix npm run test:host`
  passes. Native formatted annotation, Reveal and actual Light Modern/Dark Modern
  computed body/emphasis colours are in `native.json`. An initial test raced
  preview reset against Play and timed out; waiting for ready fixes the harness.
- Actual HTTP export: `node test/email-fixture.cjs /tmp/email-source /tmp/email-export`
  then `python test/email-web.py /tmp/email-export` (Python Playwright and local
  Google Chrome required). Pause, Reveal, formatted email body, supporting-note
  activation and both theme colours pass; no page errors. See `web.json`.
  The synthetic note's preview, full content and title disclose only public
  location background at the email entry; it has no onward links or images.
  No automatic spoiler filtering is claimed.

Shared grey CSS already provides #202124 on #e9ebed (light) and #f0f0f0 on
#34383c (dark), inherited by ordinary annotation body and emphasis. No CSS
or playback controls were changed.

Review artifact (excluded from Git): `tools/story-teller/story-teller-0.18.1-email.vsix`

SHA-256: `b3c5dfbfd3fd69dbd43c0ced62c4de655a6066c3001185dbe4a637c6bf524821`

Final packaging refreshed documentation only after the native test; packaged
converter bytes match the tested source.
