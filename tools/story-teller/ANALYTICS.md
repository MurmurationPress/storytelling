# Optional reader analytics

Analytics is implemented in the reusable static exporter/runtime. Ordinary exports
have no analytics configuration, frame, controls, tag load or external requests.
No source wording or authoring files need editing. `manifest.webAnalytics` may
configure an author export; the publication CLI accepts the same object as
`target.analytics` (takes precedence). Example shape:

```json
{
  "measurementId": "G-EXISTING-ID",
  "publicationId": "stable-publication-slug",
  "stories": [{"id": "stable-story-id", "sceneId": "existing-scene-id"}]
}
```

Use an actual GA4 measurement ID. Configuration is validated, not guessed. List
actual story scenes only, excluding covers, introductions and back matter. This
version maps one exported scene to one story. Story IDs survive title/wording edits.
`skip-analytics-target.json` uses the existing GA4 ID `G-HMESC2B6CC`, publication
ID `curious-adventures-of-skip`, and the 13 story UUIDs already in Stories-Told;
the Introduction is excluded. This editorial analytics mapping does not change
scene identity/order or the saved-position publication key.

## Consent and privacy

Inspected 30 October 2026: both [main website](https://murmurationpress.co.uk/)
and [Ghost origin](https://murmuration-press.ghost.io/) contain the same GA4 ID
and CookieScript installation `e73906e0269047e8af5ca26a8823bcb9`. The website
loads gtag immediately with denied consent defaults, which is insufficient for
this reader's zero-request requirement. Its code is not copied into the reader.
A fresh Chrome context accepted Performance on the main website through
CookieScript's API. The resulting `CookieScriptConsent` cookie was host-only,
secure, path `/`, SameSite Lax; it was absent from `document.cookie` after
navigation to `https://read.murmurationpress.co.uk/skip/`. GA cookies were visible
there, but **GA cookies are not evidence of consent**. No website changes were made.
CookieScript documents [subdomain sharing as an explicit setting](https://help.cookie-script.com/en/articles/30175-setting-up-subdomains).

The reader therefore provides its own accessible Accept/Decline/settings controls,
with a plain explanation and no blocking modal. It remembers its choice in the
existing publication preference object. No choice means no analytics. The reader
also conservatively understands a readable CookieScript `performance` choice if
one becomes available: a site rejection or reader withdrawal always wins. A local
acceptance cannot override a readable site rejection. Controls remain available;
if a shared site rejection wins, change that choice on the website first.
The current host-only website choice cannot be monitored from this reader.
Preview, production, other browsers/devices do not share local choices.

Only accepted consent creates a local analytics iframe, which then loads gtag.
Unset/declined consent loads neither the iframe nor Google scripts, and sends no
consent-mode/cookieless pings. Withdrawal sets the GA disable flag synchronously,
removes the frame (terminating tag execution/timers), drops queued events and
expires only the reader's host-scoped `stga_ga*` cookies. It never sends a denied
consent update. Requests already dispatched before withdrawal cannot be recalled.
Cross-tab local consent changes and accessible shared-cookie changes are checked.
Storage-disabled reading works; consent then lasts only in memory for that page.

The isolated frame has a separate restricted CSP; the main reader allows only a
same-origin frame, without adding Google to its script/connect policy. GA uses
host-only, prefixed cookies (reader visitor IDs are separate from website visitor
IDs), with Google signals and ad personalization disabled.
No user IDs, titles, manuscript text, beat raw text, supporting content or source
paths enter the event API. Page location contains origin/path only (no query or
fragment); referrer contains origin only. This preserves normal referral-domain
reporting while deliberately omitting URL campaign parameters and referral paths,
which can contain personal data. GA still processes normal connection/device
metadata and its own consented identifiers. Disable unwanted enhanced measurement
in the GA web stream. Ignore any automatic GA `scroll` events: frame scrolling
is not story progress. The frame contains no story DOM, links or forms to observe.

## Event contract

All measurements are observations of presentation/actions, **not reading, attention,
understanding or enjoyment**. No dwell-time claim or conversion to “readers who
finished” is justified. Story percentages count unique fully displayed beats,
not words or elapsed time. A long and a short beat have equal weight.

| Event | What it demonstrates | Limits |
| --- | --- | --- |
| `page_view` and standard GA session events | A consented reader page visit | Declined/unset visits are absent; no virtual page view per beat |
| `reading_start` | First visible content in a configured story after navigation/play/reveal | Once per story/content version/browser preference record; opening/restoring alone is excluded |
| `reading_interaction` | An explicit content action associated with a visible beat | Once per beat; a click/play/selection/reveal is not proof of reading |
| `story_progress` | 25/50/75/100% of that story's beats fully displayed while consented | Unique coverage, not furthest position; autoplay/reveal/Previous may display content |
| `story_complete` | Every beat of the story fully displayed while consented | `evidence=display_only`, including autoplay; not a reading-completion assertion |
| `publication_complete` | All configured stories have emitted display completion | Excludes introduction/matter; remains `display_only` |

Custom parameters: `publication_id`, `story_id` (except publication completion),
`content_version` (source digest), `playback_mode` (`manual` or `autoplay`),
`advancement_source` (`scene_selection`, `next`, `previous`, `restart`, `play`,
`replay`, `reveal`), `evidence` (`display_only` or `reader_action`).
Progress adds `progress_percent`, `interacted_beats`; story completion adds
`interacted_beats`, `total_beats`, `autoplay_beats`; interaction adds `beat_number`.
`autoplay` means timed playback was requested for that beat, even when initiated by a
reader click. `manual` covers static navigation/reveal. Advancement source records
the action initiating the current beat, not a fictitious new interaction for
each timed paragraph/chat message. Pause, speed, sound and supporting panels do
not themselves create reading interactions. A resumed playback Play is explicit.

Use `reading_interaction` + `evidence=reader_action` to see explicit actions;
use `playback_mode=autoplay` and `autoplay_beats` to identify timed exposure.
Completion events always have display-only evidence, even if every beat had an
action. `interacted_beats` is a count, not a claim that all words were read.

Coverage and sent milestone IDs live inside the **existing** `story-teller:BOOK_ID`
preference record, alongside position, under `analyticsState`. No second position
store is introduced. Rerenders, replay, reverse navigation, reloads and restored
positions do not re-emit those milestones. Restore never fills in skipped beats.
No activity is collected before consent or backfilled on acceptance. A pending
in-memory event can be lost on withdrawal/tag failure; this intentionally favors
undercounting. Cleared/unavailable storage, concurrent tabs and different devices
prevent exactly-once guarantees across those boundaries. Local sent records are
not GA delivery receipts. Source changes change `content_version` and begin new
coverage on the next qualifying action; do not aggregate versions as unique readers.

## Continue reading and updates

The saved-position implementation is unchanged: reopening restores the saved
scene and best matching beat raw text (nearest index for duplicates), otherwise
clamps the old index into the edited scene; playback opens ready. Restart resets
the current scene to its first beat. Removed scenes fall back to the beginning.
The current publication storage ID is an order-dependent digest: routine text
updates retain it; adding/removing/reordering document IDs can reset preferences
and position. This limitation predates analytics. Preserve IDs/order for routine
updates. Analytics's stable publication ID does not replace the position key.

## Finding the data in GA4

1. In the GA4 property containing `G-HMESC2B6CC`, use **Reports → Acquisition →
   Traffic acquisition** for sessions and Session source/medium; **User acquisition**
   for first-user origins. Filter Hostname to `read.murmurationpress.co.uk`.
   Reports → Engagement → Pages and screens shows consented reader visits.
   GA can exclude same-root-domain self referrals; use Explore with **Page referrer**
   to inspect website-to-reader handoffs rather than assuming they appear as
   acquisition referrals.
2. Reports → Engagement → Events: find `reading_start`, `story_progress`,
   `story_complete`, `publication_complete`, and `reading_interaction` by name.
   These are custom events, not recommended ecommerce/conversion events.
3. Admin → Data display → Custom definitions: add event-scoped dimensions for
   `publication_id`, `story_id`, `playback_mode`, `advancement_source`, `evidence`,
   `progress_percent`, and (if comparing updates) `content_version`. Add custom
   metrics for `interacted_beats`, `total_beats`, `autoplay_beats` if needed.
   Registration affects subsequent reporting; standard report availability can lag.
4. Explore → Free form: rows publication/story, columns progress percentage or
   playback mode, values Event count/Total users; filter Event name. Compare
   `reading_interaction` (`reader_action`) with completions (`display_only`).
   Event count is deduplicated browser/version observations, not unique humans.
5. Realtime can confirm a consented production visit after release. DebugView
   needs a deliberately enabled debug session; the reader does not enable it by
   default. Do not mark display completion as a verified “read whole book” key event.

GA dashboard access/ingestion has not been verified. Browser validation intercepts
collection requests to avoid sending test data into the production property.

## Preparing Skip for review

Use `AUTHOR-PUBLISHING.md` with `--target scripts/skip-analytics-target.json` and
explicit current source/renderer commits. This passes analytics as an export option;
it does not edit the archived author project. Prepare creates the retained static
artifact, private source snapshot, inventories and upload ZIP. Merge and production
deployment require review and remain separate actions.
