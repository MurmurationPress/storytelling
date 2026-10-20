/* Before body parsing: no complete-text flash when scripting runs. */
if (!window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('arrival-script');
}
