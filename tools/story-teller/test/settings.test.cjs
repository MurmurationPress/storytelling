'use strict';
const { test } = require('node:test');
const assert = require('node:assert/strict');
const { parseScene } = require('../src/parser.cjs');
const { planSetting, locateSettingContext } = require('../src/settings.cjs');
const { StoryPlayer } = require('../src/player.cjs');
const fence = String.fromCharCode(96).repeat(3);
const typeout = `${fence}typeout\n@format yaml\n@sound modem\n\nstatus: observing\n@fill none\n${fence}`;
const at = (source, needle) => ({ start: source.indexOf(needle), end: source.indexOf(needle) });
const apply = (source, plan) => plan.edits.toSorted((a, b) => b.start - a.start).reduce((text, edit) => text.slice(0, edit.start) + edit.text + text.slice(edit.end), source);
test('border and fill defaults preserve component data; explicit none and colour settings remain independent', () => {
  const baseline = parseScene(typeout).beats[0].blocks[0];
  assert.equal(baseline.border, null); assert.equal(baseline.fill, null);
  assert.equal(baseline.speed, 30); assert.equal(baseline.sound, 'modem');
  let source = apply(typeout, planSetting(typeout, at(typeout, 'status'), 'border', 'none'));
  source = apply(source, planSetting(source, at(source, 'status'), 'fill', 'none'));
  const parsed = parseScene(source); assert.deepEqual(parsed.diagnostics, []);
  const block = parsed.beats[0].blocks[0];
  assert.equal(block.border, 'none'); assert.equal(block.fill, 'none');
  assert.equal(block.text, baseline.text); assert.equal(block.speed, baseline.speed); assert.equal(block.sound, baseline.sound);
  source = apply(source, planSetting(source, at(source, 'status'), 'fill', 'yellow'));
  source = apply(source, planSetting(source, at(source, 'status'), 'border', 'grey'));
  assert.equal(parseScene(source).beats[0].blocks[0].fill, 'yellow');
  assert.equal(parseScene(source).beats[0].blocks[0].border, 'grey');
  source = apply(source, planSetting(source, at(source, 'status'), 'fill', null));
  source = apply(source, planSetting(source, at(source, 'status'), 'border', null));
  assert.equal(source, typeout);
});
test('type-out settings update and remove only header lines, including speed, format and sound', () => {
  let source = typeout.replaceAll('\n', '\r\n');
  for (const [key, value] of [['speed', '44'], ['format', 'annotation'], ['sound', 'none'], ['fill', 'grey']]) {
    const plan = planSetting(source, at(source, 'status'), key, value);
    assert.equal(plan.error, undefined, `${key}: ${plan.error}`);
    source = apply(source, plan);
  }
  assert.match(source, /@speed 44\r\n/);
  assert.match(source, /status: observing\r\n@fill none\r\n/);
  assert.equal(parseScene(source).beats[0].blocks[0].text, 'status: observing\r\n@fill none\r\n');
  assert.equal(parseScene(source).beats[0].blocks[0].speed, 44);
  source = apply(source, planSetting(source, at(source, 'status'), 'speed', null));
  source = apply(source, planSetting(source, at(source, 'status'), 'sound', null));
  assert.equal(parseScene(source).beats[0].blocks[0].speed, 30);
  assert.equal(parseScene(source).beats[0].blocks[0].sound, 'none');
  assert.doesNotMatch(source, /@speed|@sound/);
  assert.match(planSetting(source, at(source, 'status'), 'format', null).error, /required/);
});
test('invalid and duplicate header settings diagnose their source line; literal body stays literal', () => {
  for (const [line, error] of [['@border blue', /@border requires/], ['@fill green', /@fill requires/], ['@speed 0', /@speed requires/]]) {
    const source = typeout.replace('@sound modem', `@sound modem\n${line}`);
    assert.match(parseScene(source).diagnostics[0], /Line 4:/);
    assert.match(parseScene(source).diagnostics[0], error);
    assert.match(locateSettingContext(source, at(source, 'status')).error, /invalid or incomplete/);
  }
  const duplicate = typeout.replace('@sound modem', '@sound modem\n@fill grey\n@fill yellow');
  assert.match(parseScene(duplicate).diagnostics[0], /Line 5: duplicate @fill/);
  assert.match(planSetting(duplicate, at(duplicate, 'status'), 'fill', 'none').error, /invalid or incomplete/);
  const preceded = 'Opening prose.\n\n' + duplicate;
  assert.match(planSetting(preceded, at(preceded, 'status'), 'fill', 'none').error, /Line 7: duplicate @fill/);
  assert.equal(parseScene(typeout).beats[0].blocks[0].text.includes('@fill none'), true);
  for (const value of ['0', '121', '1.5', 'fast']) assert.match(planSetting(typeout, at(typeout, 'status'), 'speed', value).error, /grapheme/);
});
test('chat header settings preserve messages, local timing and per-message responding', () => {
  const original = `${fence}chat\n@viewer Mara\nMara: First.\n@responding\nIvo: Second.\n${fence}`;
  let source = original;
  for (const [key, value] of [['title', 'Harbour link'], ['pace', 'brisk'], ['ticks', 'on'], ['responding', 'on']]) {
    const plan = planSetting(source, at(source, 'Second'), key, value);
    assert.equal(plan.error, undefined, `${key}: ${plan.error}`);
    source = apply(source, plan);
  }
  const chat = parseScene(source).beats[0].blocks[0];
  assert.equal(chat.title, 'Harbour link'); assert.equal(chat.viewer, 'Mara'); assert.equal(chat.pace, 'brisk'); assert.equal(chat.ticks, true);
  assert.deepEqual(chat.messages.map(message => message.text), ['First.', 'Second.']);
  assert.equal(chat.messages[1].responding, true);
  assert.equal(source.match(/@responding/g).length, 2); // Header cue and original message cue.
  assert.match(planSetting(source, at(source, 'Second'), 'viewer', null).error, /Remove header @responding/);
  source = apply(source, planSetting(source, at(source, 'Second'), 'responding', null));
  assert.equal(source.match(/@responding/g).length, 1);
  source = apply(source, planSetting(source, at(source, 'Second'), 'pace', null));
  assert.equal(parseScene(source).beats[0].blocks[0].pace, 'normal');
  source = apply(source, planSetting(source, at(source, 'Second'), 'ticks', null));
  source = apply(source, planSetting(source, at(source, 'Second'), 'title', null));
  assert.equal(parseScene(source).diagnostics.length, 0);
  const literalDefault = apply(original, planSetting(original, at(original, 'Second'), 'title', 'default'));
  assert.equal(parseScene(literalDefault).beats[0].blocks[0].title, 'default');
  const withTicks = apply(original, planSetting(original, at(original, 'Second'), 'ticks', 'on'));
  assert.match(planSetting(withTicks, at(withTicks, 'Second'), 'viewer', 'Other').error, /invalid/); // Existing message identities are not rewritten.
});
test('settings reject unrelated fences, selections and unsupported values without changing timing or navigation', () => {
  for (const source of ['Text', `${fence}yaml\na: b\n${fence}`, '---\ntitle: draft\n---'])
    assert.match(locateSettingContext(source, { start: 1, end: 1 }).error, /chat or type-out|invalid/);
  assert.match(planSetting(typeout, { start: 0, end: 8 }, 'speed', '60').error, /caret/);
  assert.match(planSetting(typeout, at(typeout, 'status'), 'pace', 'brisk').error, /does not apply/);
  const changed = apply(typeout, planSetting(typeout, at(typeout, 'status'), 'fill', 'yellow'));
  const a = new StoryPlayer(parseScene(typeout));
  const b = new StoryPlayer(parseScene(changed));
  assert.deepEqual(a.steps.map(step => step.delayMs), b.steps.map(step => step.delayMs));
  assert.equal(a.current.blocks[0].sound, b.current.blocks[0].sound);
});
