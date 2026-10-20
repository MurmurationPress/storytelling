---
type: design-note
status: exploring
---

# Chat Performance

## Ted's idea

Chats unfold inside an app-like presentation as if the participants are typing. Messages appear one at a time. Sometimes no message arrives, but three wiggling dots show that someone appears to be typing.

Timing and absence can carry part of the scene. A typing indicator may begin, stop or return before anything is sent.

## Controls to explore

- Delay before the first message and between subsequent messages.
- Typing-indicator start, duration and disappearance.
- Reveal by complete message, phrase, burst or individual character.
- Speaker identity and reusable presentation profile.
- Author-entered pauses rather than timing based solely on message length.
- Reader-controlled start, pause, skip, replay and immediate reveal.
- Stable transcript access alongside the performed version.

These are authored sequences. Nothing in the initial concept requires a live model to improvise dialogue or answer the reader as a character.

## Silence needs testing

A pause can be expressive or merely frustrating. Readers may also interpret a long silence as a broken site. Explore how to preserve dramatic timing while making playback state legible.

Decide what happens after navigation, backgrounding a browser or reopening a sequence. Do not silently consume unread messages while the reader is elsewhere.

See [[PRIME and JANUS]], [[Reading Experience]] and [[Authoring and Storyboarding]].


## Next practical component — 2026-10-20

Chat is the next new component in the limited [[Managed EPUB Foundation]] milestone. Select and pin a real conversation from the authoritative manuscript before settling its model. Message/typing/silence phases should refine the PRIME-derived lifecycle rather than copy a YAML counter blindly. Authored dialogue stays intact; timing and presentation are editorial metadata. Transcript fallback must preserve essential silence/unsent-typing meaning where necessary. No chat implementation or live chatbot is introduced by this planning step. See [the chat issue](https://github.com/MurmurationPress/storytelling/issues/6).


## First implemented passage — Art

[[Art Chat Slice]] now tests a four-message permission exchange, with the source words unchanged. Supporting narration is adapted only where the performed message carries its information. The concrete progress model stores shown-message count, delay/response phase and remaining active milliseconds; interruption must preserve the phase, not just the transcript index. New settings are proposed editorial pacing, not invented narrative hesitation. A versioned opaque snapshot extends the existing reader connection. This first case does not settle significant authored silence, unsent typing or all chat behaviour; those should wait for actual passages that call for them.
