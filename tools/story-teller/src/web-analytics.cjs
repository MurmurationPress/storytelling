'use strict';
const { createReadingMeasurements } = require('./reading-analytics.cjs');
// A host-only CookieScript cookie is intentionally not assumed to exist on subdomains.
function websiteChoice(cookie) {
  const values = cookie.split(';').map(s => s.trim()).filter(s => s.startsWith('CookieScriptConsent='));
  if (!values.length) return null;
  try {
    const choices = values.map(value => {
      const data = JSON.parse(decodeURIComponent(value.slice(value.indexOf('=') + 1)));
      const categories = typeof data.categories === 'string' ? JSON.parse(data.categories) : data.categories;
      if (data.action === 'reject') return 'declined';
      if (data.action !== 'accept' || !Array.isArray(categories)) return null;
      return categories.includes('performance') ? 'accepted' : 'declined';
    });
    return choices.includes('declined') ? 'declined' : choices.every(c => c === 'accepted') ? 'accepted' : null;
  } catch { return null; }
}
function createWebAnalytics({ window, document, config, getState, setState }) {
  if (!config) return { observe() {} };
  let frame, ready = false, queue = [], current;
  const region = document.createElement('section'); region.className = 'analytics-consent';
  region.setAttribute('aria-label', 'Optional analytics');
  const status = document.createElement('p'); status.setAttribute('role', 'status');
  const details = document.createElement('div');
  const text = document.createElement('p');
  text.textContent = 'Allow optional Google Analytics to measure visits and story playback? This cannot tell us whether you read the words. Your reading position is saved independently. You can change this choice at any time.';
  const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = 'Accept analytics';
  const decline = document.createElement('button'); decline.type = 'button'; decline.textContent = 'Decline analytics';
  const change = document.createElement('button'); change.type = 'button'; change.textContent = 'Analytics settings';
  details.append(text, accept, decline); region.append(status, details, change);
  document.querySelector('header').before(region);
  function choice() {
    const site = websiteChoice(document.cookie);
    const local = getState().analyticsConsent;
    // An accessible website rejection always wins; local withdrawal also wins.
    return site === 'declined' || local === 'declined' ? 'declined' : local === 'accepted' || site === 'accepted' ? 'accepted' : null;
  }
  function destroy(clearCookies = false) {
    if (frame) {
      // Disable synchronously before frame teardown so unload/engagement handlers cannot send.
      frame.contentWindow[`ga-disable-${config.measurementId}`] = true;
      frame.remove(); frame = null;
    }
    ready = false; queue = [];
    // Only this reader's host-scoped GA cookies, never the website's consent or position.
    for (const pair of clearCookies ? document.cookie.split(';') : []) {
      const name = pair.trim().split('=')[0];
      if (/^stga_ga(?:_|$)/.test(name)) document.cookie = `${name}=; Max-Age=0; Path=/; SameSite=Lax`;
    }
  }
  function refresh() {
    const next = choice();
    if (next === current) return;
    if (next !== current) {
      current = next;
      if (next !== 'accepted') destroy(true);
      else {
        frame = document.createElement('iframe'); frame.hidden = true; frame.title = 'Optional analytics';
        frame.src = 'analytics.html'; document.body.append(frame);
      }
    }
    status.textContent = `Analytics: ${next || 'not chosen'}.`;
    details.hidden = next !== null;
    change.hidden = next === null;
  }
  function choose(value) {
    setState({ analyticsConsent: value }); refresh(); change.focus();
  }
  accept.addEventListener('click', () => choose('accepted'));
  decline.addEventListener('click', () => choose('declined'));
  change.addEventListener('click', () => { details.hidden = !details.hidden; if (!details.hidden) accept.focus(); });
  window.addEventListener('message', event => {
    if (!frame || event.source !== frame.contentWindow || event.origin !== window.location.origin || event.data?.type !== 'analytics-ready') return;
    refresh(); if (current !== 'accepted' || !frame) return;
    ready = true;
    let referrer = ''; try { referrer = new URL(document.referrer).origin + '/'; } catch { /* Direct visit. */ }
    frame.contentWindow.postMessage({ type: 'analytics-init', id: config.measurementId,
      publicationId: config.publicationId, location: window.location.origin + window.location.pathname, referrer }, window.location.origin);
    for (const event of queue) frame.contentWindow.postMessage(event, window.location.origin);
    queue = [];
  });
  // Recheck on every observation plus focus/storage and while open for shared-cookie withdrawal.
  window.addEventListener('focus', refresh);
  window.addEventListener('storage', refresh);
  let interval = window.setInterval(refresh, 500);
  window.addEventListener('pagehide', () => { destroy(); window.clearInterval(interval); });
  window.addEventListener('pageshow', event => { if (event.persisted) { current = undefined; refresh(); interval = window.setInterval(refresh, 500); } });
  const measurements = createReadingMeasurements({ config,
    load: () => getState().analyticsState,
    save: analyticsState => setState({ analyticsState }),
    allowed: () => { refresh(); return current === 'accepted'; },
    send: (name, params) => {
      const event = { type: 'analytics-event', name, params };
      if (ready && frame) frame.contentWindow.postMessage(event, window.location.origin); else queue.push(event);
    }
  });
  refresh();
  return measurements;
}
module.exports = { createWebAnalytics, websiteChoice };
