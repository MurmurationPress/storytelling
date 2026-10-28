# PRs #18 / #19 — accepted integration review

Ted accepts the combined scene-title and importer behaviour: “All now working as
expected. The embedded markdown files are skipped, which is acceptable.” This
accepts skipped Markdown transclusion as a limitation, not implemented transclusion.
SVG remains unsupported. No new iPad/Safari, physical touch or human audio coverage
is inferred. Historical pending-acceptance statements below are superseded here.

#18 final reviewed head: `201dba59850f3b27893f74332906e2c988ff8c72` (runtime unchanged
from `8088f75bd5c35d2d604f6ba14eb64f3c08041053`); squash main:
`307c1fa48e0d0783e7ddcb4291124b24c09cf6b5`. Exact tree equality was verified.
#19 is reconciled by merging that main into its original history without a force
push, preserving its runtime byte-for-byte from `a7b84c9f762949c7b27298b566da91474df70b2d`.
Its effective main diff contains only the reviewed importer repairs and records;
the earlier heading changes are already in main, not reapplied in the squash.

Final code review found no material defect requiring changed behaviour. The shared
manifest root sequence preserves book-child/part order; legacy manifests keep their
original traversal. Image lookup and copying remain bounded to the explicitly
selected canonical root; ambiguous references block rather than choose a candidate.
Back rescans sources, and the review footer separates actual blockers from warnings.
Source-snapshot, heading and existing-project compatibility tests remain intact.
No Boyle-specific membership exclusion or MWC change was introduced.

Validation on the final records-only head: 247 tests, syntax checks, both builds and
packaging; focused sequential Development Host and installed-VSIX import/preview,
plus a real HTTP export order/image check. Native and browser evidence below was
originally gathered at a7b84c9 and is applicable to identical runtime; fresh final
review runs are recorded in `test/evidence/import-integration.json`. Broader historical folding/focus intermittency
is not claimed fixed. Disposable profiles use VS Code's simple picker and disable
Workspace Trust only there; OS picker/trust UI remains unverified. The extension
licence remains unspecified; package warnings and dependency licences are retained.
No GitHub Actions workflows/check runs are configured: local passes are not CI.

---

# Mixed book scenes, PNG resolution and review blockers — 0.11.2

**Status:** awaiting Ted’s acceptance. This separate fix is stacked on PR #18’s
unmerged/unaccepted scene-heading head `8088f75bd5c35d2d604f6ba14eb64f3c08041053`.
Neither that PR nor its H1 behaviour is marked accepted or merged. Main was
`2f5a8b93ad07dce0742c9f50d95638e38025f17e`; unrelated/private authoring work and
Component Types are preserved. No manuscript content or private image is committed.

**Established causes:** read-only inspection of the current local PrimeTrilogy
revision `382bcf5656c340a5988df5064f26482a2d95aef3` confirms First Detection is a
scene parented to EMERGENCE itself. MWC `08ec248d6bdd1cef33cd1eab255df24430a8e9fa`,
`src/manuscript/ManuscriptOrder.ts` (`distributedEntries`/`appendChildren`), sorts
book children (parts and direct scenes) as siblings and then visits part children.
The old importer only considered direct scenes when there were no parts. The
reported PNG embed at JANUS Analysis.md:141 is a bare filename plus display alias,
inside a quote. Its valid bytes live under Media/Media Book 1. The old resolver
tried just the scene directory and the asset root directly, not nested basename
lookup. Reproduction with either book-only or vault scope yielded **0 order errors,
1 unresolved PNG, 2 unsupported-format warnings**. That PNG disabled Continue;
SVG/Markdown warnings did not. Ted’s original selected root is unknown. No ZIP was
used or compared. The corrected current-source plan with explicitly authorised
vault scope has **36 reading documents (previously 35), First Detection first,
0 order errors and 0 unresolved images**, retaining the 2 unsupported warnings.

**Fix:** optional version-1 root `sequence` references preserve mixed book-scene /
part order without a synthetic part; the outline, player assembly/navigation and
web Contents use it. Legacy projects retain their existing order. Direct scenes
have independent ordinal labels; part/child numbering and stable IDs are retained.
Unmatched, absent, ambiguous parents or unclear sibling order block with located
errors rather than silently dropping manuscript. Bare Obsidian PNG/JPEG/WebP names
require a unique candidate under the explicitly selected canonical root. Relative
and root-relative paths, aliases and dimension hints are supported; ambiguity,
escaping symlinks/traversal, missing/corrupt supported images block. SVG and Markdown
transclusion remain unsupported warnings. Review displays the authorised root and
all blocking reasons both in its content and beside Continue; Back rereads sources
and permits correction. No skip-missing-assets path was introduced. Scene-heading
code from #18 is unchanged and its regression checks remain passing.

**Automated:** syntax checks, both browser builds and **247 tests pass**, including
11 new focused regressions. Coverage includes book scenes before/between/after
parts, sibling versus child order, exact parent/order failures, shared outline/export
sequence, legacy manifests, H1/source preservation, PNG lookup/relocation/aliases,
Unicode/encoded paths, dimensions, ambiguity, corrupt/missing images, traversal and
actual escaping symlinks, blocking reasons and a corrected Back/review flow.

**Actual VS Code 1.143.1/Linux:** both the real Extension Development Host and the
normal **installed 0.11.2 VSIX** completed source picking, order selection, blocked
review, Back, explicit vault/asset-root selection, corrected enabled review,
destination selection and explicit Import confirmation. Footer reasons contain the
PNG source/line; controls stay visible; unsupported warnings alone allow Continue.
Source hashes, copied image bytes and scene headings match. Native outline and
preview checks follow the actual GUI-imported five-scene fictional book through
book scenes before/between/after two real parts. The installed exercise uses the
reported PNG only as a disposable copied asset in that fictional book: decoded
**1388 × 1461**, alias retained, narrow preview width **205 px**, zero horizontal
overflow. No private manuscript text, pixels or screenshots enter test evidence.
Development Host uses the original fictional test PNG. See
`test/evidence/import-repairs-native.json` for scoped observations.

**Native automation observations:** an early order-picker Enter was sent before
the active row was ready; another folder-picker entry was overwritten during its
initialisation. Driver guards now wait for the focused result and exact picker
state. One later GUI overlap made an observation inconclusive and is not counted
as clean evidence; final import/preview checks ran sequentially. Preview traversal
waits beyond the existing 400 ms duplicate-activation guard instead of treating an
intentionally ignored rapid click as a missing scene. No corresponding product
exception was found or lifecycle/navigation policy changed. The broader historical
folding/focus intermittency is not claimed resolved; this task runs the focused
native import/order/image checks, not an indiscriminate rerun of that broader suite.
Disposable profiles disable Workspace Trust and use VS Code’s simple picker;
OS picker and trust-dialog behaviour are not verified.

**Actual HTTP export:** a real web export of the installed GUI-imported project
renders the ordered Contents/manual sequence, one H1 per scene, the exact copied
PNG and its alias; narrow **390 px** bounds, Previous and Contents selection pass
with no page errors. A separate synthetic all-components HTTP regression checks
chat and annotation prefixes over time, audio-graph cleanup (not listening),
prose/imagery, following, supporting-note keyboard/hover/nested Back, scene-load
recovery, stale navigation, preferences, reduced-motion/touch emulation and no
remote/authored-script requests. See `test/evidence/import-repairs-web.json` and
`import-repairs-baseline.json`. Actual iPad/Safari, physical touch, VSCodium,
Windows/macOS and human audio verification are not established by these runs.

**Package:** local `story-teller-0.11.2.vsix` includes browser bundles, stylesheet,
new bounded resolver and production dependency licences. Package inspection excludes
samples, tests/evidence, vault/manuscript/adaptation files and private art. The
extension-level licence remains unspecified; vsce’s warning is retained and no
terms changed. No GitHub Actions workflows/required checks are configured in this
repository; local passes are not described as GitHub CI passes. No release,
VSIX upload, deployment or merge is performed.

**Reproduce focused checks:** from `tools/story-teller`, run `npm run check`,
`npm test` and `npm run package`. Run native GUI drivers sequentially in a graphical
Linux session: `STORY_TELLER_DEVELOPMENT=1 node test/installed-import-repairs.cjs
story-teller-0.11.2.vsix`, then `node test/installed-import-repairs.cjs
story-teller-0.11.2.vsix` (each shell command is one line). Each prints the disposable
imported project path. Run `STORY_TELLER_HOST_SCOPE=repairs
STORY_TELLER_REPAIRS_PROJECT="/printed/project/path"
STORY_TELLER_VSIX="$PWD/story-teller-0.11.2.vsix" npm run test:host` on one line to
inspect its installed outline/preview. Omit the VSIX variable for Development Host.
`npm run export:web -- "/printed/project/path" "/new/export/path"` exports it;
`python test/import-repairs-web.py /new/export/path /tmp/repair-http.json` uses
optional Python Playwright and installed Chrome to serve/test it over loopback
HTTP. Native drivers use Node’s CDP support and disposable editor profiles; no
browser/test dependency is added to the shipped extension.

**Ted’s acceptance exercise:** install 0.11.2 and reload; import EMERGENCE into a
new destination with its actual order key. Explicitly select the authorised vault
root when shared assets require it. Check First Detection before the first part,
the PNG/alias in JANUS Analysis, the footer’s reason for any remaining blocker,
then the outline/preview and a served web export. Source metadata and existing
adaptations are never rewritten. README documents exact root/path and review rules.

---

# Scene-title import headings — 0.11.1, issue #16

**Status:** awaiting Ted’s acceptance. This builds on merged PR #17
(`2f5a8b93ad07dce0742c9f50d95638e38025f17e`); its accepted book-matter work and
all other recorded acceptance remain unchanged. This feature’s PR and #16 stay
open. No new actual iPad/Safari, touch or human listening claim is made.

**Change:** only new story-scene copies receive a literal H1 using the same
resolved title as Part–Scene Outline, after metadata and before narrative content.
Matching leading H1s remain byte-identical; different headings remain below it.
The structural helper preserves frontmatter/BOM/line endings, named beats and
leading separators. The first H1 and prose share the same beat and no new viewing
time is added. Part introductions/metadata, matter, supporting notes and original
source files are excluded. Existing adaptations are not upgraded or rewritten.
Web export recognises the matching body title and retains only “Scene 1.1” in its
header; Contents retains the full title. Legacy scenes without it retain the full
header. No new manuscript setting, scene identity or order change is introduced.

**Automated:** syntax checks, both browser bundles and **236 tests pass**. Seven
focused tests cover new/matching/different H1s (including Setext and emphasis),
frontmatter/BOM/CRLF/whitespace, literal examples, punctuation/Unicode/Markdown
escaping, beat metadata/boundaries, ready-state prose with pacing on/off, source
bytes, metadata, IDs/grouping/order, exclusions and legacy export. A regression
caught a duplicate Setext H1 directly after beat metadata during implementation;
heading comparison now parses the opening content seen by the player, after that
metadata, without changing parser/beat semantics.

**Actual VS Code 1.143.1/Linux:** normal installed 0.11.1 VSIX Import command,
source/destination simple pickers, order selection, review and explicit Import
confirmation pass on a disposable synthetic fixture. Its title is
`Signal: café *λ*`; source hashes remain unchanged and the imported Markdown
supplies the literal title below intact YAML. Development Host and installed VSIX
preview checks use copies of that actual GUI import: one literal body H1, no
emphasis/link/image interpretation of the title, first prose in Beat 1 of 2,
source navigation without rewriting, narrow bounds, Next and silent Previous.
The fixture body and artwork are fictional/original existing test assets; no
private manuscript is imported or committed.

**Native observation limit:** two import-driver attempts timed out before the
folder picker appeared; no product exception was found. The final failed capture
showed VS Code’s startup chat editor held focus despite a matching cached command
result. The driver now records selection and guards visibility/actual input focus
before Enter. A separate complete import passes with the final VSIX; this does
not establish that historical native focus/folding intermittency is resolved.
Automation uses disposable profiles with Workspace Trust disabled and VS Code’s
simple picker, as the existing runner does; it does not verify normal trust UI
or the operating-system file picker.

**Actual HTTP reader:** exported the GUI-imported saved project, served it over
HTTP and inspected DOM in Chrome 156.0.8078.47/Linux. The body title is literal and
unique; the web header does not repeat it; first prose/beat count and Contents
labels are correct; Next, silent Previous and Restart work; 390px layout has no
horizontal overflow. No page errors. The existing all-components HTTP regression
also passes (legacy scene path, notes, reveal/pacing, media lifecycle, navigation,
reduced-motion and touch emulation). Emulation is not an actual-device result.

**Package:** 0.11.1 locally installable VSIX; required runtime, new heading helper,
browser bundles and dependency licences inspected. Private material, samples,
tests/evidence, vault and local exports are excluded. Existing unresolved
extension-level licence and packaging/bundling warnings remain; licence terms
and dependencies are unchanged. No release, deployment, VSIX upload or merge.
Evidence: `test/evidence/scene-heading-native.json`, `scene-heading-web.json`,
`scene-heading-baseline.json` and the synthetic narrow screenshot.

**Acceptance exercise:** install `story-teller-0.11.1.vsix`, reload, import a copied
prepared manuscript into a NEW destination; inspect a scene with no heading, a
matching H1 and a different heading. Check intact metadata, one resolved title,
original wording and outline order; preview and export over HTTP. Existing
adaptations must remain untouched. Broader OS/device/screen-reader checks remain
unverified. Source and private authoring worktrees are preserved.

---

# PR #17 acceptance and final review

Ted accepts implementation head `8198a6b7114f30944ea1b6b00e47479aa9d49085`:
“Good, simple deliverable. Happy with that.” This supersedes the pending author
acceptance below, without expanding platform, touch, audio or publication claims.
Scene-title heading issue #16 is separate and remains open.

Final review covers shared import/upgrade scaffolding, existing empty/edited
files, repeat execution, configured supporting folders, outline placement,
static-page navigation/media cancellation, ordered export/Contents/empty omission
and pre-upgrade compatibility. No material runtime defect or accepted-behaviour
change was identified. Closeout changes record acceptance and evidence only.
The implementation and test code remain identical to the accepted head.

Fresh local syntax/build, all **229 tests**, packaging, Development Host,
installed-VSIX matter/upgrade and normal installed Import wizard checks pass.
Fresh matter and all-component HTTP checks pass in Chrome/Linux, including
390px layout and temporal reveal. See `test/evidence/pr17-review.json`,
`pr17-http.json` and `pr17-baseline-http.json`. The rebuilt 0.11.0 installer
differs from the accepted installer only in its README; all runtime files and
dependency licences were checked, with private/development exclusions intact. Historical failed/inconclusive
attempts below remain historical; no retry is used to relabel them passed.
GitHub reports no checks for this PR; local passes are not GitHub CI results.
The unresolved extension-level licence and previously documented platform/test
limits remain. No new licence, release, VSIX upload, deployment or manuscript
change is authorised. Final head and merge/tree verification are reported on PR #17.

---

# Book matter and scaffolding — 0.11.0 (2026-10-24)

**Status:** implementation awaiting Ted’s acceptance. Previously accepted chat,
pace, images, authoring helpers, type-out/audio, import/navigation, notes and web
reader behaviour remain accepted to their recorded extent. This increment has
not been accepted or tested by Ted on iPad. No new human listening claim is made.

**Implemented:** shared non-overwriting scaffolding for new import and the explicit
Add Book Matter and Supporting Content command; optional stable manifest matter
entries; metadata synthesis only when no classified front matter exists; ordered
classified bodies and original source archives; configured supporting-folder
support; static shared-preview/web pages; explicit Continue/Previous with scene
autoplay and silent completed return; empty-page export omission; empty and
partless books. Existing project opening never writes an upgrade. Scene identity,
numbering/order, source wording and author edits remain intact.

**Source evidence:** read-only CONSTRAINT book note/folder at PrimeTrilogy
`5bbe44d242a2f2db56ff75ab1ef864e8b564fb20`; book note matches HEAD. MWC source
`08ec248d6bdd1cef33cd1eab255df24430a8e9fa`, installed plugin 0.20.0. No existing
publication-matter classification was found. The documented front-matter/back-matter
types are a new explicit convention following existing type/parent/order fields,
not inferred filenames or a claim about MWC-generated roles. Metadata mapping was also checked on a disposable copy of the actual book note;
the original hash remained unchanged (not a full private-book import). Only fictional source
fixtures and original existing test artwork are committed. Mapping limitations
and metadata precedence are in README and vault/Book Matter.md.

**Checks:** syntax checks, both browser bundles and **229 unit tests pass**.
Focused tests cover no-metadata import, classified content/order, media relocation,
source bytes, existing empty/edited files, partial/repeated upgrades, multi-project
selection/cancellation, guarded writes, retained sources, path/symlink protection,
outline placement, static safe Markdown, legacy export, empty-page omission and
ordered publication data. Production dependency audit reports zero vulnerabilities;
existing development-tool advisories and the unresolved extension-level licence
remain, without broad upgrades or a new licence choice.

**Actual VS Code 1.143.1/Linux:** Development Host and installed 0.11.0 VSIX checks
pass for upgrading a partial imported project; preserving edited front matter;
static content/images/notes; Show Beat in Source; Continue with scene autoplay;
silent Previous from front/back matter; unsaved-edit refresh/source focus; and
rapid source requests committing only the latest static document. Those fixtures
are generated by the real importer, not a substitute reader. A separate normal
installed editor run (no development/test extension flags) completes the actual
Import command, simple source/destination pickers, order selection, real review
webview, explicit modal confirmation and output/source-byte checks. Workspace
Trust is disabled **only in that disposable test profile**, matching the existing
Development Host runner; this does not verify normal trust UI or the OS picker.
Installed supporting-note regression also passes: pointer/focus/Enter previews,
nested/Back, dismissal, controlled active-playback pause, unsaved/file refresh,
narrow viewport, partial annotation and scene cleanup.

**Failed/inconclusive attempts retained as findings:** the first native upgrade
check blocked awaiting dismissal of its informational notification; command
completion now returns after displaying the report. Several normal-install driver
attempts stopped before product invocation in workspace-trust/Command Palette
focus handling and establish no product result. Other failures were captured
picker initialization races (a typed path overwritten by the default path, or a
blind second Enter accepting the next prompt) and an incomplete button-role
selector. The final driver waits for initialized paths and visible dialog
transitions and handles native button roles. These failures are not relabelled
passes; the successful complete import has separate evidence. A browser predicate
violated CSP and a focus assertion incorrectly assumed Tab always lands on a
button; corrected test predicates/explicit keyboard targets preserve production
CSP. HTTP testing additionally exposed a stale bottom-button cooldown following
an explicit Previous; Previous now resets that cooldown. Review fixed delayed
preparation overwriting current navigation mappings, and rebinds note watchers
when the configured supporting folder changes.

**Actual HTTP output:** a copy of the project produced by the installed import,
with an added synthetic supporting note, exports to `local-web-preview-matter/`.
Chrome 156.0.8078.47/Linux verifies fully displayed front/back matter, exact
Contents order, local image, note panel/focus restoration, sustained scene type-out
prefixes, outgoing reveal cancellation, autoplay on/off, silent completed return,
keyboard activation and 390px layout without horizontal overflow. No page errors.
The existing all-components HTTP regression also passes, including progressive
annotation/chat, sound-node cleanup, note
navigation, rapid stale-load rejection, safe resource handling and touch/reduced
motion emulation. Unit/package checks separately verify animated WebP bytes remain unchanged. Browser emulation is not actual touch/iPad/Safari verification.

Evidence: `test/evidence/matter-web.json`, `matter-baseline-web.json`,
`matter-native.json` and synthetic narrow screenshot. Tests and evidence are
excluded from the VSIX. Package inspection confirms all runtime modules/bundles,
CSS/template and dependency licences, with no manuscripts, adaptations, vault,
samples, recordings, test evidence or local exports. The installable artifact is
`tools/story-teller/story-teller-0.11.0.vsix` in this feature worktree.

**Limits:** richer source-matter classification/import of book-note body remains
manual; old projects cannot recover previously excluded notes without copying
them. Ordinary Markdown links retain inert rendering. No actual new-feature
Windows/macOS/VSCodium/iPad/Safari/touch/screen-reader verification. The broader
historically intermittent folding/focus suite was not rerun or declared fixed;
folding code is unchanged. No release, licence change, deployment or merge.

---

# PR #15 accepted-reader closeout — 2026-10-23

**Ted’s acceptance:** Ted tested the standalone reader on his actual iPad over the local network and reports, “It works well.” This is actual-device/general reading acceptance, not an inferred Safari/browser version, human audio check or exhaustive per-feature certification. It supersedes the earlier awaiting-acceptance entries below only to that extent. The original PR head reviewed was `d33dec8591fe3d9dd42a356b821ddf1e37e99bd4`.

**Established installed handoff failure:** the prose timeout reproduced. Independent inspector observation and temporary host tracing showed the host replacing its reader identity after an in-place HTML/resource-root update, receiving the replacement’s ready signal and preparing/sending its source, while `active-frame` still contained the old reader identity and only controls, without scene content. The old document had initialised SupportingReader; this was not simply a missing paragraph selector. Inspection of the exact installed VS Code 1.143.1 `out/vs/workbench/contrib/webview/browser/pre/index.html` confirms separate active/pending frames and buffering until promotion. The exact vendor timer/event interleaving was not patched or independently isolated. Production now avoids that unreliable path: a changed resource root disposes/replaces the public WebviewPanel in its existing group, waits for its own ready identity and ignores disposed callbacks. Same-root scenes still reuse the panel. No security control or resource boundary was relaxed. The driver follows the new live inspector target after an intentional replacement, with source-content assertions intact.

**Other timeout classifications:** the historical notes initial-render failure lacked a frame trace; no independent note-specific cause was recovered. It crossed the same replaced root boundary and its current installed check passes. A later notes failure was a test precondition error: the six-second fixture had completed before a pause assertion. The temporary fixture now has an explicit 30-second delay and asserts Playing immediately before opening the panel; accepted production timings and committed scenes are unchanged. Attempting export under `--extensionTestsPath` produced the exact VS Code exception `DialogService: refused to show dialog in tests`. That is an automation-mode restriction: the final export test runs normal installed VS Code without development/test-extension flags. Its own startup/picker readiness and CDP modifier/role-selector issues were corrected through captured UI state, not by changing product commands or manufacturing dialog results. Historical failures remain in the earlier records; passing reruns alone were not used to declare them fixed.

**Export correctness fix:** a repeated read of the same changing resource could overwrite its initial hash, weakening the final snapshot check. A regression first failed against the old code; conflicting repeated reads now abort the export instead of silently replacing the recorded snapshot or becoming a placeholder. This affects concurrent author edits, not normal reader delivery.

**Executed final checks:** syntax checks, all **212 tests**, both browser bundles and 0.10.1 VSIX packaging pass. Deterministic checks cover the snapshot regression, root changes before first ready, disposed callbacks, same-root reuse and existing source/asset/parser/player behaviours. Packaged-extension checks in actual VS Code 1.143.1/Linux pass for paragraph pacing/scene override, controlled active-performance supporting-note hover/focus/panels/nested Back/refresh/cleanup, and 20 committed cross-root handoffs. The new normal-installation test follows the actual command palette, simple file picker and modal Export confirmation, handles trust for its synthetic folder through the standard UI, and creates the saved three-scene publication. It does not disable Workspace Trust. The OS-native file picker is not verified.

**Actual resulting export:** the directory produced by the installed command was served over HTTP and tested in Chrome 156.0.8078.47/headless Linux: prose/chat/type-out progression, pause/reveal/mute/audio-node lifecycle, note aliases/nested navigation/dismissal, exact order, images/animation bytes, missing resources, stale scene loads, explicit scene turns, reopening and departure/back all pass. Touch/narrow/reduced-motion checks remain browser emulation; Ted’s separate actual-iPad report is not derived from them. See `test/evidence/pr15-installed-http.json` and `test/evidence/pr15-review.json`.

**No material new web treatment:** both player bundles, templates and styles are byte-identical between delivered 0.10.0 and reviewed 0.10.1. All 17 files of the normal synthetic export also match the original 0.10.0 fixture export byte-for-byte. Thus neither correction changes Ted’s accepted standalone reading behaviour. Current local export: `local-web-preview-reviewed-0.10.1/`; current installer: `story-teller-0.10.1.vsix`.

**Limits/integration:** no inference of browser version/audio/exhaustive iPad coverage; no claim that unrelated historical folding/native-input intermittency is universally cured. The exact historical notes failure cannot be retroactively attributed from its old log. Current affected checks are conclusive; older failed runs are not marked green. Broader native suites were not repeatedly run to fish for passes: the product change is confined to root-policy lifetimes and snapshot consistency, with targeted installed coverage and the complete unit/build/package suite. No GitHub checks/workflows are configured/reported; absent CI is not passing CI. Licence terms remain unchanged/unresolved. No deployment, release, manuscript/private media change or branch/worktree deletion. PR #15 has no linked closing issues. Source words, scene order, permitted paths, exact animation bytes, normal export completeness and absence of editor APIs/private paths were reviewed. Temporary tracing is absent from production code.

---

# Standalone static web-reader trial — 2026-10-23

**Acceptance and base:** Ted accepts supporting content specifically at PR #14's `e9e04b3e194ec6458da59ee07ecc5094d8acf869`. PRs #12/#14 were already merged before this task. This separate feature starts from combined main `8122a26b1d809216d5e03d37fcf860b5ae2ddcae`; no PR merge or deployment is performed here. Web export/reading awaits Ted's acceptance.

**Implementation:** one shared browser presentation module now hosts the same parser, StoryPlayer, Markdown/type-out reveal, pacing, sound, following and note UI in both environments. A thin VS Code bridge preserves editor integration; the web adapter uses static HTTP JSON, ordered Contents and per-publication browser preferences/location. Scene and beat turns stay explicit; the completed scene offers Next scene. The exporter reads saved manifest order/identities and source bodies, safely renders supporting notes, copies only referenced supported local media and includes seven bundled dependency licences. Scene frontmatter/import provenance is omitted after resolving pacing; source files are unchanged. Dirty buffers, stale source hashes, escaping resources and existing destinations are guarded. Original animated WebP bytes are preserved without synchronising frame playback.

**Executed:** `npm run check`, all **210 tests**, build and 0.10.0 VSIX packaging pass. Tests cover export selection/order, aliases, distinct targets/ambiguity, HTML/URL safety, missing resources, animated-byte/source preservation, licence inclusion, traversal/symlink escapes, stale/saved content, destination refusal, cancellation and command confirmation. `npm test` builds both browser bundles first so the export tests work in a fresh checkout. No new npm dependencies. No TypeScript/type-check script exists; check performs JavaScript syntax checks.

**Actual exported HTTP checks:** installed Chrome **156.0.8078.47**, headless Linux, desktop 1100×800 and touch/mobile/reduced-motion **emulation** at 390×780. The test serves the actual directory, without VS Code or an application backend. Observations include 0→1→2→3 chat messages over time, successive annotation prefixes, literal YAML, ticks, pause/resume/reveal, mute/audio-node stop on note opening, theme colours, initial scroll-follow and suspension, aliases/nested notes/Back, Escape/Close/outside touch dismissal, focus restoration, explicit next-scene/final-end states, stale delayed-scene rejection, local scene-load failure/recovery, preference/reopening and departure/back without automatic resume. No authored script ran and no remote request occurred. Missing note/image examples remained usable. See `test/evidence/web-reader.json` and `test/web-reader.py`. Web Audio graph events are **not human listening evidence**. Touch emulation is not an actual device/iPad/Safari test.

**Test failures investigated:** the first HTTP harness used a string polling expression requiring eval; the reader's CSP correctly rejected it. The test now supplies a function; CSP was not weakened. A partial-link assertion originally ran after the label finished; it now measures the first partial frame, then verifies sustained growth. Export package inspection found a hyphenated dependency licence name initially omitted; licence detection now requires all seven notices, covered by tests.

**Extension regressions:** the full native VS Code **1.143.1/Linux** Development Host suite passed after extracting the shared presentation, including conversion/Apply/stale-source/Undo, navigation, hide/return, imagery and type-out playback. Focused supporting-note checks passed in Development Host and the installed 0.10.0 VSIX. One earlier installed-note run timed out before its initial link assertion; adding a failure-state capture and rerunning passed, so its exact cause remains unestablished. A final installed prose scope also timed out awaiting its first paragraph after outline/Preview This Beat. Its handoff files identify the expected source and single preview, but do not establish the in-frame cause. These failed runs remain failures; no broad/focused assertions were removed and the earlier folding/focus/native-input intermittency is **not claimed resolved**. Native dialog operation of the new Export command remains a manual acceptance check; its confirmation/cancellation/dirty-buffer logic is unit-tested with host decisions, and CLI export/actual browser reading are exercised.

**Package and limits:** the VSIX contains the web bundle/templates, exporter, existing runtime resources and dependency licences; local exports, samples, vault, private material and test evidence are excluded. The static directory has no VS Code APIs or generated machine-specific paths and requires only ordinary HTTP(S) files. The extension-level licence remains unresolved and unchanged, with the existing vsce licence/bundle warnings. All testing uses synthetic content/original test assets. Existing worktrees, private adaptations/artwork/manuscripts and Component Types edits are preserved. No public hosting/release, EPUB export, backend, accounts, payments or new component. Export is a snapshot, not a live author-filesystem connection; all Supporting Content Markdown is publication data. file://, actual mobile/Safari, Windows/macOS, VSCodium, screen-reader behaviour and human audio quality are unverified.

Local guide: WEB-READER.md. Local sample export: `local-web-preview-ready/` (ignored development output). Launch from tools/story-teller with `python3 -m http.server 8765 --bind 127.0.0.1 --directory local-web-preview-ready`, then open http://127.0.0.1:8765/.

---

# Accepted integration baseline — 2026-10-23

Ted accepts PR #12's manuscript import, Part–Scene Outline, prose pacing, scroll-follow, five shortcuts and scene-opening autoplay, and PR #14's supporting-note wikilinks/aliases, previews, nested panels and refresh. Earlier pending records below are historical. This is author acceptance, separate from automated evidence, platform verification and publication readiness. Ted also demonstrated animated WebP through the existing Image insert; it does not establish synchronisation, frame Pause/Replay or another media component. JANUS uses existing notes/directives.

**Review and integration:** PR #12 was reviewed at `bf846888f0cbedc70328ff103eea12b9ea8b861e` and merged with an expected-head guard as `7cbb5b8c57d830bcbda7b0617355cef365caa99c`. Its merge tree equals the reviewed tree. PR #14 was retargeted from #12's branch to main; its effective diff remained the supporting-note feature. Main was merged into the isolated integration branch without conflicts or tree changes before the acceptance/package record update. The original accepted supporting-note head is `e9e04b3e194ec6458da59ee07ecc5094d8acf869`. No reader behaviour was redesigned for closeout.

**Checks:** PR #12's syntax/build/package and all 178 tests pass. The combined baseline's syntax checks, all 198 tests, build and local 0.9.1 VSIX packaging pass. There is no TypeScript/type-check script; `npm run check` is the repository's JavaScript syntax check. Before the final editor-targeting guard, one full combined Development Host regression passed on VS Code 1.143.1/Linux x64, including conversion diff/Apply/stale-source/Undo, navigation, folding, hide/return and type-out playback. The final full Development Host and installed-VSIX runs both failed their folding assertion; neither is reported green. No CI workflows or required checks are configured/reported; absence of a check is not a CI pass.

**Native intermittency investigated, not declared resolved:** the initial PR #12 broad run failed its folding observation. The captured native screenshot shows all beats collapsed (title lines and boundaries visible), while the DOM query returned sequential lines 1–33: an observation mismatch, not evidence of an uncollapsed beat in that run. A subsequent combined broad run passed unchanged, with the correct source active and Resume enabled on hide/return. The installed broad run then captured an actually uncollapsed source with focus in VS Code's chat area. Review found that the fold command used `activeTextEditor` without focusing it before the native editor action. The command now explicitly targets/focuses its source and rejects an intervening edit; a deterministic regression checks ordering and the stale-version guard. This is a targeted robustness correction, **not an established cure**: both final broad runs still stopped at folding. The exact remaining focus/provider/observation cause is unresolved. Earlier successful runs and Ted's acceptance remain evidence, not substitutes for the failed checks. No assertion was removed, no broad run was converted to green, and failed logs/screenshots were retained in temporary synthetic test profiles.

**Final focused checks:** the installed 0.9.1 VSIX passes paragraph sequencing and unsaved scene override checks. Supporting-note checks pass in both the Development Host and installed package: pointer hover into the preview, keyboard focus/Enter/Escape, nested notes/Back, Close/outside dismissal, main-position/pause retention, note images, unsaved/external-file refresh, missing-note creation, narrow layout, progressive-label interactivity, type-out audio-node cleanup and scene-switch cleanup. These are real editor/webview observations using synthetic content, not a mock toolkit or a human sound-quality/touch assessment.

**Additional native observations:** the final installed shortcut scope timed out at its first injected Insert Beat chord (the title prompt was not observed); this does not revoke Ted's acceptance or establish successful keyboard verification in this run. The scroll-follow scope observed initial content following into view, then stalled in an unbounded CDP input request and was explicitly terminated after more than two minutes. The harness now bounds shared CDP requests to 15 seconds and names the unresponsive method; this changes test failure reporting only. The bounded follow diagnostic identifies the unanswered method as `Input.dispatchMouseEvent` (the wheel injection), before the rereading assertions; this is a driver/input failure, not proof that the following policy failed. Neither scope is counted as passing.

**Package/privacy:** 0.9.1 contains 372 archive entries, including the shared renderer, supporting-note adapters, importer, bundled player, reader CSS/icon and dependency licences. Samples, test evidence, vault notes, manuscript/EPUB work and private adaptations/artwork are excluded. The existing extension-level licence remains unresolved; no terms were selected or changed. `vsce` retains its licence and bundle-size warnings. Package inspection also found that its default README rewriting changed literal relative-image examples to remote URLs. Packaging now uses `--no-rewrite-relative-links`; the installed README is verified byte-for-byte against the source. All checks use fictional fixtures. Authoring worktrees, the edited Component Types note and untracked private/example work are preserved. No release, upload, deployment or web renderer is part of this closeout.

**Platform limits:** native automation is Linux VS Code/CDP, not a human listening or touch/screen-reader test. Ted's accepted audible sounds remain his evidence; the new checks observe audio lifecycle only. Windows/macOS, iPad/Safari, VSCodium, VS Code Web and a standalone renderer are not verified. The baseline is suitable for a fresh, separately scoped web-renderer branch, not a claim of production publication readiness.

---

# Supporting Markdown notes trial — 2026-10-23

Ted accepts automatic scroll-follow, all five shortcuts and outline scene autoplay at `bf846888f0cbedc70328ff103eea12b9ea8b861e`. Their earlier pending statuses below are historical. Supporting-note previews are a separate trial awaiting his acceptance, stacked on PR #12 without merging it.

**Implementation:** fixed `Supporting Content/` beside the project manifest; explicit aliases, unique exact-case basenames or root-relative paths; no scene/beat insertion or automatic entity/timeline rules. Safe note Markdown and local image resolution share existing rendering/resource policies. Hover/focus is non-disruptive; the longer native dialog pauses an active performance, supports nested links/Back and returns without autoplay. Annotation link controls appear only after the label is completely revealed. Existing-note unsaved edits and file refresh update asides/diagnostics independently of the source/player reset path. Direct author preview commands refuse supporting files as performed scenes.

**Validation:** `npm run check`, all **197 tests**, build and 0.9.0 VSIX packaging pass. The full native Development Host regression passed earlier during this feature, but the final broad run did not pass: its existing folding observation failed before reaching the note checks. Do not treat the final broad suite as green. Focused supporting-note checks passed in the Development Host and with the VSIX installed in a disposable profile of **VS Code 1.143.1, Linux x64**. Actual pointer hover remained open while moving into its preview; keyboard focus/Enter opened the correct JANUS file, Escape returned focus/position, and Tab left the dismissed panel. Native checks also exercised nested links/Back (110px of note scroll restored), Close/outside dismissal, local note images, live hover refresh during playback, unsaved note edits without saving, creation of a missing note without resetting the story, and scene cleanup. A 220px desktop preview had zero article overflow with both panel controls in bounds. An intermediate `J` was a noninteractive span; the completed JANUS label became a keyboard-accessible button. Opening a note during type-out disconnected the active Web Audio nodes; no human listening claim is made. See [the native observation record](test/evidence/supporting-native.json).

**Native failures investigated:** refresh checks exposed more than one failure path. One captured preview contained Edward while the test was awaiting an updated JANUS preview: refreshing/repositioning the surface could replace it under a stationary pointer. Reload now preserves the visible surface/content, and pointer entry pins its position while story playback/scrolling continues. Delayed-load and pinned-position regressions cover this; the native check lets a new chat message arrive while the same preview stays open. A later capture retained the old JANUS content and recorded no filesystem event (nor an open note buffer). String globs only filter implicit workspace events; the host now explicitly registers a project-scoped `RelativePattern` watcher. The final run records both external change and creation events. Clean editor buffers no longer mask disk changes; only dirty buffers take precedence. No user editor preferences, OS watch limits or security controls were changed.

**Broader native-suite limitation:** other final broad runs exposed the historical hide/return focus intermittency. The handoff log showed `scene.md` selected as a tab while VS Code still reported the temporary cover as `activeTextEditor`; the test now foregrounds the isolated window and verifies source identity before invoking source commands. A subsequent broad run stopped at the existing folding check instead. A focused installed run also timed out when keyboard focus immediately followed pointer-hover testing; moving the pointer off the surface before testing keyboard focus separated the modalities, and the installed run then passed. This is a harness correction, not a claim of a product fix. These are recorded observation failures, not evidence that the underlying historical native-suite intermittency is resolved. Focused supporting-note checks independently exercise actual preview hiding, scene cleanup and note navigation.

**Review:** shared wiki tokens retain target identity while rendered labels drive prose/chat/type-out counts. Regression checks preserve existing plain chat, image alt aliases and caption association. Code, escaped examples and YAML type-outs stay literal. Aside scroll/keyboard input is isolated from story-follow suspension. Requests carry the reader instance/source revision, late results are discarded, and supporting refreshes have their own version rather than updating the player. New note files must be saved to be discovered; existing-note unsaved buffers are read through the host. No manuscript or private adaptation was exercised or committed.

Reproduce the focused check from `tools/story-teller` with `STORY_TELLER_HOST_SCOPE=notes npm run test:host`; add `STORY_TELLER_VSIX="$PWD/story-teller-0.9.0.vsix"` for the disposable installed-package run. `npm run test:host` runs the full native regression. These require a graphical Linux VS Code session.

**Limits:** notes require an opened adaptation project; outside one, aliases display with actionable unavailable-note diagnostics. Only existing supported PNG/JPEG/WebP images are loaded. No heading/block references, transclusion, external URLs, standalone web renderer, automatic spoiler control or reimport feature. The existing extension-level licence remains unresolved. Samples/test evidence/private sources are excluded from packaging.

# Keyboard conveniences and scene autoplay — 2026-10-23

Ted has tested and accepted automatic scroll-follow. Earlier pending records below are historical. The keyboard shortcuts and outline scene autoplay introduced in 0.8.3 await his acceptance.

**Implemented:** five direct, rebindable commands reuse the existing Insert/folding/source guards. Scoped defaults are Ctrl+K then Shift+B/P/S/C/E (Cmd+K then Shift+B/P/S/C/E on macOS). Part–Scene Outline opens source and reuses a single reader at its first beat under the renamed **Autoplay** toggle; the existing `storyTeller.autoplayOnTurn` preference key is retained, including a saved Off. Selection cancels outgoing work before filesystem loading and serializes editor commits so only the latest request wins. Ordinary source/preview authoring stays ready; returning to a hidden tab stays paused. Outline-origin visual playback offers **Enable sound** when a webview gesture is needed.

**Automated evidence:** syntax checks, all 178 unit tests, build and 0.8.3 packaging pass. Tests exercise direct command reuse/guards, preference retention, serial scene commits, stale media/ready signals, scene autoplay presentation gating and departure during asynchronous loading. Focused native checks in VS Code 1.143.0 on Linux pass in the Development Host and a disposable profile with Story Teller installed from the VSIX. Real key events exercised all five contributed chords, title entry, Escape, return to writing, one Undo, visible beat folding/expansion and source/preview navigation. Native outline-row selection started the first beat at scrollTop 0, revealed successive type-out prefixes, retained a single preview, resolved the new scene's image, respected Autoplay Off, and displayed only the latest of rapid selections. A native tab-navigation command returned to the reader paused. The full Development Host regression also passed on the final code.

**Investigation:** default-keybinding inspection rejected an earlier conflicting chord family. Opening that read-only defaults editor before the keyboard exercise also caused unmatched source contexts in the test; inspection now follows the exercise, and typing waits for actual picker dismissal. A coordinate-driven tab click did not activate the reader (the tab remained unselected); the return check now uses VS Code's native previous-tab command. A top-position assertion also sampled after an immediately revealed image had legitimately triggered scroll-follow; the reset check now precedes the image beat. These failed observations were investigated, not counted as passes. Changing the reused preview's resource-root policy re-created its reading document and caused a second ready/source exchange to reset the new performance. Replacement documents now have explicit identities; obsolete ready messages are ignored. Metadata-only document events no longer reset playback. An additional departure token prevents an asynchronous load from arming autoplay after the reader has hidden it.

**Audio and limits:** outline autoplay does not call AudioContext creation/resume. Enable sound supplies an in-reader gesture; the focused native test observed Web Audio connection followed by disconnection on scene selection. This establishes graph lifecycle, not audible sound or new sound-quality acceptance. Ted's earlier acceptance of the synthesised sounds remains. The full installed-suite startup/folding intermittency documented in the 0.8.1 report is historical and is not claimed resolved by this slice. Windows, macOS and VSCodium remain untested. The extension-level licence is still unresolved; `vsce` also gives its existing bundle-size warning. Package inspection includes runtime code/assets and dependency licences, without manuscripts, private adaptations, samples or test evidence. The VSIX remains local.

Reproduce the focused native workflow from `tools/story-teller` with `STORY_TELLER_HOST_SCOPE=navigation npm run test:host`; add `STORY_TELLER_VSIX="$PWD/story-teller-0.8.3.vsix"` for the disposable installed-package run. `npm run test:host` runs the full authoring/playback regression. These require a graphical Linux VS Code session.

# Automatic scroll-follow trial — 2026-10-22

**Status:** 0.8.2 adds reader-owned follow behaviour in the preview. Newly selected beats start at the top. Newly revealed prose, chat, images and formatted/literal type-out are followed only when their visible content crosses the reading viewport; a completed Next control is included. Upward reader input suspends following without stopping playback; Follow story or a manual return to the bottom resumes it. Silent Previous stays at the top, and hide/return preserves position. This awaits Ted's acceptance. The previously accepted playback and prose pacing are unchanged; acceptance of the earlier bottom Next trial has not been stated.

**Evidence:** `npm run check`, `npm test` (163 passing tests), build and 0.8.2 VSIX packaging pass. The full VS Code 1.143.0 Linux Development Host regression passed. Five deterministic scroll-policy tests cover minimal movement, coalescing, user suspension and resumption, silent Previous, hide/return, cancellation, reduced motion and the visible type-out target. Focused native checks pass in the Development Host and a disposable profile with the installed 0.8.2 VSIX. A fictional long beat revealed paced prose, chat, an image and formatted annotation. Captured positions show following at scrollTop 450/444 with newest content at 671/677 of a 699px viewport; after an upward scroll the viewport stayed at the top while playback continued and Follow story appeared. Keyboard activation caught up; a partial annotation had 27/30 visible characters with its newest glyph around y=700/670 while the hidden reserve extended below y=1100. The completed bottom Next control was brought into view. Replay and silent Previous started at scrollTop 0, manual bottom return resumed following, a 320px preview had no horizontal overflow, and reduced-motion Follow moved directly to the newest content. An installed-VSIX hide/return check exposed a 103px drift after the webview viewport changed; restoring its saved position corrected the final check (1981px before and after). Rapid navigation left no delayed scroll. The native test uses automated DOM/CDP input and viewport readings; it does not establish Ted's reading preference or an actual iPad result.

Browser-managed smooth scrolling stalled inside the nested VS Code webview during investigation, so the implementation uses cancellable small timed steps instead. The focused native test injects wheel intent into the inner webview because CDP wheel input targets its outer frame; touch and scrollbar intent are covered by deterministic policy tests, not hands-on native gestures. No manuscript syntax or source files changed. Automatic following awaits Ted's acceptance.

# End-of-beat navigation trial — 2026-10-22

Ted has accepted automatic prose pacing. The bottom Next control in this 0.8.1 build awaits his assessment. It appears in the reading flow only after a beat completes, including trailing authored silence; silent Previous also shows it. It invokes the existing Next turn and Autoplay preference. Replay, Restart, beat turns and source edits remove it until the selected beat completes. The final beat says “End of scene”; cross-scene playback is not implemented. The top navigation remains available throughout.

**Automated evidence:** `npm run check`, `npm test` (158 passing tests), build and 0.8.1 VSIX packaging pass. Deterministic player coverage verifies the completion gate, trailing pause, silent Previous, replay, navigation and edit reset. In VS Code 1.143.0 on Linux, focused native checks passed in both the Development Host and installed 0.8.1 VSIX: the bottom control followed prose, chat, image and type-out; appeared only after trailing silence; supported Enter; retained focus on completion; handled autoplay off/on, Replay, silent Previous, rapid repeat clicks, source edit reset and a 320px image view. The full Development Host regression also passed. These are automated UI observations, not Ted's acceptance.

The full installed-VSIX regression did **not** pass in two attempts. One run attached to a webview before its inner reading frame became available and timed out at initial content. The next reached the existing beat-folding check but `Collapse All Beats` did not visibly fold the source: the captured screenshot shows line 22 still visible despite valid provider ranges. This check also showed intermittency in the prior 0.8.0 work. The cause of that broader folding/host-focus failure is not established here; the new bottom control's focused installed test passed. Do not treat the full installed regression as green. The VSIX is local only; it has not been released or uploaded. `vsce` still warns about the unresolved extension-level licence and bundle size. Ted's acceptance of prose pacing does not imply acceptance of this new placement.

# Prose pacing and import usability — 2026-10-22

Ted confirms that he successfully imported and ran the Story Teller project. The corrupted screencast was a recording problem, not a Story Teller defect. This establishes use of the initial importer. Ted subsequently accepted the automatic prose pacing; the import review/outline refinements below remain awaiting his acceptance.

**Implementation:** Optional manifest `settings.prosePacing: "on"|"off"` sets a book default. Initial scene frontmatter `story_teller_prose_pacing: on|off|inherit` overrides it; absent settings retain the existing Off behaviour. Keyboard Command Palette helpers show the effective value/source and edit either scope. The scene edit is one unsaved Undo operation. Enabled playback reveals ordinary top-level paragraphs whole, one by one, with `clamp(rendered words × 60ms, 1000ms, 4000ms)` of active reading time before the next component; no trailing automatic wait. Structured Markdown blocks remain intact. An outside `@delay` replaces that paragraph's boundary interval; `@pause` adds to it. A following chat retains its own first-message delay. No generated source directives or manuscript rewriting are involved.

The import review now uses a scrollable webview panel with a fixed keyboard-reachable Back/Continue/Cancel footer, full warnings and exclusions. Continue is disabled for unresolved supported media or order errors. After an accepted Open Project Folder action, a one-shot destination-specific marker requests the Part–Scene Outline in the new window; the first part is expanded. An unrelated workspace does not consume that marker or steal focus.

**Automated evidence:** 157 unit tests pass after this increment, including ten new deterministic pacing/settings tests, two exact-destination outline-marker tests and an initial expansion test. Build and syntax checks pass. In VS Code 1.143.0 on Linux, a Development Host and disposable installed 0.8.0 VSIX each observed three successive fictional paragraphs at distinct times, an unsaved scene override changing the preview from book-On to scene-Off, and the book-setting picker updating its manifest. A separate native Development Host check observed a scrollable import review panel with fixed Back/Continue/Cancel controls; Tab reached Continue from the initial Back focus, and Cancel left no import. The full Development Host and installed-VSIX regressions passed when run separately. An earlier folding failure was a test observation error: the screenshot showed collapsed beats while the DOM query counted retained hidden line-number nodes; the query now filters visible nodes. One concurrent native run left Resume disabled after hide/return, but the isolated full runs passed; that overlapping-window observation remains a lifecycle limitation to watch, not a proven prose-pacing regression. The cross-window Open Project → automatic outline handoff is covered by one-shot/exact-destination tests and the documented VS Code `workspaceContains` activation mechanism, but has not yet been observed end-to-end through the operating-system folder picker. These are automated API/DOM observations, not Ted's acceptance or human reading judgement. The previous imported-project report remains below as historical evidence of the initial implementation.

**Limits:** The reading formula is a starting editorial heuristic and may need adjustment after Ted reviews real CONSTRAINT prose. Lists, quotations, tables and code reveal as intact blocks without their own calculated reading interval. A book setting applies only inside an opened imported project; standalone Markdown can opt in through scene frontmatter. The current VS Code extension licence remains unresolved. No publication/export behaviour is implied.

# Markdown manuscript import trial — 2026-10-22

Ted has accepted IntelliSense and State metadata conversion; their earlier awaiting-acceptance records below are historical. The ordered manuscript importer awaits Ted's acceptance.

**Source inspection:** current local CONSTRAINT revision `5bbe44d242a2f2db56ff75ab1ef864e8b564fb20`; MWC revision `08ec248d6bdd1cef33cd1eab255df24430a8e9fa`. Six structural parts, 38 ordered scenes and three unprepared drafts were identified. A read-only planning pass gives no order errors, 15 review warnings (three excluded drafts, 11 unsupported SVG embeds and one pending cover-image metadata reference), and two copyable shared PNG assets. `manuscript_order_key` is the complete source order; old `manuscript_sequence` values do not order parts. Two PNGs resolve from the vault root, while SVG visualisations are currently unsupported and receive review warnings. Original manuscript and artwork were inspected read-only.

**Implementation:** explicit order-key selection and review precede any write. Manifest version 1 is the shared outline/assembly order; book/part metadata and scene frontmatter are copied. Source and asset hashes are checked again at import, and output is staged then renamed. Import does not alter source or run converters. A temporary, uncommitted CONSTRAINT import produced six parts, 38 scenes and two relocated PNGs, then was removed.

**Automated checks:** syntax/build/package and 144 unit tests pass. Fictional tests cover numeric/structured ordering past nine, hierarchy and part introductions, malformed/duplicate metadata, media relocation and collision-safe names, literal references, cancellation, stale source/asset abort and manifest order. The full VS Code 1.143.0 Linux Extension Development Host regression and full installed-VSIX regression pass. A focused native host run displays the Part–Scene outline, opens the target scene and opens its existing beat preview. The import command invokes VS Code's native system folder chooser; the test harness cannot operate that OS dialog, so the entire picker/review/confirm flow remains a manual editor check. Mocked command tests cover the remaining prompts and cancellation, and the pure import was exercised on real CONSTRAINT in a temporary destination. The installed package contains the importer, outline icon, runtime assets and dependency licences, with no manuscript, test fixtures or private adaptation.

**Packaging:** local version 0.7.0 VSIX only; not published. `vsce` still warns that the extension has no extension-level licence, which Ted must decide. Its broad bundle-size suggestion is inherited from the existing packaging. VSCodium is untested.

**Limitations:** imported SVG embeds remain in copied source but cannot display as Story Teller image components. No automatic reimport/reconciliation, export, or EPUB import is included. The importer has not yet been accepted by Ted. Full native manual selection/review/confirmation and opening the resulting CONSTRAINT project remain to be checked by Ted or in a supervised editor session.

# Authoring milestone review — 2026-10-22

Ted has accepted formatted annotation reveal and the previously recorded Markdown preview, chat pacing, timing controls, imagery, named beats/navigation, type-out and sounds, conversion workflows and Insert helpers. The State metadata converter and keyboard IntelliSense are implemented and tested, but Ted has not explicitly accepted them. This review does not imply publication readiness.

The source-preserving converters, stale-diff guards, safe Markdown rendering, local-media boundary, component settings, timing cancellation and package inputs were reviewed. A retained preview could miss a presentation update when reopened over another tab; the host now identifies each presentation state with an epoch and retries the current visible state until the webview acknowledges it. Reopening an existing preview also reveals its original editor column after the source tab switch settles. Markdown documents now activate the extension on opening, so native folding and IntelliSense providers can register before their first use. The reader's pause and sound gates remain tied to actual presentation; a hidden preview never resumes by itself.

**Checks at this review:** 131 unit tests, syntax check, build and 0.6.1 package pass. The Development Host and installed 0.6.1 VSIX both passed the broad native regression *with its folding segment isolated*, including prose/chat/image/type-out playback, hiding and returning, audio graph cleanup, navigation, Insert and conversion diff/Apply/stale/Undo. The installed VSIX was opened in a disposable VS Code 1.142.0 Linux profile. Focused installed keyboard IntelliSense and formatted-annotation temporal DOM checks also passed. One keyboard harness timeout expected a Monaco `textarea.inputarea` even though the current editor uses `div.native-edit-context`; checking the focused editor element resolved that observation error, and the same installed package then passed keyboard completion. Package inspection found runtime JavaScript/CSS and dependency licences, with no samples, tests, manuscript passages, private adaptations or artwork.

**Native intermittency investigated:** before the preview tab activation correction, the full suite intermittently failed on Collapse All Beats in fresh profiles. In failed runs, `vscode.executeFoldingRangeProvider` returned the expected beat range (line 13 through the following boundary), folding was enabled and the source editor focused, but the beat remained visibly expanded. VS Code's own Fold All also had no visible effect in that failed state. The revised existing-preview reveal targets its original editor column after the source tab switch settles, and the host/webview presentation exchange now acknowledges the current state. **Four subsequent full native runs passed**: two Development Host and two installed-VSIX runs, each in a new profile. A preview-tab activation race is the likely explanation, but it was not isolated in an A/B experiment. The earlier failures remain recorded here; recurrence should be investigated rather than rerun away. The `no-fold` diagnostic scope established the other flows independently during investigation, not folding itself.

`vsce` continues to warn that no extension-level licence is present; Ted must choose any licence terms. VS Code recommends further dependency bundling, though the required runtime files are present. VSCodium, iPad/Safari and other platforms remain untested. The 0.6.1 VSIX is local only.

# Formatted annotation reveal — 2026-10-22

**Status:** Ted has accepted formatted annotation reveal, alongside the previously accepted chat, imagery, type-out sound, navigation, autoplay and settings behaviour. This changes `@format annotation` presentation only; `@format yaml` remains literal. State conversion and IntelliSense are implemented/tested but still await Ted's explicit acceptance. No manuscript or private adaptation was edited.

**Behaviour:** annotations are parsed once with the existing HTML-disabled Markdown engine. Stable paragraph, emphasis, list, quote and code structure stays in the DOM while only rendered text graphemes become visible; unrevealed list items and blocks hide their markers/borders. Full formatted content is available to assistive technology without per-character announcements. Wiki links in prose and annotations show their display label or target as inert text; escaped and code examples, and unsupported `![[...]]` embeds, remain literal. Annotation images display a local omission placeholder rather than loading media. The original literal YAML path is unchanged.

**Automated checks:** `npm run check`, `npm run build`, and **131 unit tests** pass. Focused tests cover Unicode graphemes, nested emphasis, lists, paragraph boundaries, code, escaped and inert wiki links, unsupported embeds/images, unsafe HTML/remote links, timed intermediate prefixes, pause/resume, immediate reveal, reduced motion, silent Previous and literal YAML. The broad VS Code 1.142.0 Linux Extension Development Host regression passed with the updated fictional sample. Focused native temporal DOM checks passed in both the Development Host and the installed `story-teller-0.6.0.vsix` in disposable profiles. They observed blank arrival, prefixes `A` then `A🛰️ ` (Development Host) / `A🛰️ B` (installed) at distinct times, and fully formatted paragraphs/list/quote after reveal. Computed visibility kept the next list item and unrevealed suffix hidden; the formatted DOM contained strong/em/list/quote/code elements throughout. Pause held the prefix, resume advanced it, Reveal Immediately completed it, Replay reset it, Previous returned to it complete and silent, and the following YAML displayed `**literal** [[target|label]]` verbatim. At a 320 px document width, the 280 px beat area had zero horizontal overflow. The native samples are in temporary isolated test directories, not committed or uploaded.

**Native test investigation:** the first focused harness attempt timed out waiting for Beat 2 after using Preview This Beat as its setup, without an extension exception in the host log. The harness now uses the established Restart setup and passes; that timeout alone does not establish a product defect. Another initial assertion expected full YAML after waiting for only its first substring; it observed the correctly partial `**literal` prefix. Waiting for the completed phase corrected the assertion. Neither failure was suppressed by retrying an unchanged test.

**Package:** the 360-file, 1.16 MB VSIX includes the annotation renderer and required production dependency licences, and excludes tests, samples, private adaptations and manuscript artwork. `vsce` still warns that the extension has no extension-level licence and suggests bundling additional dependency files. The VSIX remains local.

**Limits:** Annotation images intentionally show omission text, and wiki links do not navigate. Structural paragraph/list boundaries add no timed step; line breaks inside code text do. Native evidence is automated observation of VS Code's actual webview DOM, not Ted's editorial acceptance or human sound assessment. VSCodium, other desktop platforms, iPad/Safari and EPUB export are untested.

# Keyboard-first IntelliSense — 2026-10-22

**Acceptance:** Ted requested this keyboard-first help; it awaits his assessment. Accepted playback, authoring, page-turn autoplay and type-out settings are unchanged. The State converter remains a separate trial.

**Implementation:** Native Markdown completion triggers on `@` in structurally valid directive positions and supports Ctrl+Space. Chat headers, positional chat controls, type-out headers and outside component timing get only their parser-supported names. Enumerated values, partial values and Tab-compatible numeric snippets reuse the existing settings choices and type-out speed bounds. Hover gives scope/default/timing help. No suggestions or hover appear in frontmatter, quotes, unrelated fences, inline code, prose sentences or type-out bodies. The extension leaves the user's editor settings and other Markdown providers alone.

**Validation:** `npm run check`, `npm run build` and **126 tests** pass. Pure tests cover contexts, duplicate singleton suppression, value/name replacement ranges, snippets, CRLF, literal protection and hover; provider tests cover native ranges, cancellation and safe documentation. The broader VS Code 1.142.0 Linux Extension Development Host regression passed, exercising accepted preview, playback, conversion and authoring paths alongside the new provider. In focused native checks, CDP keyboard events typed `@`, observed the native suggestion widget, invoked Ctrl+Space, accepted `@speed` with Enter, selected its `30` placeholder, typed `24`, used Tab and observed two predictable Undo steps (typed value, then completion). Native keyboard checks also accepted partial `@sound mo`, `@border gr` and `@fill ye` values; chat `@pace` suggestions and registered hover appeared. Fresh isolated-host keyboard checks showed outside `@delay` and `@pause` suggestions, with other Markdown provider items still present. The profile reported trigger-character suggestions enabled; no workspace opt-in was needed there. These are automated UI observations, not Ted's acceptance.

**Installed package:** `story-teller-0.5.0.vsix` passed the same focused native keyboard exercise in a disposable VS Code 1.142.0 Linux profile. One later run timed out waiting for the initial `@` suggestion in a fresh disposable profile; a repeat with the same VSIX passed and the activation log showed no extension exception. That intermittent native observation is not treated as a product fix. A separate installed-package State-conversion diff/Apply/preview/Undo smoke passed, guarding the previous slice. The VSIX contains 359 files (1.16 MB), including runtime code, CSS and production dependency licences; archive inspection found no samples, tests, private adaptations, manuscript passages or artwork. `vsce` still warns about the missing extension-level licence and suggests further dependency bundling. The package was kept local and was not uploaded to the PR.

**Limits:** IntelliSense only covers existing Story Teller directives in Markdown; it does not validate arbitrary prose or repair malformed components. User profiles with trigger-character suggestions disabled may need Ctrl+Space. VSCodium and other platforms are untested. The extension-level licence remains unresolved.

# State metadata conversion — 2026-10-22

**Acceptance:** Ted accepts the prior page-turn autoplay, type-out border/fill and component settings helper. The historical pending-acceptance reports below remain as records of their initial state. This new State converter awaits Ted's assessment on a copied scene.

**Source and behaviour:** Read-only inspection of CONSTRAINT at `341923a917a84be5cfbcbf4601ba7d572e0235d6` found top-level `[!State]` callouts with bold Date/Location and similar labels, inline-code `=this.field` values and initial YAML frontmatter. A read-only, in-memory audit at that revision proposed 121 State conversions with zero warnings; it did not edit or commit source passages. The new current-document command uses the existing diff/explicit Apply workflow. A pinned safe YAML parser reads direct top-level scalar data only. It preserves ISO date-only values, `0`, `false`, original frontmatter and beat boundaries, and escapes output as literal Markdown. Malformed YAML stops conversion; any unresolved/unsupported value leaves its whole State callout unchanged with a source-located warning. No Dataview expression is executed. The fictional fixture and README define the supported subset; no private adaptation is included.

**Validation:** `npm run check`, `npm run build` and all **118 deterministic tests** pass. Focused tests cover case/fold headers, labels, scalar values, date-only strings, malformed/tagged YAML, missing/null/complex values, unsupported expressions, literal/fenced examples, CRLF, empty frontmatter, preserved beat boundaries and idempotence. An initial full VS Code 1.142.0 Linux Extension Development Host regression passed in an isolated profile. It exercised State diff, Cancel, warnings action, stale Apply/Regenerate, one Undo and converted preview output alongside prior playback, conversion and authoring checks. A separate focused State-conversion run passed in both the Development Host and installed VSIX. Subsequent full-suite reruns intermittently failed to observe VS Code folding or notification-panel state in disposable profiles; those checks are not claimed to have passed on every rerun. These are automated editor observations, not Ted's editorial acceptance.

**Package and limits:** `story-teller-0.4.0.vsix` contains 357 files (1.15 MB), including the runtime YAML parser and its licence. Archive inspection found no samples, tests, manuscript passages, private adaptations or artwork. A focused native run with that VSIX installed in a disposable VS Code 1.142.0 Linux profile exercised the State command's diff, explicit Apply, rendered preview and single Undo. The full installed-profile harness did not complete: its earlier folding and notification-panel observations were intermittent; the full Development Host run and the focused installed State test are reported separately. Packaging warns about the still-missing extension-level licence and recommends bundling/excluding more dependency files; those warnings do not prevent installation. The converter does not resolve nested paths, collections, cross-file references, arbitrary Dataview or ambiguously structured State callouts. It does not alter live preview expression handling. VSCodium and other platforms remain untested.

# Type-out panel settings and helper coverage — 2026-10-22

**Acceptance status:** Border/fill choices and the context-aware settings editor await Ted’s assessment. Page-turn autoplay also remains unaccepted. Earlier acceptance of chat, imagery, type-out playback/audio, conversions and Insert helpers is preserved; this increment did not retune their timing or sound.

Optional `@border none|grey` and `@fill none|grey|yellow` are parsed only in a type-out header. With both omitted, the existing YAML/annotation styling classes and declarations are unchanged. Explicit none removes the border or clears both the surface and preformatted background. Fixed CSS classes supply light/dark fills; high-contrast themes use the editor’s foreground/background pair. Format, sound, speed and literal body stay independent. The Insert menu now offers **Component settings…** for the enclosing chat or type-out fence. It edits or removes supported header declarations, including `@speed` at the parser’s 1–120 grapheme/second bounds, in one Undo operation. Existing Pace, Ticks and Responding shortcuts remain; per-message Responding is distinct from the header-wide setting. The README records setting-to-helper coverage.

**Checks:** `npm run check`, `npm run build`, `npm test`: **109 tests pass**. New deterministic tests cover default compatibility, explicit none, body/header separation, source-located invalid/duplicate diagnostics, format/sound/speed/border/fill edits, chat setting edits, optional removal, CRLF/literal preservation and unchanged player timing/sound. The native VS Code 1.142.0 Linux Extension Development Host suite passed, as did the same suite with **story-teller-0.3.0.vsix installed in a disposable profile**. Native automation exercised the speed picker, cancellation, stale-document refusal and one-step Undo, plus accepted preview, conversion, insertion and autoplay regressions. Computed style inspection in actual Light Modern, Dark Modern, Default High Contrast and Default High Contrast Light themes found a transparent surface and preformatted background for `@fill none`, no border for `@border none`, and distinct text/fill colours for grey and yellow. The high-contrast fills resolve to each theme’s editor foreground/background. These are automated rendering and API observations, not Ted’s visual approval or a fresh human sound check.

**Package and limits:** The 0.3.0 VSIX includes runtime code/CSS and production dependency licences; samples, tests, private adaptations and manuscript assets are excluded. `vsce` still warns about the absent extension-level licence. The current helper edits only chat-wide configuration, not individual message timing as a form; existing Delay/Pause/Responding snippets still cover that syntax. It refuses a malformed component rather than repairing ambiguous declarations. VSCodium and other platforms remain unverified.

# Page-turn autoplay trial — 2026-10-22

**Acceptance status:** This navigation change awaits Ted’s review. His earlier acceptance of the authoring, component, conversion and synthesised-sound experience remains in force. The reader-facing toggle defaults on and is stored in VS Code global state, outside the manuscript. A manual Next turn starts its destination beat when enabled; when disabled it leaves that beat ready. Opening a scene, Preview This Beat and Restart leave the selected beat ready. Previous shows the preceding beat fully revealed and silent, including images, chat statuses and type-out text. Replay Beat resets and plays the current beat. Completion never turns a page.

**Implementation and checks:** The shared player owns Next/Previous/Replay/Restart policy and cancels outgoing timers before switching. The webview stops the outgoing sound before navigation and unlocks Web Audio during the Next gesture when the destination needs it. Existing hide/return, source-edit reset, mute and reduced-motion rules remain. Three new deterministic tests cover all four departure states, the toggle, immediate silent Previous without elapsed time, replay and stale callback rejection. `npm run check`, `npm run build` and all **104 tests** pass. The full native Extension Development Host suite also passed, followed by the same suite with **story-teller-0.2.0.vsix installed in a disposable VS Code 1.142.0 Linux profile**. The installed run exercised the accepted preview/conversion/insertion regressions as well as autoplay; its local trace captured a type-out prefix growing from `st` to `sta` over 510 ms, a complete silent Previous state, and two Web Audio node disconnections after leaving the active type-out. The test also checked preference persistence after preview reopening, off-mode Next, Replay, Restart and native hide/return. These are automated UI and audio-graph observations, **not a new human listening test**.

**Package and limits:** The 0.2.0 VSIX contains 122 files, including runtime code/CSS and production dependency licences. It excludes samples, test evidence, private adaptations, manuscript artwork and the VSIX itself. `vsce` still warns that the extension has no project-level licence; this task did not invent one. VSCodium, remote workspaces and actual tablet/iPad use remain unverified. Ted should judge the new navigation feel in the installed extension; the earlier accepted sound quality is not being reasserted from automation.

# Local installable milestone — 2026-10-21

**Acceptance:** Ted accepts the Markdown/live-preview workflow; prose/chat sequencing, automatic message timing and chat pace; delay/pause/responding/ticks; static imagery, captions and insertion; named beats, folding and source/preview navigation; type-out presentation and audible modem/keyboard/typewriter sounds; both conversion commands and existing Insert helpers. Synthesised audio is sufficient. This is acceptance of the authoring experience, not a claim of publication/export readiness or universal editor support. The dated reports below retain the evidence and earlier pending-acceptance status as history.

**Review and changes:** Audited source targeting, conversion diff staleness/Undo, structural Markdown, player/audio timers, webview presentation/edit cancellation, media path bounds, and helper/parser syntax. Existing deterministic and native regressions cover those failure paths; no material product-behaviour defect was reproduced in this review, so playback semantics were left intact. Packaging was missing: added a pinned VSIX tool, prepublish build, repository metadata, 0.1.0 local milestone version and a runtime-focused .vscodeignore. The native suite can now use an installed VSIX in a disposable profile through a separate temporary test adapter; the tested Story Teller code comes from the package, not an extension-development path. Two test-harness races were corrected: waiting for the intended source editor to become active before conversion/folding, and waiting for a newly opened preview to receive its source before asserting persisted mute. README was consolidated without changing source/manuscript content.

**Automated evidence:** npm ci, build, check and all 101 deterministic tests pass; the native Extension Development Host regression passes on VS Code 1.142.0, Linux x64. The same suite passes with story-teller-0.1.0.vsix installed in a disposable profile. It exercises prose/chat/image/type-out preview, timing and cancellation, control-focused navigation, folding and source navigation, conversion diff/review/cancel/stale Apply/single Undo, snippet insertion/tab stops and asset loading. The final package is 947,291 bytes with 122 entries. Inspection confirms runtime JavaScript/CSS and markdown-it with seven dependency licence files; no samples, test evidence, manuscript/adaptation files or unrelated art entered the VSIX. The package reports one warning: this repository does not provide an extension-level licence file. No licence terms were invented by this task. npm audit reports zero vulnerabilities at the pinned install used here.

**Observed versus accepted:** Native automation observes temporal visual playback and Web Audio graph state, not sound quality. Ted previously heard and accepted the three synthesised sounds in his normal Development Host. This review did not perform a fresh human listening test. The installed-VSIX regression is an actual VS Code desktop run; it is not VSCodium, iPad/Safari or remote-workspace verification.

**Remaining limits:** The syntax and conversion recognition remain passage-grounded and provisional. Beat selection after wholesale edits is best effort; recreated hidden webviews return ready. The preview is local, not EPUB export. VS Code versions other than 1.142.0 and VSCodium were not tested in this milestone. Private adaptation files and original manuscript assets were excluded from commits and package.

# Callout-to-type-out conversion — 2026-10-21

**Acceptance:** Ted has now verified type-out playback and audible modem, keyboard and typewriter sounds. That supersedes the earlier pending-audio status below; richer texture is only a possible later refinement. The new callout conversion awaits his assessment.

Read-only inspection used local CONSTRAINT manuscript revision `341923a917a84be5cfbcbf4601ba7d572e0235d6`. Representative `[!prime-log]` and `[!divergent]` wrappers contain timestamp/prose around one YAML fence; `[!annotation]` wrappers contain authored note text. The converter keeps that surrounding text and order, removes one quote level, reuses or inserts beat boundaries, retains compatible existing beat titles, and gives the type-out fence format/sound headers. It leaves chat, State, existing type-out, literal examples and ambiguous forms unchanged. A read-only in-memory audit across 16 chapters with these labels proposed **90 conversions and five warnings**. It made no manuscript edits; the five warnings were machine logs without one convertible YAML fence. Existing parser diagnostics in those chapters did not increase after the proposed conversion. This audit is evidence about the inspected revision, not a promise that every future source form is supported.

**Automated validation:** Build and syntax checks pass; **101 deterministic tests pass**, including seven focused callout cases for source order/indentation, CRLF, long fences, frontmatter, titles/conflicts, existing boundaries, nested/malformed/ambiguous wrappers, component protection and idempotence. Existing chat conversion, playback, audio, imagery and beat tests remain green. The real Linux VS Code 1.142.0 Extension Development Host run exercises the fictional document's diff/count/warnings, Cancel, stale Apply/Regenerate, explicit Apply, unsaved buffer/single Undo and converted YAML/annotation playback in the preview. Those are automated API/DOM observations, not Ted's editorial acceptance or a new human audio check. See [the fictional sample](samples/callout-conversion.md), the converter tests and the host runner for reproduction.

Limitations: prose-only machine logs and unsupported/mixed fences require review; an annotation is performed as literal text, so Markdown markup inside it is visible as text. Titles unsafe for the current HTML-comment syntax are flagged rather than changed. The command does not change original manuscript sources, infer timing, import a book or export EPUB. No push, release or merge.

---

# Type-out sound correction — 2026-10-21

Ted reported the same “Sound unavailable” warning in his normal Extension Development Host. A diagnostic run in the real Linux VS Code 1.142.0 webview captured **`voice: TypeError: Illegal invocation; context running`**. `AudioContext` was present, creation succeeded and `resume()` reached `running`; this was not an absent API, suspended context or CSP refusal. The failure occurred after the oscillator/gain graph was connected, when the default `setInterval` function was invoked as a method of `TypeoutSound` rather than of `window`. Chromium rejected that receiver. The same binding affected `clearInterval` cleanup. The webview CSP was inspected and left unchanged; no network or broader media permission was added.

The defaults now call `globalThis.setInterval` and `globalThis.clearInterval` with the browser global as receiver. A regression test uses browser-like functions that throw `Illegal invocation` for any other receiver. The existing single-voice design, mute, pause/resume, reveal, navigation/edit/disposal cleanup, silent format, and visual fallback remain. A missing Web Audio API is identified once and is never retried; an actual resume failure records its phase and may be retried on a later playback gesture. The visible warning now includes the failure phase, exception and context state so another failure can be distinguished without developer tools. It remains a single warning line rather than accumulating notices.

**Validation:** Build and syntax checks pass; **94 deterministic tests pass**. The actual isolated Extension Development Host now shows no sound-unavailable warning for modem, keyboard or typewriter, with a running Web Audio context and a connected voice during reveal; Pause disconnects the voice. Temporal visual, reduced-motion, hide/return, immediate-reveal and prior accepted-feature regressions pass. These native API/DOM observations establish graph operation and cleanup, **not sound heard through speakers**. Ted should assess audibility and volume with Mute off in a fresh Extension Development Host. The earlier report below remains as historical evidence of the defect; its unavailable-sound conclusion is superseded by this correction. The fictional native trace is in [typeout-native.json](test/evidence/typeout-native.json). No manuscript or private adaptation was touched; no push, release or merge.

---

# Literal type-out preview — 2026-10-21

**Acceptance status:** Ted accepts named beats, folding, source/preview navigation and Caption insertion, in addition to the prior chat, pace and static-image experience. The type-out component and its sound choices are new and await his assessment. The older sections below retain their historical, pre-acceptance wording.

One top-level `typeout` fence now handles literal PRIME/Divergent-style YAML or a note. Its header selects `@format yaml|annotation`, optional independent `@sound modem|keyboard|typewriter|none` (default none) and `@speed` in Unicode grapheme clusters per second (default 30, allowed 1–120). A blank line separates configuration from body; body text, indentation, Unicode and line breaks are never parsed as YAML or directives. Ordinary YAML fences and existing annotations remain untouched. The YAML and annotation presentations share the same reveal clock. Outside delay/pause semantics, manual beats, source-order blocking, contextual Reveal Immediately, replay, edit cancellation and hidden-preview pause all use the existing independent player. A full, visually hidden passage is available to assistive technology while visible text advances without live per-character announcements. Reduced motion reveals it fully at component entry and suppresses sound. The sound is locally synthesised with one bounded voice per active passage; no external audio or per-character nodes are used. Mute is a reader preference stored apart from the Markdown.

**Automated validation:** `npm run build`, `npm run check` and `npm test` pass with **93 deterministic tests**. New tests cover literal/CRLF/Unicode parsing, invalid header lines, grapheme timing and bounds, exact pause/resume and immediate reveal semantics, reset/cancellation, reduced motion, preset insertion and a fake Web Audio lifecycle. Existing chat, images, conversion, beats and navigation tests remain green. The real VS Code 1.142.0 Linux Extension Development Host run observes the fictional sample through the actual preview: ready/no output, progressively longer prefixes at separate times, pause/hide/return holding a prefix, resume, immediate reveal followed by later authored timing, replay, edit reset, reduced-motion full text, 320px bounds and each of the four sound modes' visual playback. It also reruns earlier source/preview, folding, conversion and imagery checks. The test uses CDP DOM events, so it establishes visual and lifecycle behaviour, **not that sound was heard or its quality**. Its isolated host reported Web Audio unavailable after creating the initial modem graph; keyboard/typewriter then kept revealing silently with the warning. The fictional temporal and audio-event observations are retained in [typeout-native.json](test/evidence/typeout-native.json). A trusted human Play gesture and actual listening are still needed to assess sound on Ted's machine. This remains a local extension preview, not an EPUB or reader compatibility result.

The fictional [type-out sample](samples/typeout.md) and README give exact local steps. No manuscript passage, artwork, private Art adaptation, Component Types note or accepted EPUB artifact was changed. No push, release, deployment or merge.

---

# Named beats, source navigation and Caption insert — 2026-10-21

**Acceptance status:** Ted accepts static imagery and the existing chat/pace experience. Beat titles, folding, explicit source/preview navigation and the Caption helper are newly implemented and await his review. The previous imagery section below is preserved as the historical report from before his acceptance.

The shared Markdown structure scanner now supplies beat source ranges and optional title metadata. A title comment immediately after a boundary, or before first-beat content after frontmatter, is removed from reader rendering and timing. Preview This Beat uses the cursor's source range and resets that beat to ready; Show Beat in Source checks document URI, revision, index and range before revealing/unfolding its own source. Ordinary cursor moves do not change the preview. Native folding ranges keep a title line visible and end before the next separator. Insert Beat prompts for an optional title and Insert Caption adds/selects the established plain-text caption without replacing prose. The independent player now also uses a later unchanged beat as a source-edit anchor when an earlier inserted boundary is removed.

**Automated validation:** 84 deterministic tests pass with build, syntax and whitespace checks. New tests cover first/titled/duplicate/untitled beats, frontmatter and literal fences, UTF-16 source offsets after edits, title-only empty beats, folding ranges, comment-free reader output, titled Beat snippets, caption association/insertion/refusal and player source-edit preservation. The actual VS Code 1.142.0 Linux Extension Development Host suite passed with an isolated profile: it exercised title display, Preview This Beat retaining the source selection, Show Beat in Source returning to the exact title line, native Collapse/Expand, Beat title prompt/Cancel/Undo, Caption snippet placeholder/Undo and existing-caption text selection. The native editor DOM showed the titled beat line while its dialogue was hidden after Collapse All Beats; Show Beat in Source revealed that dialogue, also after `editor.foldAll` nested Markdown folding. Existing chat, conversion, image, narrow-view and safety regressions passed. The host's provider result included the titled beat fold (`start: 12, end: 32`) alongside normal Markdown folds. These are automated editor/UI observations, not Ted's manual assessment or a cross-platform guarantee. No actual iPad/Safari or EPUB export is claimed.

**Limit:** VS Code merges ranges from multiple folding providers; a conflicting Markdown fold at the same start line may win for some untitled heading-first beats. Single-line beats have no foldable interior. The beat-only commands target source-derived beat starts, but exact fold selection in those collisions needs manual observation. The extension does not add region markers or suppress the Markdown provider. Multiple-preview routing is guarded by each panel's source URI; the native suite tested one document's round trip, while manual multi-document UI verification remains. Directly folding a nested chat fence immediately before Collapse All Beats produced inconsistent native folding in isolated runs; the verified nested-unfold scenario used VS Code's `editor.foldAll` to create the nested state. This remains a VS Code interaction to inspect manually, not a claim that every fold combination is deterministic.

To inspect locally: launch the Extension Development Host, open `samples/lantern.md`, use Preview This Beat from the second beat title, then Show Beat in Source; collapse/expand beats and observe the title and fenced chat in the editor. Try Insert → Beat boundary (named and empty title), Insert → Caption on beat 6's image or its existing caption, Tab through the placeholder and Undo. Run `npm run test:host` to repeat automated observations. No manuscript source or Ted's local Art adaptation was edited.

---

# Static imagery preview — 2026-10-21

**Acceptance:** Ted accepts the chat pace setting. Normal, Brisk and Deliberate remain as implemented; image presentation is a new experiment awaiting his assessment in Art.

## Implemented behaviour

A standalone ordinary Markdown image paragraph is an image component. An optional immediately following separate `*Caption: plain text*` paragraph belongs to that image; alt text remains the image’s accessibility text, and Markdown title text is not reused as a caption. Inline images stay within their prose component. Image entry defaults to zero delay. Outside `@delay` replaces that entry delay and `@pause` adds authored silence; an image itself consumes no viewing timer. The existing player governs pause, resume, replay, navigation and source-edit cancellation.

The saved adaptation’s directory is the reference base. The permitted resource root is its containing workspace folder, or that directory when outside a workspace. Relative `../` links can reach shared assets inside the root. The host rejects remote/data URLs, unsupported extensions, paths and symlinks escaping the root, absent/unreadable files and mismatched PNG/JPEG/WebP signatures. It uses VS Code `asWebviewUri` and bounded `localResourceRoots`; CSP permits only webview-local images, with no network loading or embedded scripts. The host sends a pending revision immediately to stop prior playback, resolves files, then the webview preloads them before enabling Play. Browser loading has a five-second timeout and failure placeholder. Revisions reject stale results.

**Insert… → Image** chooses an existing file, writes an encoded relative Markdown path with an editable alt-text snippet, and leaves the file in place. The operation is unsaved and one Undo; it refuses selected prose, chats, untitled documents and files outside the permitted root. The native file picker uses VS Code `showOpenDialog`.

Three small original geometric harbour fixtures (PNG portrait, WebP landscape, JPEG inline) are committed; no manuscript artwork was copied. Sample beats 6–7 show prose → delayed image → pause → chat and a captioned portrait with inline JPEG. The private Art adaptation and existing EPUB assets remain untouched.

## Validation and limits

- **79 deterministic tests pass**, plus build, syntax and whitespace checks. Coverage includes image parsing/source order, caption separation, inline/literal preservation, exact image/pause/chat timing, player cancellation, spaces/Unicode/parent paths, remote/outside/symlink/missing/unsupported/unreadable failures, and Insert command success/cancel/stale/Undo settings. Existing chat pace, conversion and safe-rendering tests pass.
- **VS Code 1.142.0 Linux Extension Development Host:** automated observations exercised the real preview and toolkit with WebP, PNG and JPEG files, delayed reveal, caption/alt, a 320px reader area, replay, missing-file placeholder, and source changes while playback was active. Earlier accepted chat/authoring regressions were also exercised. See the local `npm run test:host` runner. These are automated API/DOM observations, not Ted’s manual acceptance. The operating-system file picker was not automatically selected in this suite; the Insert command was tested with a deterministic file-picker adapter, and Ted’s manual steps in README cover the real picker.
- The first native run exposed an inline image style-class loss, which was fixed. Browser/VS Code polling made an older pace stopwatch assertion flaky; exact totals remain covered by the injected-clock tests, while native observations use a wider timing range. A previous conversion Undo check sometimes targeted a diff after focus changed; the host harness now explicitly focuses the source editor before Undo. No chat timing code was changed.

No actual Art image composition, remote VS Code workspace, Windows/macOS, screen-reader or publication/export result is established. Missing files never block beat completion, but a very slow local image may hold preparation for up to five seconds before showing a placeholder. The simple plain-text caption convention and responsive fit are provisional.

---

# Chat-local pace — 2026-10-21

Ted accepts the existing chat experience. His remaining feedback is that long exchanges accumulate too much waiting. **The new pace setting awaits his acceptance.** Imagery is next and is not implemented here.

`@pace normal|brisk|deliberate` is chat-local configuration before the first message. Omission is exactly Normal. The centrally defined multipliers 1/0.7/1.3 scale the existing bounded automatic delay, rounded per message to milliseconds. Explicit inside/outside delays, additive pauses and 600ms read ticks do not scale. Responding uses the same effective incoming-message delay, without an additional wait. Prose ordering, manual beats, pause/resume, replay and cancellation remain unchanged.

The Insert picker now offers Pace and then three described choices. It writes configuration at the start of the selected chat, replacing/moving existing declarations (including consolidating duplicates) in one unsaved Undo operation. It refuses other structural contexts and guards document/selection changes across both pickers. New chat snippets omit pace.

## Validation

- **70 deterministic tests pass**, plus build, syntax checks and `git diff --check`. Coverage includes default/explicit Normal compatibility, Unicode length, pre-scaling bounds/rounding, explicit delays and pauses, tick timing, cross-chat scope, responding duration, pause/resume/replay/cancellation, line-numbered invalid/duplicate/late configuration, helper CRLF updates and literal continuation preservation. Existing parser/converter/safe-rendering regressions remain green.
- **Actual VS Code 1.142.0 on Linux, isolated Extension Development Host:** automated native picker interaction verified Brisk insertion, Deliberate replacement, two single Undos and outside-chat refusal. Real extension webview playback exercised all three paces with an incoming responding indicator, then a 300ms pause and explicit 1200ms delay. This is temporal DOM observation in the native host, not a browser-only player mock or Ted’s manual acceptance.
- First-message observations: Normal **839ms** (target 800), Brisk **633ms** (560), Deliberate **1057ms** (1040). Second-message observations from Play: **2303ms**, **2124ms**, **2638ms** (targets 2300/2060/2540). Polling and IPC add measurement latency; exact timing is covered by the injected deterministic scheduler. Evidence: [pace-native.json](test/evidence/pace-native.json). Re-run with `npm run test:host`; full local run logs/temporal files were in `/tmp/story-teller-host-wVHdgb`.
- Existing host regression checks also passed: ready idle, mixed ordering, responding, reduced-motion sequencing, viewer alignment/ticks, source reset, navigation/focus, safe rendering, conversion preview/cancellation/staleness/Undo, native snippets and context guards. The first run stopped when a pre-existing conversion notification folded its buttons out of view; the harness now opens the native notification centre before selecting notification actions. No product behaviour was changed for that test issue.

`lantern.md` retains its first three beats and adds matching eight-message Normal/Brisk comparisons. Their summed waits are **18,865ms** and **13,835ms**, including the same unscaled 900ms pause and 1200ms explicit delay. Use README launch steps, Next to beats 4/5, Play, then Replay or the Pace helper. These authoring examples still need Ted’s comparison.

No dependencies, imagery, conversion rules, manuscript content or EPUB artifacts were added/changed. Ted’s authoring worktree, Component Types note and private untracked Art/assets were left untouched. No push, publication, release or merge.

---

# Chat authoring consolidation — 2026-10-21

## Status and acceptance

Ted has accepted Markdown/live preview, chat playback/pacing, the separate replacement/additional-silence semantics and reports conversion is good. The new Insert/Wrap experience and contextual guard choices **await his acceptance**. No remote issue/milestone is closed by this local slice; the earlier EPUB work is separate.

## Implementation

Existing conversion was reused, including diff/count/warnings, explicit Apply, stale refusal/regeneration, no save and single Undo. Source inspection is now shared by parsing, conversion and helper context checks. It recognises initial frontmatter, root beat boundaries and literal/nested code contexts. Tests explicitly verify outside `---` bytes remain unchanged through conversion, including BOM/CRLF, while initial YAML and fenced examples do not create beats.

Native **Story Teller: Insert…** supplies Chat, Beat boundary, Delay, Pause, Responding and Ticks, plus explicit Wrap Selection. Commands are contributed to the palette and Markdown context menu. Native SnippetString tab stops provide title/viewer/message fields, with the viewer linked to the first speaker. Optional flags are off until inserted. Context guards prevent nested fences, selected-text replacement, misplaced flags, metadata/example edits and wrapping across boundaries. Wrap keeps selected text verbatim and explains that it does not convert the syntax. Picker state is version/selection guarded and operations are unsaved/single-undo.

## Validation

Build/syntax checks pass; **65 deterministic parser/player/converter/helper tests pass**. Earlier timing/phase/cancellation, header responding, viewer offsets/ticks, source preservation and safe-rendering checks remain green. No dependencies or production configuration were added.

The real **VS Code 1.142.0 Linux Extension Development Host** suite exercises native picker selection, all six inserts, title/viewer/message tab stops, linked viewer edits, numeric timing placeholders, wrapping, selection/context refusals and single Undo. It also retains conversion diff/warnings/Cancel/stale/Apply/Undo, converted multiline preview and accepted playback regressions. These are automated API/DOM observations, not Ted's manual authoring/reading acceptance or OS pointer testing.

An initial full-suite attempt passed playback but could not reach the stale-conversion action because VS Code had folded the warning out of the transient toast UI. The harness now opens native Notifications before choosing Regenerate; product conversion behaviour was unchanged. A subsequent full insertion/Undo run passed. Picker cancellation and picker-stale checks are included in the final run. A DOM-only context-menu check timed out because the native popup was not exposed in the main document; a separate isolated host screenshot was inspected and shows “Story Teller: Insert…” in the Markdown context menu. Popup activation was not automated; invocation/picker behaviour is automated through the contributed command. No user settings were changed for that popup check. Additional harness adjustments wait for the rendered source fixture and keep the current chat text identical while testing insertion of an earlier beat; otherwise the test was exercising the documented edited-beat fallback rather than unchanged-beat preservation.

## Read-only Art exercise

Snapshot SHA-256 **`e60079b6167181a94ddae43370589c8bf6d2514e5221164b418353e6ee01e658`**, inspected in memory while Ted continues editing. It had **four existing boundaries / five beats**, a valid manually adapted chat and **29 remaining legacy containers**. All 29 are convertible in that snapshot, with no conversion review warning; existing valid chat is unchanged. Conversion preserves every existing boundary's exact text/EOL bytes, initial frontmatter and beat count. Second pass proposes zero changes. Source line positions may shift when fence bodies shrink; boundaries themselves do not change.

Authoring observations: legacy wrapper chats produce reader diagnostics until converted; optional settings are intentionally not inferred; Obsidian artwork embeds remain literal/unsupported in this text-only slice. Existing boundaries are useful editorial starting points, not permission to automatically split paragraphs or rewrite a scene. No manuscript words, scene boundaries or source files were changed or committed by the exercise. Only fictional/minimal fixtures are committed. The local Art file may continue changing independently of this recorded snapshot.

## Remaining limits

The helpers are intentionally conservative around code, frontmatter, partial quotes/lists and complex selections; complete quoted/list blocks may be wrapped verbatim. They do not format/convert selected dialogue or infer speakers. Delay inserted at the end of an unfinished draft still needs following content; parser diagnostics remain the guide during authoring. Cross-platform, screen-reader/high-contrast and OS background/minimise verification remain as previously noted. No images, new component types, import/export, EPUB packaging, deployment, push, release or merge were added.

---

# Header responding correction — 2026-10-21

A header `@responding` had been implemented as a one-message marker. A viewer-first message consumed it, while its visual cue was correctly suppressed for the viewer. As a result, a header-style chat setting did not reach the incoming reply. This is a reproduced parser-policy mismatch; it is not a claim to have inspected Ted's unsaved editor buffer.

Before the first message/pause, `@responding` now enables incoming cues throughout that chat. Viewer messages never display or consume that setting. Existing per-message directives between messages/pauses retain their one-message scope. The cue still uses only existing message delays, disappears on Pause/reset/arrival and respects the viewer, motion and timing rules. No content setting is invented by conversion.

Build/syntax checks and **55 deterministic tests pass**. New regressions cover a converted viewer-first chat with ticks, multiple incoming replies, pause/resume/replay/reset and isolation between chats, plus legacy per-message scope. The actual Extension Development Host suite runs the fictional viewer-first scene with **only a header flag**, confirms the incoming cue after the viewer's delivered/read phase, and exercises the existing conversion/Undo/multiline regressions. These are automated observations, not a reproduction of Ted's unseen current buffer. An initial full-suite run passed playback but timed out at the unrelated Regenerate-button lookup; the test-only locator now searches native workbench buttons beyond transient toast containers, and the full rerun passed. No conversion product logic changed for that harness adjustment. Author-edited Art and Component Types files are unchanged.

---

# Current-document chat conversion — 2026-10-21

## Evidence and implemented scope

The inspected authoritative Art source is pinned to `79edd0e365e3ae6ab5f5e19413d6fe12d679a518` (`Books/CONSTRAINT/COLLISION/Art.md`, SHA-256 `2625789554f7c743e56ca114b08c80992a84d6e298e95414d3d1785f85594497`). Source definitions were read from writing-companion revision `08ec248d6bdd1cef33cd1eab255df24430a8e9fa`; exact paths and conversion rules are in README. Current local Component Types and author-edited Art were also inspected. No guessed speaker-name recognition is used.

A read-only in-memory audit converted **30 authoritative Art containers / 71 messages**. Their speaker/text/order, titles and explicit right-aligned participant declarations match the inspected companion parser's results; an independent temporary execution of that TypeScript parser supplied the comparison. The second conversion pass made **zero changes**. This audit is separate from committed fictional fixture tests. No manuscript passage or converted manuscript output is committed, saved back or published.

## Executed validation

- Build and JavaScript syntax checks pass; **53 deterministic parser/player/conversion tests pass**. Dependency audit: zero vulnerabilities; no dependency added.
- Fictional/minimal fixtures cover multiline content, titles, inherited speakers, escaped literal pipes, explicit settings, no invented settings, ambiguity/subtext/artwork retention, current valid blocks, literal examples, quotes/lists/code/frontmatter, BOM/CRLF, surrounding byte preservation, idempotence and source-line warnings. New heading/continuation parsing is additive; playback timing, viewer ticks/offset and non-viewer responding regressions remain covered.
- **Actual VS Code 1.142.0 Extension Development Host automation passes:** native read-only diff/count/warnings; Review Warnings output; Cancel with no source edit; edits after preparation causing stale Apply refusal; Regenerate using the latest buffer; explicit Apply of two containers; no file save; one Undo restoring the exact prior unsaved buffer. Host testing uses temporary fictional documents and verifies the on-disk file stays unchanged.
- The host also previews the converted fictional scene through the real player, observes the `# Harbour link` title and verifies a multiline message retains its colon, blank line and literal directive-looking text. Existing timed playback/safety regressions run in the same suite.

These are **automated API/DOM observations in a real Extension Development Host**, not a human pointer/reading review or cross-platform validation. Temporary profile/logs are printed by `npm run test:host`. No VS Code API is mocked. Unit clock tests establish exact timing; real UI tests allow asynchronous renderer latency.

## Material limitations

Only the inspected plain wrapper subset in top-level chat fences is convertible. Unknown historical formats, nonempty subtext, dividers, assets, complex alignment/identity markup and ambiguous blocks are unchanged with line warnings. Current invalid manually adapted chats (for example a missing space in `Speaker: message`) are flagged rather than guessed/repaired. Canonical `# Title` and explicit `  | ` continuation support were necessary additive parser changes; existing `@title` and bare `@ticks` remain supported. Older tick aliases were not introduced or expanded by this task.

Conversion does not editorially remove redundant narration, insert beats, change timing or construct image/drawing components. Windows/macOS, VS Code Web/remote, actual screen-reader operation and the prior hidden/reopening behaviour remain unverified. The manuscript source, local authoring worktree/Art file, Component Types and EPUB work are preserved. No push, release, deployment or merge.

---

# Consistent tick flag — 2026-10-21

`@ticks` now enables optional authored status marks, matching the bare `@responding` flag style. Omission leaves ticks disabled. Viewer requirements, header placement, duplicate detection and timing are unchanged. Older `@ticks on` / `@ticks off` drafts remain readable for compatibility; the sample/docs and main playback fixtures use `@ticks`.

Build/syntax checks and **43 deterministic tests** pass. The actual Extension Development Host suite exercises the updated sample's bare tick flag and outgoing read marks; existing title, timing, responding and safe-rendering regressions remain covered. These are automated checks, not a manual reading review. Local Art and Component Types notes are unchanged.

---

# Optional chat titles — 2026-10-21

`@title Title text` is an optional header inside a chat fence, once before messages/pauses. It renders a plain-text heading and names the conversation for accessibility. It appears when playback reaches the chat, before its first message, and adds no timing. Outside silence does not prematurely reveal a later title. Untitled chats retain their prior rendering. Empty, duplicate and late titles are diagnosed; titles with spaces/colons are supported. This does not add support for manuscript-specific `> Speaker` chat syntax or rewrite the local Art file.

Build and syntax checks pass; **42 deterministic tests pass**, including title scope, validation and component-entry timing. The actual Extension Development Host test checks title-before-first-message, no title leakage into the next chat, and an HTML-like title displayed as text without executing or fetching content. These are automated DOM observations, not a manual reading/accessibility review. Existing timing/lifecycle limitations below remain.

---

# Cross-component timing — 2026-10-21

## Automated validation

- Build and JavaScript syntax checks pass. **40 parser/player tests pass** with an injected deterministic monotonic scheduler. Dependency audit reports zero vulnerabilities; no dependency was added.
- Exact clock totals cover multi-paragraph prose revealed atomically, chat → delayed prose, additive consecutive pauses, combined pause/delay, outside first-message overrides with no second entry delay, leading in-chat pauses, trailing completion pauses, and duplicate overrides across chat boundaries. Tests also cover source locations, literal Markdown contexts, invalid-control omission, manual navigation, source-edit resets, interruption/resume and stale callbacks after replay/disposal.
- The real **VS Code 1.142.0 Extension Development Host** suite exercises the extended `lantern.md`: chat → 1000ms delayed prose → 800ms trailing pause, then prose → 700ms silence → 1200ms first-message delay with Ivo's responding cue → chat → 1000ms delayed prose → 1000ms trailing pause. It observes the distinct phases and records timestamped counts/status in its temporary `temporal.json`.
- The existing host regression checks remain: explicit Play/ready state, Pause/Resume, Replay, beat preservation on edits, viewer-only ticks/responding, outgoing offset with ticks disabled, safe content rendering, focused controls and disposal. The mixed example runs with an emulated reduced-motion preference; timing/sequencing remain intact without animation.

These are **automated DOM observations in the actual Extension Development Host**, not a manual pointer/reading review. Exact timing assertions come from the deterministic scheduler tests; host observations allow real timer/polling latency. No actual iPad, macOS, Windows or assistive-technology result is inferred.

## Decisions and limits

Recognised outside directives are metadata, never rendered story content. They are valid at root block boundaries, not inside an existing Markdown paragraph, quotation, list or literal code example. Invalid controls are diagnosed with source lines; they add no timing. A conflicted outside override retains the first authored value. Malformed chat keeps dialogue as code without executing it; authoring-control lines are stripped from that fallback. Neither an error nor a pending delay can carry into the next beat.

Prose entry defaults to zero; adjacent Markdown paragraphs remain one component. No sentence reveal, new component type, automatic beat progression or helper interface was introduced. Existing chat delays/ticks, the non-viewer responding rule and source/reset behaviour remain in place. The prior hide/reopen/OS-background, accessibility, cross-platform and best-effort identity limitations below still apply. Ted's existing sample edits were retained while adding the requested examples. EPUB work and Component Types remain untouched. No push, release, deployment or merge.

---

# Timed chat and responding — earlier verification (2026-10-21)

## Executed checks

Linux desktop; Node.js 24.19.0; VS Code 1.142.0 (`6d62b1d5dace93a33b3a6d3eca1317bd5e15bcb1`). Dependencies unchanged from the first slice.

- Build and JavaScript syntax checks pass; `npm audit` reports zero vulnerabilities.
- **28 deterministic parser/player tests pass.** An injected monotonic fake clock checks default bounds/Unicode length, one-message overrides, zero delay, additive and trailing pauses, exact remaining-time pause/resume, message/status reset on replay, duplicate Play, stale canceled callbacks, navigation/edit/disposal cancellation, multiple mixed components, manual beat progression, original syntax and diagnostics. These are clock-controlled unit tests, not measurements of browser timer precision.
- **Actual Extension Development Host automation passes.** It observes the fictional sample ready with zero messages after an idle wait; then 1 → 2 → 3 messages over time; Pause holds the count; Resume completes; viewer-only delivered/read ticks; Replay clears progress; edits preserve beat position and reset to ready; mixed-beat following prose waits for chat; Next remains manual. It also exercises pinned-document/reused-preview behaviour, empty-source recovery, focus/navigation and closing during playback.
- The host test emulates `prefers-reduced-motion: reduce` through Electron CDP, confirms the media preference and observes timed mixed-beat sequencing unchanged. Both preference paths use discrete reveals with **no animation**.
- The hostile-source fixture still produces no executable content elements or requests to its remote hostname. Chat payloads remain text nodes; raw HTML remains escaped; links/images remain inert.

Host automation uses real VS Code document edits and the actual rendered webview, with DOM control clicks/inspection through test-only CDP. It is **not a manual pointer, screen-reader or OS reduced-motion-settings observation**. Its printed temporary profile includes `temporal.json` with timestamped counts. No host integration is mocked, and the extension contains no CDP code.

The optional `@responding` continuation adds a speaker-derived, nonanimated cue during the next non-viewer message's delay, without extra timing. Viewer messages and chats without an explicit viewer suppress the cue; this does not change delivery timing. Unit tests cover opt-in/default-off behaviour, explicit silence, zero delay, status phases, pause/resume, replay, edits/navigation and invalid directives. The host run checks “Ivo is responding…” appears during the sample delay, disappears on Pause, returns on Resume and disappears on message arrival.

The viewer-offset regression was caused by applying the outgoing CSS class only to messages with status ticks. It now depends directly on speaker/viewer identity. The host test checks the mixed beat with ticks off: Mara alone has the outgoing class and a measured horizontal offset; no ticks appear.

## Material limits

- Hidden previews are wired to pause via VS Code and document visibility; page disposal destroys the clock. Full tab-hide/recreation and OS background/minimise transitions were not exercised in the host suite. Restored webviews prepare the beat ready; they do not restore elapsed playback. Actual renderer destruction on closing during playback is checked; the stale-work guarantee is additionally tested with deliberately invoked cancelled unit-test callbacks.
- Default delays and the 600ms authored read-status phase are provisional presentation choices, not measurements of human reading/delivery. Turning ticks on adds that phase to the linear timeline. No real delivery service, telemetry, typing simulation, automatic next beat or persistent session is implemented.
- The fictional scene demonstrates syntax, not an accepted adaptation of Art or another manuscript. EPUB artifacts/code and user-authored notes are unchanged.
- Windows/macOS, VS Code Web, screen readers and high contrast remain unverified. Source-to-beat identity remains best effort as documented. No push, release, deployment or merge.

---

# Initial manual slice — historical verification (2026-10-21)

## Executed

Linux desktop; Node.js 24.19.0; VS Code 1.142.0 (commit `6d62b1d5dace93a33b3a6d3eca1317bd5e15bcb1`); markdown-it 15.0.3; esbuild 0.28.2.

- `npm ci`, `npm run build`, `npm run check`: pass. The extension host is plain CommonJS JavaScript; the build bundles the independent parser/player/browser renderer, not the extension API.
- `npm test`: **13 focused tests pass**. Covers initial/BOM/CRLF/unclosed frontmatter, sample component order, fence-aware separators, empty beats, punctuation/speakers, malformed chat preservation, nested fences, unsafe Markdown and navigation/edit reconciliation.
- `npm audit`: **0 vulnerabilities** at verification time. The initial old markdown-it pin was replaced before delivery; the lockfile pins the verified dependency tree.
- `npm run test:host`: **pass in an actual isolated VS Code Extension Development Host**, not a mocked VS Code API or standalone browser page. Opens a temporary Markdown source and invokes the contributed command; inspects the real rendered webview with test-only Electron CDP.

The host run verifies prose → chat → mixed beat; all three controls and boundary states; unsaved edits; insertion before the current beat; edited dialogue; preview remaining bound to its source when another document is selected; command reuse; empty-source recovery; focus staying on Next during manual navigation. Host source-edit operations use `WorkspaceEdit`, while control activation uses DOM clicks in the actual webview. This is not an OS pointer or screen-reader test.

A source fixture includes raw script/iframe markup, remote Markdown image/link and HTML-like chat speaker/message text. No executable script/image/iframe/link/style element appears in the story content, a script sentinel remains unset, and no request to the fixture's remote hostname is observed. Tests write only temporary documents; no manuscript is adapted or rewritten.

## Limits

- Syntax and reconciliation are provisional. Wholesale rewrites and identical/removed/split beats do not have stable author-supplied identities; the documented best-effort rules apply.
- Message delivery is whole-beat/manual, with no timers, typing indicators, delivered/read ticks or authored timing. The fictional scene is a syntax fixture, not evidence of an accepted manuscript adaptation.
- Links are inert and images use alt text. Local image presentation and other component types are deferred.
- Hidden-webview state restoration is implemented with the documented webview state/ready APIs, but tab hide/recreation and full application restart were not included in the automated host run. Full saved-session restoration is outside this slice.
- No actual macOS, Windows, remote-workspace, VS Code Web, screen-reader or high-contrast verification. Styles use VS Code theme variables and native buttons; broader accessibility verification remains open.
- Existing EPUB experiments and Art feature work were not changed or retested by this separate extension slice. No new EPUB, release, publication, merge or deployment is produced.


# PR #18 final review and author acceptance

Ted accepts the combined scene-title/import fixes in #18 (`8088f75bd5c35d2d604f6ba14eb64f3c08041053`)
and #19 (`a7b84c9f762949c7b27298b566da91474df70b2d`): “All now working as expected.
The embedded markdown files are skipped, which is acceptable.” This accepts
skipped Markdown transclusion as a limitation; SVG remains unsupported. It adds
no iPad/Safari, physical touch or human audio verification. The pending language
in the original implementation reports below is historical and superseded by this
acceptance. No new product behaviour is introduced by final-review records.

Review found no material heading defect: insertion follows YAML and first-beat
metadata, matching leading headings are preserved, different headings and literal
titles remain readable, no title-only beat is introduced, and the web header
avoids repeating a matching body title. Source files, part/matter/supporting notes,
identity and sequence remain outside this transformation. #19 will be reviewed
and integrated separately after #18 using the combined accepted runtime.

The final documentation-only head is checked with the same 236-test suite,
syntax/build/package checks. Runtime source is byte-identical to the reported
heading head, so its recorded native/HTTP evidence remains applicable; that is
not a claim of a new device test. Local checks are distinct from absent GitHub CI.

---

## Chat wikilinks — 2026-10-27

**Reproduced before edits:** a valid linked speaker and heading remained raw
`[[target|label]]` strings; only message-body targets appeared in reference
collection. Adding `@viewer StillLearning` and `@ticks` to
`[[Celia|StillLearning]]` caused the chat to fall back to code with a viewer-match
warning. Legacy `{{[[Celia|StillLearning]]|Thank you, [[Skip]].}}` was refused as
nonempty subtext because the alias pipe was treated as a field separator.
The existing body renderer already rendered safe explicit links, preserved
ordinary Markdown-looking text/code/escapes and calculated waits from visible
labels; that behaviour is retained.

**Fix:** speakers and both heading forms reuse `renderChat`. Source markup and
safe HTML stay separate from displayed labels; displayed handles drive viewer
matching, alignment, ticks, typing text and the conversation's accessible name.
Linked viewer directives supply a handle only. Recognised wiki spans shield their
colons from message parsing and their pipes from legacy field parsing. Wrapper
escape decoding leaves wikilink content intact. Malformed/ambiguous wrappers and
nonempty subtext remain review-only. Speaker/heading references join the existing
resolver, diagnostics and exported target collection. No reader lifecycle or
supporting-panel implementation was replaced.

**Automated validation:** `npm test` passes all 30 test files, including seven
focused chat-wikilink cases; `npm run check`, browser bundle build and VSIX
packaging pass. Package inspection verifies final parser/Markdown/converter
source bytes, both bundles and exclusion of tests/samples (384 archive entries).
The broad native Development Host and installed-VSIX regressions pass, including
existing conversion/authoring/playback checks. Focused checks pass in actual VS Code
1.143.1 on Linux, in an installed VSIX disposable profile, and in a fresh
standalone HTTP export under headless Chrome. They exercise heading, speaker,
body and continuation links; outgoing alignment, read ticks, handle-only typing;
hover/focus preview; keyboard Enter/Escape; nested note/back; playback pause,
focus return, explicit resume and replay; and absence of nested controls.
See `test/evidence/chat-wikilinks.json` for the shared probe's observations.
The broad native runs preceded the final legacy continuation-separator
compatibility refinement; the full unit suite and final-package focused probe
were rerun after it.

Reproduce from `tools/story-teller/`:

```sh
npm ci
npm test
npm run check
npm run package
STORY_TELLER_HOST_SCOPE=chat-links node test/run-host.cjs
STORY_TELLER_HOST_SCOPE=chat-links STORY_TELLER_VSIX=story-teller-0.11.2.vsix node test/run-host.cjs
node test/chat-links-web.cjs
npm run test:host
STORY_TELLER_VSIX=story-teller-0.11.2.vsix npm run test:host
```

**Observation limits:** these are automated interactions with real applications,
not human hands-on review or new iPad/Safari/touch/audio/platform acceptance.
All fixtures are synthetic. An initial native probe read the frame too early;
its polling now tolerates frame loading. An initial web probe clicked Play before
scene loading completed; it now waits for the loaded ready scene. Sandbox-limited
packaging could not inspect the extension entrypoint; packaging with normal
process permissions succeeded. These initial harness/environment failures are
not product-fix claims. No release, merge, deployment, manuscript, Stories-Told,
PrimeTrilogy or experimental EPUB changes are part of this task.


### PR #21 acceptance and integration review — 2026-10-27

**Ted's hands-on acceptance:** Ted tested candidate
`c0338666fc3a44ddf71b115db346b95c172ead73` in his actual Story Teller project:
“That works well. Will be very useful.” This accepts the desktop chat-wikilink
behaviour he tested. It is separate from the automated synthetic checks above;
no exhaustive acceptance or new iPad/Safari, touch, other-platform or human audio
coverage is inferred. The earlier “not human hands-on review” limitation describes
the implementation task's automated checks, not this later report.

**Final review:** the remote head still matched the previously reviewed candidate,
and main remained `cb69228355f1d8db8c6759b4a7e09cb7b9dc44b5`. No subsequent
runtime changes, formal reviews, inline comments, unresolved review threads or
closing-issue references were present. GitHub reported no CI checks; this is
absence of CI, not a CI pass. Review rechecked source/label separation, viewer
matching, timing, safe HTML, reference discovery, literal/code treatment and
conservative conversion. No material blocker was found. This closeout adds only
Story Teller acceptance/review documentation in this file and the existing
Story Teller/Decisions vault notes. Runtime, tests, dependencies and syntax stay
byte-identical to Ted's accepted candidate, so the existing native/installed-VSIX
and fresh HTTP-export interaction evidence remains applicable without claiming
new device observations.

The final documentation head is validated again with the full 30-file unit suite,
syntax checks, both browser builds and VSIX packaging/archive inspection.
Post-merge validation compares the entire merged tree with the final reviewed
head, then checks the unit suite, syntax and build from merged main. No directly
associated closing issue was identified; unrelated issues, including #20, remain
open. No release, tag movement or deployment is authorised.

## 2026-10-28 — Reader playback speed (#13), 0.12.0 candidate

Historical implementation record (acceptance below supersedes its pending status).
Both surfaces share the timing
policy/player and labelled native select. Calculated prose/chat/type-out timing
is divided by the reader multiplier after authored baselines; explicit waits,
zero durations, ticks, audio pitch and image frames retain their meanings.
Mid-wait changes preserve proportional progress, paused changes stay paused,
and cancellation generations reject stale callbacks. Calculated deadlines carry
forward to avoid callback/rounding drift; authored waits start in full.

Focused tests cover all five speeds and the unchanged 1× baseline, prose and
chat baselines/overrides, YAML and annotation/Unicode reveal, active/paused
calculated and explicit waits, replay/reveal/navigation/update/disposal, stale
callbacks, delivery ticks, supporting-note pauses, sound voice cleanup, invalid
preferences and unavailable VS Code storage. Existing suites retain coverage of
authoring settings inheritance, autoplay, mute, reduced motion and reader/export
security. Real browser validation additionally checks local storage failure and
reload persistence, keyboard selection and narrow layout. Audio observations
count oscillator creation/stopping; they are not human listening evidence.

Reproduction (from repository root):

```sh
npm test --prefix tools/story-teller
npm run check --prefix tools/story-teller
npm run package --prefix tools/story-teller
STORY_TELLER_HOST_SCOPE=speed node tools/story-teller/test/run-host.cjs
STORY_TELLER_HOST_SCOPE=speed STORY_TELLER_VSIX=tools/story-teller/story-teller-0.12.0.vsix node tools/story-teller/test/run-host.cjs
node tools/story-teller/test/speed-web.cjs
```

Each native run uses an isolated VS Code profile and synthetic project; installed
mode loads Story Teller from the VSIX and a separate test adapter. The web runner
exports the synthetic fixture through the real exporter and serves it over HTTP.
Do not run native and Chrome UI probes concurrently: background window timer
throttling invalidates wall-clock measurements. The early background-window
measurement failed; focused runs supersede it. Early native narrow layout
failed and led to label/select wrapping; the corrected 205px pane has no overflow.
An early storage injection probe required enabling CDP Page events before its
new-document script; the corrected probe tests storage before application startup.
No historical failure is counted as a pass.

Evidence: `test/evidence/reader-speed-development.json`,
`reader-speed-installed.json` and `reader-speed-web.json` contain temporal
measurements and checks. Automated native/Linux and Chrome emulated touch are
separate from actual-device testing. No new actual iPad/Safari, screen-reader,
other operating-system or human listening coverage is claimed. Private
adaptations and unrelated EPUB experiments were not changed.

Original acceptance checklist (historical; not a per-item record of Ted's tests):

- [ ] Install 0.12.0 and verify 1× retains familiar presentation.
- [ ] Read a familiar paced prose/chat passage at **0.75×**: is it comfortable?
- [ ] Repeat at **0.5×**: does the extra time make reading comfortable?
- [ ] Try type-out and change speed mid-reveal; check heard sound and visible
  continuity, Pause/Resume, immediate reveal and Replay.
- [ ] Check authored waits, supporting notes, manual turns and autoplay/mute.
- [ ] Reopen preview/browser; verify saved speed, then restore 1× (default).
- [ ] Try the exported reader on an actual touch device at a narrow width.

No deployment, release/tag publication, automatic page turns, source adaptation
updates or licence changes are part of this candidate.

Final checks: **271/271 tests pass**, syntax checks, both browser builds and
VSIX packaging pass. Packaged runtime files match the validated working tree.
`test/evidence/reader-speed-package.json` records artifact hashes;
`reader-speed-narrow.png` shows the 320px HTTP reader. The local handoff is
`story-teller-0.12.0.vsix` plus `local-web-preview-speed/` (synthetic only).
Serve the latter over HTTP, for example `python3 -m http.server 8765 --bind
127.0.0.1 --directory tools/story-teller/local-web-preview-speed` from repository
root. These generated artifacts are ignored rather than committed as a release.

### PR #22 final review and acceptance — 2026-10-28

Ted reports “0.75 works best for me.” and “Checked all three tests, working
well.” This accepts the feature at `28d9fc9823f023961e3dc137e24693e80e094e4d`;
0.75× is his personal preference, **1× remains the compatibility default**.
The three tests are not individually identified. No device/browser versions,
exhaustive platform coverage or human audio findings are inferred.

The remote head matched the reported accepted commit and base main remained
`cb8e9fb2431060d749ddbba7776a6f1d5af31f87`. No formal reviews, inline review
comments or unresolved review threads were present. Repository settings allow
squash merging; main has no required status contexts. No workflow files are
configured in this tree. GitHub status/check/run observations are recorded in
the review evidence; absence of checks is not a CI pass.

Final review found no material blocker. Both readers use the shared speed
policy, player and presentation. Calculated steps are explicitly marked after
bounded prose/chat/type-out baselines; authored boundary delays, message delays,
pauses, zero waits and ticks retain their existing meanings. Active calculated
changes convert remaining time proportionally without resetting content;
paused changes do not resume. Generation/cursor guards reject cancelled timers.
Sound sync retains one voice at a time and stops it on pause, reveal or departure.
Navigation retains speed and cancels outgoing work. Preference validation rejects
non-enumerated values; VS Code global reads/writes and browser local storage have
fallback handling. Native select labels, focus styling, keyboard operation and
narrow wrapping are unchanged from the accepted candidate. Speed changes have
no source/manifest authoring write path.

This closeout changes acceptance/review documentation and validation records
only. Runtime, tests, dependencies, parser and authoring settings remain
byte-identical to the accepted head. The original VSIX matches its recorded
SHA-256 and all 42 packaged runtime/manifest files match that head. Thus the
reported Development Host, installed-VSIX and synthetic HTTP checks apply to
this final runtime without inventing additional platform observations.

The full 271-test suite, syntax checks, both builds and packaging are repeated
for closeout. Packaging is rebuilt to include the updated guide. A focused
installed-VSIX speed run and a fresh synthetic HTTP export run verify the rebuilt
artifact; results and hashes are in `test/evidence/reader-speed-review.json`.
The final documentation head is checked again before an expected-head squash
merge; its entire tree must equal the merged tree. Post-merge tests, syntax,
build/archive comparison and GitHub check inspection are reported on PR #22.
Issue #13 closes only after those acceptance criteria and integration checks pass.
No broader platform certification, manuscript change, release or deployment is
part of this integration.
