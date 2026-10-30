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
  const region = document.createElement('div'); region.className = 'analytics-privacy';
  const change = document.createElement('button'); change.type = 'button'; change.id = 'analytics-privacy-button';
  change.setAttribute('aria-label', 'Privacy and analytics settings'); change.title = 'Privacy and analytics settings';
  change.setAttribute('aria-controls', 'analytics-consent-panel'); change.setAttribute('aria-expanded', 'false');
  change.setAttribute('aria-haspopup', 'dialog');
  change.innerHTML = '<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false" fill="none" stroke="currentColor" stroke-width="1.8"><circle cx="16" cy="16" r="12"/><circle cx="11" cy="11" r="2"/><circle cx="21" cy="12" r="1.5"/><circle cx="13" cy="22" r="1.5"/><circle cx="22" cy="21" r="2"/></svg>';
  const tooltip = document.createElement('span'); tooltip.className = 'analytics-privacy-label';
  tooltip.textContent = 'Privacy and analytics settings'; tooltip.setAttribute('aria-hidden', 'true');
  const details = document.createElement('section'); details.id = 'analytics-consent-panel'; details.hidden = true;
  details.setAttribute('role', 'dialog'); details.setAttribute('aria-modal', 'false');
  details.setAttribute('aria-labelledby', 'analytics-consent-title');
  details.setAttribute('aria-describedby', 'analytics-consent-choice');
  const heading = document.createElement('h2'); heading.id = 'analytics-consent-title'; heading.tabIndex = -1; heading.textContent = 'Your privacy';
  const dismiss = document.createElement('button'); dismiss.type = 'button'; dismiss.className = 'analytics-consent-close';
  dismiss.textContent = '×'; dismiss.setAttribute('aria-label', 'Close privacy settings without changing consent');
  const status = document.createElement('p'); status.id = 'analytics-consent-choice'; status.setAttribute('role', 'status');
  const text = document.createElement('p');
  text.textContent = 'Allow Google Analytics to measure visits and story playback? It cannot tell whether you read the words. Reading positions are saved independently. You can change your choice here anytime.';
  const accept = document.createElement('button'); accept.type = 'button'; accept.textContent = 'Accept analytics';
  const decline = document.createElement('button'); decline.type = 'button'; decline.textContent = 'Decline analytics';
  const actions = document.createElement('div'); actions.className = 'analytics-consent-actions'; actions.append(accept, decline);
  details.append(heading, dismiss, status, text, actions); region.append(change, tooltip, details);
  document.body.prepend(region); document.body.classList.add('has-analytics-consent');
  function close(returnFocus = true) {
    details.hidden = true; change.setAttribute('aria-expanded', 'false');
    if (returnFocus) change.focus({preventScroll: true});
  }
  function open(focus = true) {
    details.hidden = false; change.setAttribute('aria-expanded', 'true');
    if (focus) heading.focus({preventScroll: true});
  }
  dismiss.addEventListener('click', () => close());
  change.addEventListener('click', () => details.hidden ? open() : close());
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape' && !details.hidden && (region.contains(document.activeElement) || document.activeElement === document.body)) {
      event.preventDefault(); event.stopPropagation(); close();
    }
  });
  document.addEventListener('pointerdown', event => {
    if (!details.hidden && !region.contains(event.target)) close(false);
  });
  document.addEventListener('focusin', event => {
    if (!details.hidden && !region.contains(event.target)) close(false);
  });
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
  }
  function choose(value) {
    setState({ analyticsConsent: value }); refresh(); close();
  }
  accept.addEventListener('click', () => choose('accepted'));
  decline.addEventListener('click', () => choose('declined'));
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
  if (current === null) open(false);
  return measurements;
}
module.exports = { createWebAnalytics, websiteChoice };
