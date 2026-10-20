# Toolkit choice and publication adaptation

Inspected on 2026-10-20. This implementation is deliberately specific to the Planetary Model extract.

## Choice

**EPUB.js 0.3.93**, the npm version returned by the registry at inspection, is pinned in the lockfile. Official tag v0.3.93 resolves to commit `0963efe979e34d53507fee1dc10827ecb07fdc75`. Its [README](https://github.com/futurepress/epub.js/blob/v0.3.93/README.md) documents scripted content and content hooks; [Section](https://github.com/futurepress/epub.js/blob/v0.3.93/src/section.js#L43-L126) runs the spine content hook before serialization. The [Rendition implementation](https://github.com/futurepress/epub.js/blob/v0.3.93/src/rendition.js) provides `next`, `prev`, `display`, `relocated`, `getContents` and content hooks. These let the shell open the EPUB directly and connect to rendered documents without implementing ZIP parsing, package parsing, pagination, a layout engine or spine navigation.

The [global layout selection](https://github.com/futurepress/epub.js/blob/v0.3.93/src/rendition.js#L549-L590) uses rendition/package metadata in the inspected default manager path. It does not provide the per-spine mixed-layout treatment needed by our original fixed state/image documents. We therefore use a named all-reflowable derivative, not an assertion that EPUB.js automatically reproduces the original mixed-layout edition. Prose is still toolkit-paginated; the state and image are separate bounded spine resources.

**Readium Web** was also inspected: official TypeScript toolkit `develop` at `a7bddc0af401638e2c6fcd4dcc4fbca6130a8504`; npm `@readium/navigator` reported 2.13.2. Its [README](https://github.com/readium/ts-toolkit/tree/a7bddc0af401638e2c6fcd4dcc4fbca6130a8504) describes separate shared/navigator/injectable packages. The [EPUB navigator constructor and listeners](https://github.com/readium/ts-toolkit/blob/a7bddc0af401638e2c6fcd4dcc4fbca6130a8504/navigator/src/epub/EpubNavigator.ts#L28-L58) accept a `Publication`, positions, initial locator and configuration, with frame-loaded/position callbacks and injection facilities. Its navigator selects a fixed or reflowable frame pool. It is a credible app integration path, but direct EPUB opening plus the small EPUB.js host hooks is the smaller setup for this extract. No claim that Readium cannot do this, or that its current source is identical to the released npm version, is intended. No Readium reader was built or tested here.

This is a toolkit choice for an experiment, not a project-wide platform decision. Chromium on Linux was exercised. Responsive portrait testing does not establish Safari or iPad compatibility.

## Licences and trust boundary

EPUB.js uses [BSD-2-Clause terms](https://github.com/futurepress/epub.js/blob/v0.3.93/license), reproduced in [EPUBJS-LICENSE.txt](EPUBJS-LICENSE.txt). Readium Web's inspected source is BSD-3-Clause. JSZip 3.10.1 is used under its MIT option; its installed package includes the notice. Dependencies retain their upstream notices in `node_modules`; no toolkit bundle is copied into the repository. Playwright is a development-only dependency.

EPUB.js explicitly warns that enabling `allowScriptedContent` makes its sandbox insecure. This shell opens only the bundled trusted EPUB, on a local loopback origin, with popups disabled and no general book loader. The narrow presentation channel does not itself grant filesystem/native execution access. It is **not isolation against malicious publication code**: same-origin scripted EPUB content may access the host DOM. The integration must not be advertised as a safe arbitrary-EPUB reader.

`npm audit` on the locked install reports one high transitive `@xmldom/xmldom` advisory group and one moderate dependent EPUB.js finding. The runtime serves the package's prebuilt browser distribution, which uses the browser DOM implementation in the exercised path; the experiment does not offer server-side XML processing or accept hostile books. We have not rebuilt/patched EPUB.js or claimed these advisories resolved. This dependency/trust constraint would require reassessment before broader use.

## Exact publication changes

`build_epub.py` reads the preserved playback-v2 ZIP and writes only `publication/planetary-model-encounter-v1.epub`. It uses no manuscript parser and writes nothing in the manuscript repository or PR #1 artifacts. The original source pin remains `84fcdb52841ce5280aa3f23397a4dd2b829c1133` from `tedwarddick/PrimeTrilogy`; extraction boundaries remain those independently checked by the original `verify.py`.

Changes from playback-v2:

- Distinct package identifier, title and visible build label `encounter-v1`.
- Remove fixed-layout spine overrides and fixed viewport metadata from the state and image resources. Change their body classes to the corresponding reflowable presentation classes.
- Add bounded responsive CSS: state maximum content width, proportional type capped at the original 22px, smaller responsive headings/controls, and contained image within 80% of the frame height. Retain the original colours, monospace printout, indentation, restrained cursor and **three characters every 65 ms**. Geometry stays reserved by the complete text while it is visually hidden.
- Add a blocking head bootstrap and opt-in `encounter.js`, referenced in the manifest. The state document loads this component instead of baseline `state.js`; the unchanged original script remains packaged but unused. The bootstrap reserves a blank surface only when this shell has injected its versioned opt-in marker and normal motion is selected.
- The new component pauses/resumes/persists progress through the host contract. Immediate reveal, reduced motion, completed replay and explicit-start unsupported-reader behaviour are retained. No narrative prose, metadata frontmatter or State callout receives animation.

Unchanged: opening/before-image/after-image XHTML bytes, YAML text and whitespace, paragraph order, image XHTML's authored alternative description, original SVG bytes, contents order and the image's narrative position. The two image/state markup adaptations above are presentation changes, not manuscript changes. `publication/build.json` records baseline and derivative hashes; `verify.py` independently checks exact text, order, SVG, manifest and references.

The host injects a transient `prime-presentation-v1` marker through the documented pre-serialization hook. This marker is **not in the downloadable EPUB**. Without it, ordinary readers get readable complete text and explicit start if publication scripts run. With scripts disabled in the test host, the marker is not injected and complete text stays readable with controls hidden. Full shell functionality requires JavaScript; the publication fallback, not the shell UI, is the no-script deliverable.

## Boundaries of the shell

Single trusted publication, single-page paginated rendition, no spread UI, no catalogue, no authoring, no accounts, no annotations, no TTS, no manufactured audio, no production hosting. Standard EPUB remains the publication package; the host connection is our nonstandard opt-in extension. No Thorium source, security setting or reader binary was changed. General clipping/occlusion detection for arbitrary nested widgets and arbitrary themes is outside this extract-specific geometry contract.
