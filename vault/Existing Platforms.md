---
type: research-note
status: initial-review
date: 2026-10-20
---

# Existing Platforms

## Question and scope

Can an existing platform deliver the experience before we build our own? Ted clarified that the publication should be a managed, sequential app experience. The wiki reading model has been dropped; component assembly remains a useful source model.

This is an initial review of official product documentation, checked 20 October 2026. No application has been installed or tested. These are candidates, not a complete market census or proof of suitability. Prices, licensing detail and procurement have not been assessed.

## PubCoder — closest documented book-shaped candidate

Official documentation describes paginated HTML5 publication, configurable navigation and a setting to hide the page list specifically to prevent random page jumping. Its feature page includes video, audio and custom HTML/CSS/JavaScript. Authoring downloads are listed for macOS and Windows; no native Linux download is listed.

**Assessment:** test first as a reference for the reader/container. Our authored chat behaviours, simulation integration, prose reflow and Markdown/template workflow still need investigation. Hidden navigation controls are not proof that future content cannot be reached through every route.

Sources:
- [HTML5 reader and navigation controls](https://docs.pubcoder.com/pubcoder-html5.html)
- [Features and custom code](https://www.pubcoder.com/features)
- [Authoring downloads](https://www.pubcoder.com/download)

## Kotobee — enhanced ebook and app candidate

The official feature list includes video/audio, book widgets, page transitions, reading-interface customisation and custom HTML/CSS/JavaScript, plus mobile-app exports.

**Assessment:** a plausible publication container, but we have not verified sufficiently controlled sequence, authored chat timing, Obsidian integration or native Linux authoring. The documentation reviewed prominently covers education/training as well as publishing; test the actual fiction reading experience rather than inferring suitability from feature names.

Source:
- [Kotobee Author features](https://www.kotobee.com/en/products/author/features)

## Ren'Py — scripted story-app candidate

The official site describes a scriptable visual-novel engine using words, images and sound, with Linux support and free commercial use. Web output is marked beta; its web documentation records limitations including video restricted to cutscene playback.

**Assessment:** useful to compare author-controlled pacing and dialogue performance. A paginated prose/comic container and embedded web simulation are not established fits and could require substantial custom work. Branching is not a requirement of our story merely because the engine permits it.

Sources:
- [Ren'Py overview](https://www.renpy.org/)
- [Web output and limitations](https://www.renpy.org/doc/html/web.html)

## What we should compare using the same small sequence

- Prose or comic page followed by video, then authored chat or an interactive surface.
- Author-controlled order and revelation; distinguish ordinary navigation control from strong prevention of access to future content.
- Optional aside with an exact return to the story.
- Typing indicators, timed silence and contrasting PRIME/JANUS profiles.
- Simulation touch gestures alongside page navigation.
- Comfortable prose at reader-selected text sizes.
- Authoring from portable source and practical use from Ted's Linux environment.
- Portable output, preview workflow and ability to maintain the publication.

These are evaluation questions, not a new implementation backlog.

## Initial conclusion

Close existing platforms do exist. PubCoder is the strongest documented match found for the page-based container; Ren'Py is worth examining for scripted performance. Kotobee is a further comparison. There is not yet evidence that our complete experience or desired authoring workflow requires a new platform.

Next useful evidence: examine a suitable existing sample or run a small trial before deciding whether to adopt, extend or build. Do not purchase or commit to a platform based on this note alone.

See [[Reading Experience]], [[Authoring and Storyboarding]] and [[Art Prototype]].
