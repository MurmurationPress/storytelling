# Component identity and beat rhythm

A **beat title** names a reader navigation/pacing unit. A **component title**
identifies one fenced passage. Several passages and prose can share a beat.
Converting a callout never adds, deletes, moves or renames a beat or its title.

Inside any `typeout` configuration header (`yaml`, `annotation`, `janus`,
`janus-log`), put optional `@title` and `@timestamp` before the blank separator:

````markdown
<!-- beat: A deliberate reading interval -->

Opening prose.

```typeout
@format janus-log
@identity component
@title PA-01 **STATUS**
@timestamp 2026-10-30 01:13
@sound none

| Parameter | Current |
| --- | ---: |
| Distribution | +0.91 |
| Continuation orientation | +0.94 |
```

Intervening prose.

```typeout
@format annotation
@identity component
@title A separate note — [[Definition|definition]]

A note with its own identity, in the same beat.
```
````

Each field is independently optional. Its value is the rest of **one physical
line after one separating space or tab**. All remaining characters, including
additional spaces, punctuation, Unicode and Markdown, are retained. Values are
not JSON/YAML strings; quote marks are ordinary content. They use the existing
safe inline Markdown renderer: emphasis and explicit supporting wikilinks work,
HTML is escaped, ordinary URL links remain inert. No date parsing, timezone
inference, date rewriting or clock substitution occurs. Avoid newlines in field
values; duplicate/empty fields diagnose the fence and leave readable source.

Directive-looking text is safe as a value: `@title @pause 900ms` is a title.
After the blank separator, `@title`/`@timestamp` are body content, just like other
literal typeout body directives. Metadata does not enter the body reveal clock
or add a reading pause. Headers appear together at component entry, outside the
animated body. PRIME remains a literal printout; annotation and both JANUS
profiles retain their established body presentation, silence/sound and controls.

## Supported conversion inventory

| Source | Destination | Sound | Identity handling |
| --- | --- | --- | --- |
| `[!prime-log]` | `typeout`, `@format yaml` | modem | Callout title/timestamp inside the YAML component header |
| `[!divergent]` | `typeout`, `@format yaml` | modem | Same |
| `[!email]` (case-insensitive) | `typeout`, `@format annotation`, grey fill/border | none | Own title; complete body retained without header/timestamp extraction |
| `[!annotation]` | `typeout`, `@format annotation` | keyboard | Own title/timestamp |
| `[!janus]` | `typeout`, `@format janus` | none | Own title/timestamp |
| `[!janus-log]` | `typeout`, `@format janus-log` | none | Own title/timestamp |
| Historical `chat` fences with `{{speaker|body|subtext}}` wrappers | Current authored `chat` fence | unchanged | Already component-owned `# Title` / `@title`; no beat identity inference or new timestamp extraction |
| `[!State]` | Readable resolved scene-metadata Markdown, **not a fence** | none | Existing same-document frontmatter resolution; not component-identity migration |

There is no generic `[!chat]`-to-fence conversion. Other callout labels, imports,
unknown chat controls and supporting-note playback semantics are unchanged.
Machine conversion still requires exactly one complete top-level YAML fence.
Prose around that fence remains ordinary prose, in its original order, as before;
it is not flattened into literal YAML. The YAML fence itself owns the metadata.
Titles no longer need to be valid HTML-comment contents: `—`, `-->`, Markdown
and backticks can be safely represented in a component header.

## Timestamp extraction

Email callouts bypass timestamp extraction entirely; all their lines remain body.
For the other recognised type-out callouts, only the first nonblank content paragraph is considered. Recognised
forms are a standalone `YYYY-MM-DD HH:mm` / `YYYY-MM-DDTHH:mm` line (optional
seconds, fraction and explicit `Z`/numeric offset), or an explicit `Timestamp:`
field. Bold `**Timestamp:**` and `**Timestamp**:` labels are also recognised.
The field must be an isolated, complete paragraph. An explicit label can carry
non-ISO wording such as `Timestamp: Before dawn — local clock`.

Only the recognised original line is removed. No neighbouring prose or blank
lines are removed. Two leading timestamp candidates or a timestamp sharing a
paragraph with prose cause a warning and leave the whole callout unchanged.
Dates in ordinary prose, tables, YAML keys/data or later report content are
never searched for extraction. `Date:`/`Time:` report fields and date-only bare
lines are not guessed into timestamps. Untitled callouts get no invented label.

Conversion is an explicit **Convert Callouts to Type-out** command with diff,
Apply, warnings, stale-source protection and Undo. With a nonempty selection,
only complete selected structures are eligible (include their full lines and
ending newline); no selection means current document. Literal examples and
malformed/nested callouts remain untouched. Repeating conversion is a no-op.

## Legacy compatibility

Unmarked legacy JANUS fences still display their beat title exactly as before.
This compatibility path applies only to `janus`/`janus-log` with **neither**
explicit identity field nor `@identity component`. Other formats never acquire
beat titles. It is a display fallback, not evidence of ownership for migration.
An explicit title takes precedence; a timestamp-only component has no inferred
title. `@identity component` explicitly disables the fallback even when both
fields are absent. All new conversions and Insert presets carry that marker.
Thus an untitled new callout cannot inherit an unrelated beat title. Removing
the marker and both fields deliberately returns an old JANUS fence to legacy
compatibility; it is not done automatically.

## Explicit migration

Run **Story Teller: Migrate Component Metadata** in an adaptation document.
Select complete component lines to limit its scope, or leave no selection for
the current document. It never runs on open, import, preview or export.

Safe associations are narrow:

- Leading `Title:`/`Timestamp:` fields (including balanced bold labels) inside
  formatted components are component-owned metadata. They must be separate from
  prose. A standalone leading bare timestamp inside a formatted component uses
  the same isolated-paragraph rule as conversion.
- A leading Markdown heading inside a formatted component that exactly matches
  its explicit title or beat title provides a corroborating representation.
- An explicitly labelled isolated `Timestamp:` paragraph immediately before a
  fence can be associated with that fence. A bare timestamp outside a fence
  requires the author's explicit association.
- YAML bodies are always data: their title/timestamp/date keys and comments are
  never migrated as metadata.

A beat title alone, a lone fence or adjacency to ordinary prose is not proof.
For unproven ownership, place the caret in the intended component, run migration
and choose **Use beat title for component at line …** only if you know it belongs
to that component. This author decision associates **one** fence; it is never
broadcast across the beat. The default choice reviews safe changes only.
Unclear or conflicting cases remain byte-for-byte unchanged with file/line and
reason. Existing explicit values are never overwritten. Matching originals are
removed only when safely moved, so the metadata is not shown twice.

When metadata contains supporting links, review previews, full notes and onward
links from component entry, which can precede the former body-heading reveal.
Project scope alone is not spoiler safety; no automatic spoiler filter is added.

Every diff retains beat titles, boundaries, data, prose order and authored timing
settings. Component identity no longer consumes body reveal units; no explicit
pause/delay, speed, sound or reader preference is rewritten. The report separates
to-migrate, already-migrated, skipped and ambiguous components. Apply is one
unsaved editor edit, with Undo; edits/closure/selection changes during review
prevent a stale Apply. Repeating migration makes no further changes.

**Review Project Metadata Migration** deliberately scans only the current
adaptation manifest's scenes and front/back matter. It reports every file and
line, including unchanged/skipped/ambiguous cases, using current editor buffers.
Choose a file to review its safe diff, then Apply or Cancel; the list refreshes
from the buffers. There is no bulk save or blind project-wide beat-title copying.
Resolve ambiguous associations with the document command. When a beat has no
title, an ambiguous bare outside timestamp needs a manual header edit; the
beat-title association option does not invent a title. Supporting Content,
private manuscript folders and unlisted files are not scanned. A changed or
unsaved project manifest stops review until the operation is restarted. Finish review to
leave the operation. Each applied file remains separately undoable and unsaved.

### Migration example

Before (the matching in-component heading establishes ownership):

````markdown
<!-- beat: Old report -->

```typeout
@format janus
@sound none

# Old report

Timestamp: Before dawn

The observation remains unresolved.
```
````

After:

````markdown
<!-- beat: Old report -->

```typeout
@format janus
@sound none
@identity component
@title Old report
@timestamp Before dawn



The observation remains unresolved.
```
````

The blank source lines are intentionally preserved. A beat containing only
`<!-- beat: Old report -->` and an unlabelled fence is **ambiguous**, not the
example above: use the explicit per-component author choice or edit its header.

## Review sample and checks

Open `samples/component-identity-project` in VS Code. `Mixed.md` presents six
components in one beat: PRIME and divergent-style YAML, timestamp-only
annotation, long-title/timestamp report, internal analysis and intentionally
untitled report. `Legacy.md` offers safe, ambiguous and partial migration cases.
These files are synthetic. The sole supporting note defines signed changes at
its earliest link and has no onward links or later disclosures.

```sh
npm run check
npm test
node src/web-export.cjs samples/component-identity-project /tmp/component-review
python3 test/component-identity-web.py /tmp/component-review /tmp/component-evidence
STORY_TELLER_HOST_SCOPE=component-identity npm run test:host
```

The optional browser/native checks use the same Linux Chrome/VS Code tooling as
other repository checks; they do not establish human screen-reader or Safari
acceptance. JANUS's separate row-width/navigation regression remains available
as `test/janus-web.py` and the `janus` native scope.

## Copyable conversion examples

### prime-log

Before:

~~~~markdown
> [!prime-log] Report
> 2030-01-02 03:04
>
> ```yaml
> status: observing
> date: 2031-02-03
> ```
~~~~

After (no beat changes):

~~~~markdown

```typeout
@format yaml
@identity component
@title Report
@timestamp 2030-01-02 03:04
@sound modem

status: observing
date: 2031-02-03
```
~~~~

### divergent

Before:

~~~~markdown
> [!divergent] Report
> 2030-01-02 03:04
>
> ```yaml
> status: observing
> date: 2031-02-03
> ```
~~~~

After (no beat changes):

~~~~markdown

```typeout
@format yaml
@identity component
@title Report
@timestamp 2030-01-02 03:04
@sound modem

status: observing
date: 2031-02-03
```
~~~~

### annotation

Before:

~~~~markdown
> [!annotation] Report
> 2030-01-02 03:04
>
> A **complete** observation.
~~~~

After (no beat changes):

~~~~markdown
```typeout
@format annotation
@identity component
@title Report
@timestamp 2030-01-02 03:04
@sound keyboard


A **complete** observation.
```
~~~~

### janus

Before:

~~~~markdown
> [!janus] Report
> 2030-01-02 03:04
>
> A **complete** observation.
~~~~

After (no beat changes):

~~~~markdown
```typeout
@format janus
@identity component
@title Report
@timestamp 2030-01-02 03:04
@sound none


A **complete** observation.
```
~~~~

### janus-log

Before:

~~~~markdown
> [!janus-log] Report
> 2030-01-02 03:04
>
> A **complete** observation.
~~~~

After (no beat changes):

~~~~markdown
```typeout
@format janus-log
@identity component
@title Report
@timestamp 2030-01-02 03:04
@sound none


A **complete** observation.
```
~~~~

## Email example

Fictional input:

```markdown
> [!Email] Harbour delivery
> From: **Mara**
> To: Receiver
> Subject: *Signal received*
>
> The receiver is ready.
>
> See [[Harbour early|harbour background]] before replying.
```

After conversion:

````markdown
```typeout
@format annotation
@identity component
@title Harbour delivery
@fill grey
@border grey
@sound none

From: **Mara**
To: Receiver
Subject: *Signal received*

The receiver is ready.

See [[Harbour early|harbour background]] before replying.
```
````

Untitled emails omit `@title`. Every body line, including leading dates and
`Timestamp:` fields, remains body content. Selection must contain the whole
callout; review diff, explicit Apply, Undo, stale-source rejection, safe fences
and repeat-conversion no-op use the existing workflow.
