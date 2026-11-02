'use strict';
const { inspectStructure, beatRanges } = require('./structure.cjs');
const { parseScene } = require('./parser.cjs');
const { metadataLine, leadingTimestamp, applyChanges, within } = require('./component-identity.cjs');
function migrateComponentMetadata(source, { scope, associate } = {}) {
  const structure = inspectStructure(source), {lines, spans} = structure;
  const changes = [], warnings = [], cases = [];
  const summary = { converted: 0, alreadyMigrated: 0, skipped: 0, ambiguous: 0 };
  if (structure.frontmatter && !structure.frontmatter.closed) return {text:source,count:0,changes,warnings:[{line:1,message:'unclosed frontmatter; document left unchanged'}],cases,summary};
  const ranges = beatRanges(structure);
  for (const span of spans.filter(s => s.type === 'fence' && s.level === 0 && s.info === 'typeout')) {
    if (!within(lines[span.start].start, lines[span.end - 1].end, scope)) continue;
    const line = span.start + 1, eol = lines[span.start].eol || '\n';
    const snippet = source.slice(lines[span.start].start, lines[span.end - 1].end);
    const parsed = parseScene(snippet), block = parsed.beats[0]?.blocks[0];
    const record = (status, reason) => { summary[status]++; cases.push({line,status,reason}); if(status === 'ambiguous') warnings.push({line,message:reason}); };
    const closing = lines[span.end - 1].text.match(/^ {0,3}(`+|~+)\s*$/);
    if (block?.type !== 'typeout' || parsed.diagnostics.length || !closing || closing[1][0] !== span.token.markup[0] || closing[1].length < span.token.markup.length) {
      record('skipped', 'invalid or unclosed typeout; correct its diagnostics first'); continue;
    }
    const beat = ranges.find(range => span.start >= range.bodyLine && span.start < range.endLine);
    const separator = lines.findIndex((l,i) => i > span.start && i < span.end - 1 && !l.text.trim());
    const bodyStart = separator + 1, bodyEnd = span.end - 1;
    let first = bodyStart; while (first < bodyEnd && !lines[first].text.trim()) first++;
    const proposed = {}, removals = [], conflicts = [];
    const add = (key, value, index) => {
      if ((block[key] !== undefined && block[key] !== value) || proposed[key] !== undefined) {
        conflicts.push(`conflicting ${key} at line ${index + 1}; existing metadata is preserved`); return;
      }
      proposed[key] = value; removals.push(index);
    };
    // A literal YAML body's keys, comments and dates are DATA, never identity.
    if (block.format !== 'yaml') {
      const stamp = leadingTimestamp(lines.slice(bodyStart, bodyEnd));
      if (stamp.warning) conflicts.push(stamp.warning);
      else if (stamp.index !== undefined && !stamp.labelled) add('timestamp', stamp.value, bodyStart + stamp.index);
      for (let i = first; i < bodyEnd; i++) {
        if (!lines[i].text.trim() || removals.includes(i)) continue;
        const field = metadataLine(lines[i].text, {title:true});
        const heading = lines[i].text.match(/^#{1,6} (.+)$/);
        if (field?.labelled && !spans.some(s => s !== span && i >= s.start && i < s.end)) {
          if (i + 1 < bodyEnd && lines[i + 1].text.trim() && !metadataLine(lines[i + 1].text,{title:true})?.labelled) {
            conflicts.push(`leading metadata at line ${i + 1} shares a paragraph with prose; separate it before migrating`); break;
          }
          add(field.key, field.value, i); continue;
        }
        // Matching both an explicit heading in this component and the beat
        // title establishes a duplicate representation, not merely one fence.
        if (i === first && heading && heading[1] === (block.title ?? beat?.title)) { add('title',heading[1],i); continue; }
        break;
      }
    }
    let previous = span.start - 1; while (previous >= (beat?.bodyLine ?? 0) && !lines[previous].text.trim()) previous--;
    const outside = metadataLine(lines[previous]?.text || '');
    if (outside?.key === 'timestamp' && !spans.some(s => previous >= s.start && previous < s.end)) {
      const isolated = previous === beat?.bodyLine || previous - 1 === beat?.titleLine || !lines[previous - 1]?.text.trim();
      if (!isolated || (!outside.labelled && associate !== lines[span.start].start)) {
        conflicts.push(`timestamp candidate at line ${previous + 1} is outside the component; select this component and explicitly associate it, or move the timestamp manually`);
      } else if (!within(lines[previous].start, lines[previous].end, scope)) {
        conflicts.push(`timestamp at line ${previous + 1} is outside the selection; include it before migrating`);
      } else add('timestamp',outside.value,previous);
    }
    if (associate === lines[span.start].start) {
      if (!beat?.title) conflicts.push('this beat has no title to associate');
      else if (block.title !== undefined && block.title !== beat.title) conflicts.push('explicit component title conflicts with the beat title; it will not be overwritten');
      else if (proposed.title !== undefined && proposed.title !== beat.title) conflicts.push('component-owned title differs from the selected beat title');
      else proposed.title = beat.title;
    } else if (block.title === undefined && block.timestamp === undefined && proposed.title === undefined && block.identity !== 'component' && beat?.title) {
      conflicts.push('beat title ownership is unproven; place the caret in this component and choose “Use beat title” to associate it explicitly');
    }
    if (conflicts.length) { record('ambiguous',conflicts.join('; ')); continue; }
    const inside = removals.filter(index => index >= bodyStart);
    if (inside.length && !lines.slice(bodyStart,bodyEnd).some((l,i)=>l.text.trim() && !inside.includes(bodyStart+i))) {
      record('skipped','metadata removal would leave an empty body; keep a nonempty component body'); continue;
    }
    const fields = Object.entries(proposed).filter(([key]) => block[key] === undefined);
    if (!fields.length && !removals.length) {
      record(block.title !== undefined || block.timestamp !== undefined || block.identity === 'component' ? 'alreadyMigrated' : 'skipped', 'no safely attributable metadata to move'); continue;
    }
    // Explicit component identity also prevents a timestamp-only migrated fence
    // from acquiring an unrelated beat heading on later edits.
    const header = (block.identity ? '' : `@identity component${eol}`) + fields.map(([key,value]) => `@${key} ${value}${eol}`).join('');
    const local = [{start:lines[separator].start,end:lines[separator].start,text:header}];
    for (const index of [...new Set(inside)]) local.push({start:lines[index].start,end:lines[index].end,text:''});
    // Store non-overlapping precise edits; beat comments and boundaries are never edits.
    changes.push(...local);
    for (const index of [...new Set(removals.filter(i=>i < span.start))]) changes.push({start:lines[index].start,end:lines[index].end,text:''});
    record('converted','move component-owned metadata into its header; preserve beat navigation metadata');
  }
  return {text:applyChanges(source,changes),count:summary.converted,changes,warnings,cases,summary};
}
module.exports = { migrateComponentMetadata };
