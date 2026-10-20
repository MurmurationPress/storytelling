/* Only our host opts in. Static prose/transcript is the publication default. */
(() => {
  const motion=matchMedia('(prefers-reduced-motion: reduce)');
  const update=()=>document.documentElement.classList.toggle('managed-performance',
    !!document.querySelector('meta[name="prime-presentation-v1"]') && !motion.matches);
  update(); motion.addEventListener('change',update);
})();
