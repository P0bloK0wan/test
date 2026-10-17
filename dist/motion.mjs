/** Call after rendering main; dispose the previous instance before rerendering.
 * No content is hidden while waiting for an observer. Missing APIs leave it visible.
 */
export function initMotion(root = document) {
  const doc = root.ownerDocument || root;
  const view = doc.defaultView;
  if (!view?.matchMedia || !doc.documentElement) return () => {};

  const preference = view.matchMedia('(prefers-reduced-motion: reduce)');
  const host = doc.documentElement;
  const marked = new Set();
  let observer;
  let disposed = false;

  const mark = (element, name) => {
    element.classList.add(name);
    marked.add(element);
  };
  const reset = () => {
    observer?.disconnect();
    observer = undefined;
    host.classList.remove('motion-enabled');
    for (const element of marked) element.classList.remove('motion-hero', 'motion-reveal');
    marked.clear();
  };
  const start = () => {
    reset();
    if (disposed || preference.matches) return;
    host.classList.add('motion-enabled');
    root.querySelectorAll('.hero-copy').forEach(element => mark(element, 'motion-hero'));

    // Observe once, animate only on entry, and never gate visibility on JS.
    if (typeof view.IntersectionObserver !== 'function') return;
    try {
      observer = new view.IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          if (!preference.matches && !disposed && !entry.target.contains(doc.activeElement)) {
            mark(entry.target, 'motion-reveal');
          }
          observer?.unobserve(entry.target);
        }
      }, { threshold: 0, rootMargin: '0px 0px -24px 0px' });
      root.querySelectorAll('.shelf, .feature-band').forEach(element => observer.observe(element));
    } catch {
      observer?.disconnect();
      observer = undefined;
    }
  };

  // Changing the OS setting immediately removes active animation classes.
  const onChange = () => {
    if (preference.matches) reset();
    else start();
  };
  if (preference.addEventListener) preference.addEventListener('change', onChange);
  else preference.addListener?.(onChange);
  start();

  return () => {
    disposed = true;
    if (preference.removeEventListener) preference.removeEventListener('change', onChange);
    else preference.removeListener?.(onChange);
    reset();
  };
}
