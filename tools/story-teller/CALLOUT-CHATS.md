# Mixed callouts and authored chats — 0.20.0 review candidate

Use **Story Teller: Convert Callouts to Type-out** on a separate adaptation copy.
The command now converts legacy chats inside recognized callouts as part of the
same diff and Apply operation. The manuscript is not a conversion workspace.
Review the diff and Output warnings; Apply edits the unsaved buffer, and one Undo
restores it. No save is automatic. Repeating conversion makes no further edits.
**Convert Chats** retains its existing top-level-only scope; use the callout
command for embedded chats.

## Why a container is needed

Previously, chat conversion skipped quoted fences (`token.level !== 0`) and
machine-callout conversion required exactly one YAML fence. In Cost of
Withholding, `LocalCorrection.SequenceDependency` has one YAML fence, four chat
fences and intervening prose. Markdown recognizes the quoted fences correctly;
the converter's policy rejects the entire mixed callout. It is not a viewer line
being mistaken for a callout boundary.

A single literal/formatted type-out cannot represent independently performed
chats and their parent callout identity. The smallest extension used here is a
fenced `callout` container with a normal ordered component body:

`````markdown
````callout
@type divergent
@title Local correction
@timestamp 2030-01-02 03:04
@fold -

```typeout
@format yaml
@identity component
@sound modem

correction: retained
```

An authored paragraph.

```chat
@viewer Ari
Ari: Preserve this sequence.
@subtext
  | local state
```

A following paragraph.
````
`````

`@type` is required; `@title`, `@timestamp` and `@fold +|-` are optional,
unique single-line fields before a blank separator. A containing backtick fence
is longer than any backtick run in its body or metadata. Types and fold markers
are retained as authored metadata. The reader shows an expanded parent section
with a title/timestamp and independent prose, YAML and chat components. It does
not implement interactive callout collapse. Mixed prose remains narrative prose;
YAML uses the existing modem type-out. A mixed annotation/email/JANUS callout is
also an ordered parent, rather than a single type-out document.

The parsed beat records parent identity and its child block range in `callouts`;
each child retains its `callout` context. Playback uses the existing ordered
component sequence. The renderer nests all visible children in one parent
section, so chat messages are never flattened into type-out text. No beat
boundary or beat title is generated. The existing prose-only/YAML-only callout
and top-level chat conversion paths retain their existing output.

## Boundaries and diagnostics

Conversion supports the existing recognized callout types: `prime-log`,
`divergent`, `annotation`, `email`, `janus`, `janus-log`. Mixed bodies support
ordinary Markdown prose and closed, top-level `yaml` and `chat` fences. Chat
conversion reuses the existing rules, including viewer, title, timing, flags,
pace, inherited speakers, message continuations and third-field subtext.
Already converted chats retain their source bytes inside the new wrapper.

Adjacent headers split callouts only outside fences. One blockquote prefix is
removed; an inner `> Viewer` stays chat metadata. Bare blank lines between
quoted sections can be bridged in a mixed region; unquoted narrative ends it.
Prose-only quote boundaries retain their earlier behavior. CRLF and source bytes
outside edits are preserved.

Nested callouts, list-nested component fences, historical `chat-old`, unsupported
fence languages, unclosed fences and ambiguous legacy message fields are not
silently flattened. The complete affected callout stays unchanged with a
source-located warning. Beat/timing directives outside child fences also need
review, rather than becoming newly executable by removing the quote prefix.
Malformed authored `callout` containers remain complete readable code with a
parser diagnostic. Arbitrary recursive callout nesting is not supported.

## Acceptance evidence

See [validation](test/evidence/callout-chat/README.md). Automated installed-VSIX
checks are implementation evidence. Ted's acceptance of the conversion in his
installed extension remains pending; do not merge or publish before that.
