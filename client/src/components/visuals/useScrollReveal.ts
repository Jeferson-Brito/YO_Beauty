import { useEffect, type RefObject } from 'react';

export function useScrollReveal(root: RefObject<HTMLDivElement | null>, route: string) {
  useEffect(() => {
    const node = root.current;
    if (!node || !('IntersectionObserver' in window) || window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
    const observed = new WeakSet<Element>();
    const observer = new IntersectionObserver(entries => {
      for (const entry of entries) if (entry.isIntersecting) {
        entry.target.classList.add('is-visible');
        observer.unobserve(entry.target);
      }
    }, { threshold: 0.08 });
    function scan() {
      node?.querySelectorAll('[data-reveal]').forEach(element => {
        if (observed.has(element)) return;
        observed.add(element);
        element.classList.add('reveal-pending');
        observer.observe(element);
      });
    }
    scan();
    const mutations = new MutationObserver(scan);
    mutations.observe(node, { childList: true, subtree: true });
    return () => { observer.disconnect(); mutations.disconnect(); };
  }, [root, route]);
}
