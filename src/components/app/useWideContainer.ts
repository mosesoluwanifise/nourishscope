import { useEffect, useState } from 'preact/hooks';

/**
 * Whether an element is at least `minRem` wide, tracked with ResizeObserver.
 * The results area uses it to render either its tables or its cards, never both:
 * with a large upload, rendering both and hiding one would double the DOM on every keystroke.
 * Returns a callback ref to put on the element.
 */
export function useWideContainer(minRem: number) {
  const [element, setElement] = useState<HTMLElement | null>(null);
  const [wide, setWide] = useState(false);

  useEffect(() => {
    if (!element) return;
    const minPx = minRem * parseFloat(getComputedStyle(document.documentElement).fontSize);
    const observer = new ResizeObserver(([entry]) => setWide(entry.contentRect.width >= minPx));
    observer.observe(element);
    return () => observer.disconnect();
  }, [element, minRem]);

  return [setElement, wide] as const;
}
