> **Component identity update:** new conversion no longer creates beat titles or
> boundaries. Use optional `@title`/`@timestamp` inside each typeout header and
> `@identity component` for intentional component scope. Unmarked legacy JANUS
> fences retain their beat-heading display until explicitly migrated. See
> [COMPONENT-IDENTITY.md](COMPONENT-IDENTITY.md) for current conversion, migration
> rules and all before/after examples. The original review description below is
> retained where it describes legacy examples.

# JANUS documents

The extension preview and exported web reader share these two type-out formats:
`janus` is a pale blue circulated report; `janus-log` is dark navy internal
analysis with cyan headings and restrained amber emphasis. These are presentation
profiles, not added classification labels. The author supplies all wording.

Run **Story Teller: Convert Callouts to Type-out** on a separate adaptation,
review its diff and warnings, then Apply. Labels are case insensitive, and the
existing optional `+`/`-` callout markers are accepted. No YAML is required.
Prose-only, table-only and interleaved documents use the same conversion.
The original manuscript must remain separate.

Copyable source:

```markdown
> [!janus] Observatory review
> **Date:** 4 November 2030
> **To:** Review committee
>
> The comparison retains **signed values** and uncertainty.
>
> | Observatory | Change | Assessment |
> | :--- | ---: | :---: |
> | North | **+12** | Stable |
> | South | −3 → 0 | *Pending* |
>
> - Retain the first reading.
> - Compare the second reading.

> [!janus-log] Internal comparison
> **Subject:** Alternative interpretation
>
> First analytical statement.\
> Second analytical statement.
>
> The difference remains *unresolved*.
```

Separate adjacent callouts with an unquoted blank line, as above. Conversion
retains the displayed title as component `@title`, preserves body Markdown and line
endings, chooses a safe containing fence, and sets `@sound none`. Existing
beat boundaries and beat titles stay unchanged.
Nested callouts, ambiguous structure, unclosed fences and table rows with extra
cells that Markdown would discard remain unchanged with line-located warnings.
Existing type-out blocks are unaffected by repeated conversion.

The equivalent editable component uses the existing syntax:

````markdown
<!-- beat: Observatory review -->

```typeout
@format janus
@sound none

**Date:** 4 November 2030
**To:** Review committee

A complete paragraph with **emphasis**.

| Observatory | Change |
| :--- | ---: |
| North | +12 |
| South | −3 |
```
````

Change only `@format janus` to `@format janus-log` to select internal analysis.
An explicit component title appears as the document heading. Only unmarked
legacy JANUS fences fall back to a beat title; no classification text is generated. Ordinary Markdown headings inside the body are also retained.

Paragraphs and list items reveal together. Consecutive `Key: value` metadata
lines (including bold keys) reveal individually. Separate analytical statements
with blank paragraphs or an explicit Markdown hard break (two trailing spaces
or a backslash). A normal source newline inside prose stays in its paragraph;
visual wrapping never defines timing. Table headings reveal together, then each
complete body row. Multiple tables retain their positions among prose and lists.

The initial interval is 300ms. Each revealed unit receives 190ms per word,
bounded to 650–9000ms, before the next unit; a table adds 450ms of breathing
space. The final unit receives its reading interval before beat completion.
`@speed` remains optional and backwards compatible: for JANUS it multiplies
cadence relative to 30 (60 is twice as fast). Reader Playback speed also scales
these calculated intervals. Explicit outside `@delay`/`@pause` retains its existing
meaning and is not scaled by reader speed. Silence is the default; sound remains
an independent, explicitly authored setting. There is no typing cursor. Existing optional `@border` and `@fill` overrides
also remain available; omit them for the two document palettes.

Tables are fully parsed and measured before rows are hidden. Fixed column widths
hold during reveal; future rows occupy no height. Long tables scroll within the
document, with keyboard-focusable scroll regions. Table inspection suspends
Follow story; use **Follow story** or return vertically to the bottom to resume.
Markdown column alignment, formatting, signs and Unicode are retained. As in
other Story Teller Markdown, ordinary URL links are inert; explicit wikilinks
use the existing supporting-note mechanism. No remote content is fetched.

Play/pause, speed changes, immediate reveal, replay, restart and Previous/Next
use StoryPlayer's existing cancellation and active-time clock. Previous shows
complete content silently. Reduced motion displays the complete document at
entry. The accessible reading copy contains the complete semantic document,
without live announcements for each revealed row. Supporting-note links in that
copy remain keyboard accessible; focusing them exposes the complete static
document so focus is visible. This is not a claim of human
screen-reader or Apple-device testing.

Try `samples/janus-project` in the extension, or export it:

```sh
npm run build
node src/web-export.cjs samples/janus-project /tmp/janus-reader-review
python3 test/janus-web.py /tmp/janus-reader-review /tmp/janus-evidence
STORY_TELLER_HOST_SCOPE=janus npm run test:host
```

The optional browser check requires Python Playwright and the installed Chrome
used by the other browser regressions. All sample wording is synthetic.

## Images and diagrams (0.17.0)

JANUS bodies can mix local images and nested Mermaid fences with prose and tables.
They enter as complete units; table rows and authored component identity retain
their existing behaviour. See [Formatted media](FORMATTED-MEDIA.md) for copyable
four-backtick syntax, image boundaries, preparation, export and annotation behaviour.
