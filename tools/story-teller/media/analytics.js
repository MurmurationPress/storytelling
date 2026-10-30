'use strict';
// This document exists only after consent. Removing its iframe terminates the tag and timers.
let initialized = false;
window.dataLayer = [];
function gtag() { window.dataLayer.push(arguments); }
window.addEventListener('message', event => {
  if (event.source !== parent || event.origin !== location.origin) return;
  const data = event.data;
  if (data?.type === 'analytics-init' && !initialized && /^G-[A-Z0-9]+$/.test(data.id)) {
    initialized = true;
    gtag('consent', 'default', { analytics_storage: 'granted', ad_storage: 'denied', ad_user_data: 'denied', ad_personalization: 'denied' });
    gtag('js', new Date());
    gtag('config', data.id, { page_location: data.location, page_referrer: data.referrer,
      page_title: data.publicationId, cookie_domain: 'none', cookie_prefix: 'stga',
      allow_google_signals: false, allow_ad_personalization_signals: false, send_page_view: true });
    const script = document.createElement('script'); script.async = true;
    script.src = `https://www.googletagmanager.com/gtag/js?id=${data.id}`; document.head.append(script);
  } else if (initialized && data?.type === 'analytics-event') gtag('event', data.name, data.params);
});
parent.postMessage({ type: 'analytics-ready' }, location.origin);
