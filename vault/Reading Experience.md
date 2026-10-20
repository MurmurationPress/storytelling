---
type: concept
status: exploring
---

# Reading Experience

## Established direction

- Preserve page turning and an intentional narrative path.
- Allow the story world to have a wiki-like structure, with linked material available for exploration.
- Let delivery vary with the needs of the passage.
- The platform need not be constrained by Ghost or by a conventional web page.

## Proposed principles to test

The reader provides a journey; linked material provides depth. Opening a map, image or world entry should preserve a clear route back to the same reading position.

The author should be able to control sequence, pace and revelation. A link can itself reveal information, so visibility and availability may need to depend on reading progress. The handling of rereading and spoiler preferences is unresolved.

Timed sequences should offer pause, replay and an immediate-reveal option. Comfortable text sizing, keyboard use, reduced motion and nonvisual access should be part of the early design discussion, not assumed to follow automatically from a visual prototype.

Avoid assuming that every passage benefits from animation, sound or interaction. A quiet page of prose is a valid delivery choice.

## Audio is an editorial question

The Eleven experience suggests that audio needs explicit treatment of callouts, documents and speakers. Possible choices include a different voice, a short introduction, an alternate reading order or a separate playable item. None is selected yet.

What happens if narration continues while the reader explores a map or document? Record and test alternatives rather than building in an accidental answer.

See [[Delivery Types]], [[Chat Performance]] and [[Open Questions]].

## 2026-10-20 — Component documents and the container

**Ted's framing:** a component document, much like a wiki assembled from includes. Scenes can be composed from reusable sections, while the container determines how readers encounter those sections.

Ted particularly likes turning a page of prose or manga and encountering a video or an interactive murmuration application. Media can be part of the story itself, not only supplementary links. Other material is an aside and could be delivered like a footnote.

### Separate medium from narrative role

A proposed model gives a component both a delivery type and a role in the publication. A video, map or interactive simulation could occupy the next page in the main narrative or open as an optional aside. The medium alone should not decide where it belongs.

| Role | How a reader encounters it | Intended relationship to the story |
| --- | --- | --- |
| Main sequence | A page turn reveals prose, frames, a video, a conversation or an interactive surface | An authored step in the reading path |
| Aside | A marker invites an optional detour, like a footnote | Additional detail or exploration, followed by return |

These are working distinctions, not a fixed schema. Material necessary to follow the story should be available in the main sequence rather than accessible only through an optional aside.

### The container's job

Proposed responsibilities include reading order, page turns, navigation and retaining position. A component supplies its own presentation and local interaction inside that reading experience. The container should accommodate a full-page interactive surface as naturally as prose.

The storyboard could therefore specify both a section's delivery template and its placement in the reading path. The same source component might be included in different contexts; timing, size and state may need to belong to each occurrence rather than to the shared source.

### Footnote-like treatments to explore

A small text aside might expand beside a marker or in a margin. A larger map, video or simulation might open a panel or a separate full-page view with an explicit return. Neither one presentation nor a literal footer need fit every aside.

Returning should restore the exact page and meaningful component state, including chat position or a paused video where appropriate. Behaviour on leaving an active component is an open design question.

### Questions to test

- Does turning to a video show a poster and play control, or start playback? Page turning alone does not settle this.
- How does an interactive page indicate that the reader can continue without demanding arbitrary completion?
- How do side panels and full-page asides behave on an iPad-sized display?
- Can a reader turn pages reliably while a map or Canvas also uses touch gestures?
- How should includes work without coupling the publication format permanently to Obsidian?

Record these as design possibilities; the container implementation and markup remain undecided.

See [[Authoring and Storyboarding]] and [[Delivery Types]].
