/* The host adds this opt-in marker through EPUB.js's pre-serialization hook.
   Ordinary readers do not get it and retain readable explicit-start output. */
if (document.querySelector('meta[name="prime-presentation-v1"]') &&
    !matchMedia('(prefers-reduced-motion: reduce)').matches) {
  document.documentElement.classList.add('prime-pending');
}
