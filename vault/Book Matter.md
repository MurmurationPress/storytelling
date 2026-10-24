# Book Matter

Ted requested front/back matter and explicit project scaffolding on the merged
web-reader baseline. This new increment awaits his acceptance. Acceptance of
prior authoring, import, notes and web-reader work does not establish acceptance
or actual-device verification of this increment.

New imports and the explicit upgrade command share scaffolding logic. Existing
files, including empty documents, remain authoritative. Matter has stable
manifest identities separate from numbered scenes and sits before/after the
Part–Scene sequence. Supporting Content remains outside the reading order.
Opening alone never writes scaffolding. Static matter uses fully displayed safe
Markdown and explicit Continue/Previous; scene turns retain the existing autoplay
preference. Empty pages remain editable in the outline but are omitted from web
Contents/reading order. This adds no start screen or progress saving.

## Source findings

Read-only inspection: PrimeTrilogy `5bbe44d242a2f2db56ff75ab1ef864e8b564fb20`,
Books/CONSTRAINT.md and companion folder. Inventory: 38 scene, 6 part, 3
scene-draft; no publication-matter classifications found. The book note has
publication metadata but no body. MWC source
`08ec248d6bdd1cef33cd1eab255df24430a8e9fa` and installed plugin 0.20.0 recognise
book/part/scene; no publication-matter classification was discovered.

Consequently `type: front-matter|back-matter` with book parent and the selected
order key is a newly supported explicit convention, not a claim that MWC already
produces it. Names never classify notes. Classified bodies take precedence over
metadata synthesis to avoid duplicate title/copyright text. Original source YAML
and content stay archived. Unclassified book body is archived and flagged, not
guessed to be publication matter. Only fictional fixtures are committed.

Otherwise scalar title/subtitle/author, series/book, publisher/imprint,
copyright/rights, language and explicit ISBN fields populate new front matter.
Missing facts/legal terms are not invented. Repeated literal values/rights are
omitted; workshop fields remain archived. Older imports can use retained book
metadata but cannot recover previously excluded matter automatically. Upgrade
does not follow absolute provenance paths back into a private vault.

## Configuration and limits

Manifest version 1 gains optional matter.front/back identity/file entries and
sourceFile templates retained by new imports. Optional settings.supportingContent
selects a portable folder; omission keeps Supporting Content. Scene identities,
labels and part order stay unchanged. The shared safe Markdown/media/note pipeline
serves both preview and web output. Empty/no-scene books do not fabricate scenes.

Future authoring representation remains open. No reimport, legal inference,
filename-based classification, EPUB export or new component is introduced.
See tools/story-teller/README.md and RESULTS.md for mappings, evidence and limits.
