# Document image sizing — synthetic review

Open this folder with Story Teller 0.17.1, then select **Document media sizing**.
The one beat contains JANUS, JANUS log and annotation, each with:

1. Opening prose, followed by a substantial 1000×1800 portrait relationship graph.
2. Its caption, then the same graph used as a compact inline image and table cell.
3. An eight-stage wide Mermaid diagram with text and its own caption.
4. Concluding prose.

The standalone graph should fill the component width and retain its tall natural
shape, with normal page scrolling. The inline and cell versions stay compact.
The wide diagram keeps readable intrinsic-size text and scrolls horizontally
inside the component. Check at desktop and narrow reader widths. Pause/resume,
Reveal, Replay, Previous and manual table/diagram inspection use the normal reader.
Annotation prose still types; media enters whole. Export and HTTP serving should
give equivalent sizing independently of the workspace.

All words and the programmatically drawn PNG are original synthetic test content.
There are no supporting notes or onward links, and no private story passages.
