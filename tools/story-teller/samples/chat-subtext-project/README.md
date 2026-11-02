# Chat subtext — synthetic review

Open this folder in VS Code with Story Teller **0.18.0**, then select **Retained
exchange** in the outline. `Legacy.md` shows the legacy input, and `scenes/Chat.md`
is its exact converted output. All text is synthetic; no private book is included.

1. Restart, then Play. During “Companion is responding…”, neither dialogue nor
   `local state` is visible. Both appear together when that message completes.
   Chat currently reveals whole messages after a wait, not typed characters.
2. Pause/resume and change speed. The first explicit 2000ms delay stays authored;
   later automatic waits scale. Subtext has no extra delay or sound.
3. Reveal a pending message in the extension. Its metadata appears with the body.
   Replay/Restart clear it; Next cannot inherit a previous beat's subtext.
   Previous shows the complete silent exchange. Reduced motion retains sequencing.
4. The first two messages are both Companion with different subtexts. Operator's
   outgoing message has none. The next empty third field also adds no paragraph.
   The last multiline field includes a pipe, directive-like text, literal HTML
   and the **State note** link. All remain separate from dialogue.
5. Inspect desktop and narrow layouts. Subtext should be smaller and muted, with
   comfortable contrast and wrapping inside its own message bubble. Keyboard-open
   the State note and close it to check focus return.
6. Open `Legacy.md`, run **Convert Chats in Current Document**, inspect the diff,
   Apply and Undo. Changes stay unsaved. Import does not run conversions for you.

The State note is first accessible in the final message's metadata. Its preview
and complete text define the already visible label without later story events;
there are no onward links. No automatic spoiler filtering is implied.
