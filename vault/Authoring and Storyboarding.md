---
type: concept
status: exploring
---

# Authoring and Storyboarding

## Current direction

Use Obsidian as a familiar environment in which to develop the ideas. The vault belongs inside this repository. Obsidian may or may not be the correct long-term authoring platform; Ted is comfortable with it and it can be enhanced.

Ted proposes markup indicating interaction types and timings, plus a storyboard application that lets an author choose delivery: prose, comic/image frames, chat sequences, video or interactive maps.

## Proposed visual workflow

Represent a sequence as cards. Each card identifies content, delivery and advancement. Rearrange cards, adjust timing, link assets and preview the experience. A timed chat may need its own detailed view within a larger storyboard.

The visual editor and readable source should describe the same work. Round-trip editing is a design goal: using the storyboard must not make the source unintelligible, and editing source must not silently destroy presentation information.

## Keep the format open for now

No markup syntax, schema, plugin architecture or technology stack is agreed. First collect examples from Art and a PRIME/JANUS session, then compare ways to express them. Avoid prematurely defining a large language from imagined requirements.

Possible concerns include stable block identities, relative asset paths, reusable speaker profiles, per-sequence overrides, content reuse and an exportable publication package. Their priority depends on the examples.

The source manuscript should remain distinct from its adaptation decisions. Decide later whether presentation markup lives alongside prose, in a separate storyboard note or in another representation.

See [[Delivery Types]], [[Art Prototype]] and [[Decisions]].

## 2026-10-20 — Sections built from templates

**Ted's proposal, open for discussion:** construct scenes from ordered sections based on templates. Each template supplies its own settings and rendering. A compile tool generates the publication, potentially delivering it directly to a website in an unpublished state.

Ted explicitly leaves room for other approaches. This is an idea to test against real passages, not a selected architecture or a request to start implementing it.

### A possible working model

| Element | Responsibility |
| --- | --- |
| Scene | Orders sections and defines their narrative relationship |
| Section content | Holds prose, messages, asset references or other story material |
| Delivery template | Defines presentation, behaviour, available settings and defaults |
| Section settings | Overrides the defaults for this particular passage |
| Compiler | Checks the source and assembles a publishable package |
| Reader | Presents the package and runs timed or interactive behaviour |
| Draft delivery | Optionally places a build in a review environment before publication |

A concrete example to explore is a scene containing prose, a performed chat, an artwork reveal and a return to prose. PRIME and JANUS might share a conversation delivery type with different presentation profiles rather than needing independent implementations.

### What should “template” mean?

An Obsidian note template could help insert the source structure. The publication template would have a separate responsibility: interpreting settings and presenting a section to the reader. They may work together, but inserting Markdown alone does not define the playback behaviour.

Keep content distinguishable from its treatment so that changing typography, reveal style or a template need not require rewriting the story. Some changes of medium still require an authored adaptation; a comic is not automatically produced by applying a visual style to prose.

### Compilation and playback

A possible compiler would validate section types, settings, links and assets, then package content, presentation code and media. Typing indicators, message timing and interactive maps would still execute in the reader. Compilation need not flatten everything into video or prerender every possible interaction.

Separate building from deployment and publication as operations, even if one tool eventually offers all three. The same built package could be previewed locally or delivered to a draft site. “Unpublished” needs an explicit meaning in that system: a review URL is not automatically private just because it is absent from navigation. No delivery service is selected.

### Alternative to compare

Rather than giving every template unrelated settings, define a small number of delivery types with common controls, reusable profiles and optional layouts. This may keep authoring consistent as more templates are added. Conversely, a rigid common model could make unusual storytelling difficult.

A small experiment with Art can help decide how much structure is useful. First describe a few actual sections and the settings an author would want to change; let the template boundaries and markup follow those examples.

No template syntax, compiler implementation or deployment work is authorised by recording this proposal.


## Foundation scope — 2026-10-20

The limited [[Managed EPUB Foundation]] milestone now authorises planning around actual PRIME and chat passages. It does not settle a general authoring representation, storyboard editor, template language or Obsidian dependency. Obsidian remains the present workshop; concrete content/settings fixtures may inform a later choice. Earlier compiler/editor proposals in this note remain proposals.
