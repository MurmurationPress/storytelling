# Optional message subtext (0.18.0)

Chat subtext belongs to one message. It is neither dialogue nor a speaker, chat
heading or timestamp. Story Teller does not infer its meaning or add labels.
Missing or empty subtext leaves the existing message appearance and timing alone.

## Authoring syntax

After a message and its dialogue continuations, add a **bare** `@subtext` line.
Put every subtext line under it using the existing two-space, pipe, space syntax:

````markdown
```chat
# Continuity exchange
@viewer Operator
@responding
Companion: Limited continuity. External context unavailable.
@subtext
  | local state
Companion: A retained observation remains available.
  | This line is still dialogue.
@subtext
  | retained context — α → β
  | Source: retained record
Operator: Confirm the retained account.
```
````

Each marker identifies the **immediately preceding** message. A new speaker line
starts a new message, even when the same speaker continues. Subtext is not inherited
by later messages. Put it before any following `@delay`, `@pause` or `@responding`.
A duplicate or detached marker is diagnosed and the chat stays readable as code
instead of guessing ownership. Blank physical lines retain the existing behaviour;
use `  | ` for an authored empty line within dialogue or subtext.

The marker takes no inline argument. This keeps arbitrary colons and directive-
looking content unambiguous, and preserves previously valid `Speaker: message`
lines, including unusual names such as `@subtext team: An existing message`.
An empty marker has no visible effect. Whitespace-only legacy values are retained
in source/model but create no empty paragraph. Existing message continuations
containing `  | @subtext` remain literal dialogue, not a marker.

Pipes, braces, Unicode, indentation, blank lines and directive-looking text can
all occur in subtext lines without becoming controls:

````markdown
```chat
Companion: The record remains available.
@subtext
  | local | retained — α → β
  | @pause 900ms is text, not a timer.
  | Operator: still subtext, not a new speaker.
  | <script>literal text only</script>
```
````

Subtext uses chat's existing literal text and explicit wikilink conventions.
`[[State note|Read the state note]]` uses the same bounded supporting-note lookup,
preview, keyboard access and panel as dialogue. Ordinary Markdown-looking text
such as `**emphasis**`, raw HTML and URL/image syntax stays literal; it does not
execute or fetch content. No new media/import or remote-content permission exists.
Completion and hover help offer `@subtext` after a message, with its continuation
snippet; it is not a component-header setting.

## Legacy conversion

Before:

````markdown
```chat
{{Companion|Limited continuity. External context unavailable.|local state}}
```
````

After **Story Teller: Convert Chats in Current Document**, review and Apply:

````markdown
```chat
Companion: Limited continuity. External context unavailable.
@subtext
  | local state
```
````

Nonempty third fields are preserved by default; there is no discard option.
Absent or empty third fields retain the previous converted syntax. Inherited
speakers, multiline dialogue, titles, viewer, authored controls, containing fences,
line endings, source position and beat boundaries follow the existing converter.
Recognised wikilink alias pipes are protected in all fields; legacy escaped `\|`
field-delimiter pipes decode using the same rule as dialogue. Brace escaping and
unsupported/nested wrappers retain their existing treatment. Extra unescaped
field pipes, malformed links, unresolved speakers or unknown controls remain
review warnings; conversion does not guess which text belongs in a third field.

The command reviews the active document, including a project scene and unsaved
changes. A selection restricts edits to complete selected containers. Apply uses
one editor edit, does not save, and retains stale-source checks and Undo. Repeat
conversion is a no-op. There is no existing project-wide legacy-chat conversion
command: **Review Project Metadata Migration** handles typeout metadata, not chat
field conversion. Import/opening a project does not run this conversion.

## Presentation and playback

Subtext appears once beneath its own dialogue, in smaller, muted text with normal
reading contrast and spacing. It remains inside that message's list item, after
the body in accessible reading order. No live region or duplicate hidden subtext
copy is added. Long values wrap; multiline values preserve their line breaks.

Current Story Teller chat reveals a **whole completed message after its calculated
or authored responding wait**, rather than typing its characters. Subtext enters
atomically in that same render. It has no typing sound, reveal step, extra delay
or contribution to message-length timing. The shared player controls visibility,
so pause/resume, speed, replay, restart, navigation and source edits cannot expose
subtext separately or leave a stale copy behind. It is not inserted later with a
second layout shift. Chats without it retain their normal bubble layout/timing.

The extension's existing **Reveal Immediately** can now complete a pending chat
message and its subtext; subsequent messages still follow their own timing. This
also works while paused. Authored delivered/read ticks retain their existing
600ms transition. The exported reader's **Reveal** keeps its existing whole-beat
policy. Previous shows a completed silent beat. Reduced motion retains discrete
chat message sequencing and authored waits; changing that preference does not
skip a pending chat message. Restored reader state restores existing beat/control
preferences, not an independent subtext clock or detached DOM.

## Synthetic review and reproducible checks

Open [samples/chat-subtext-project](samples/chat-subtext-project/) with the
0.18.0 VSIX. `Legacy.md` is the original synthetic input; `scenes/Chat.md` is the
converter's exact output and the manifest's preview scene. The example includes
consecutive speakers, absent/empty/nonempty fields, multiline metadata, Unicode,
literal HTML and an explicit supporting note. No private adaptation is included.

Run `npm test`, `npm run check` and `npm run package` from this tool directory.
`test/chat-subtext.test.cjs` checks grammar/model/timing/export and
`test/metadata-command.test.cjs` checks document/selection diff/Apply guards.
For an actual HTTP reader, export into a new directory:

```sh
node src/web-export.cjs samples/chat-subtext-project /tmp/new-chat-reader
python test/chat-subtext-web.py /tmp/new-chat-reader /tmp/chat-evidence
```

The Python check needs Playwright and `/usr/bin/google-chrome`. For native VS Code:

```sh
STORY_TELLER_HOST_SCOPE=chat-subtext \
STORY_TELLER_VSIX="$PWD/story-teller-0.18.0.vsix" npm run test:host
```

The native scope checks both layouts, responding/message completion, Reveal,
speed, navigation, supporting content and real conversion diff/Apply/Undo on a
disposable source. See [RESULTS.md](RESULTS.md) for executed evidence and limits;
prior component-metadata migration Undo verification is a distinct recorded scope.
