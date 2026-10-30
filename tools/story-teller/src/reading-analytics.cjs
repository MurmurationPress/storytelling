'use strict';
// Counts observed beat displays, never inferred reading or attention. No source text enters this module.
function createReadingMeasurements({ config, load, save, send, allowed }) {
  function observe(snapshot) {
    if (!config || !allowed() || !snapshot.visible || snapshot.source === 'restore') return;
    const story = config.stories.find(item => item.sceneId === snapshot.sceneId);
    if (!story || !snapshot.count || snapshot.index < 0 || snapshot.index >= snapshot.count) return;
    const state = load() || {};
    let changed = false;
    const key = `${config.publicationId}:${config.revision}`;
    if (state.key !== key) { Object.assign(state, { key, stories: {}, sent: [] }); changed = true; }
    state.stories ||= {}; state.sent ||= [];
    const record = state.stories[story.id] ||= { displayed: [], interacted: [], autoplay: [] };
    const params = { publication_id: config.publicationId, content_version: config.revision, story_id: story.id,
      playback_mode: snapshot.mode, advancement_source: snapshot.source, evidence: 'display_only' };
    function once(name, suffix = '', extra = {}) {
      const id = `${name}:${story.id}:${suffix}`;
      if (state.sent.includes(id)) return;
      changed = true; state.sent.push(id); send(name, { ...params, ...extra });
    }
    once('reading_start');
    if (snapshot.interaction && !record.interacted.includes(snapshot.index)) {
      changed = true; record.interacted.push(snapshot.index);
      once('reading_interaction', String(snapshot.index), { beat_number: snapshot.index + 1, evidence: 'reader_action' });
    }
    if (snapshot.completed && !record.displayed.includes(snapshot.index)) {
      changed = true; record.displayed.push(snapshot.index);
      if (snapshot.mode === 'autoplay') record.autoplay.push(snapshot.index);
    }
    const percent = Math.floor(record.displayed.length / snapshot.count * 100);
    for (const milestone of [25, 50, 75, 100]) if (percent >= milestone)
      once('story_progress', String(milestone), { progress_percent: milestone, interacted_beats: record.interacted.length });
    if (percent === 100) once('story_complete', '', { interacted_beats: record.interacted.length, total_beats: snapshot.count, autoplay_beats: record.autoplay.length });
    const complete = config.stories.every(item => state.sent.includes(`story_complete:${item.id}:`));
    if (complete && !state.sent.includes('publication_complete')) {
      changed = true; state.sent.push('publication_complete');
      send('publication_complete', { publication_id: config.publicationId, content_version: config.revision, playback_mode: snapshot.mode,
        advancement_source: snapshot.source, evidence: 'display_only' });
    }
    if (changed) save(state);
  }
  return { observe };
}
module.exports = { createReadingMeasurements };
