/**
 * On screens under 1024px the inputs come first, so results can be far below.
 * While the whole results section is below the screen, a bar at the bottom
 * offers a one-tap way to it. IntersectionObserver, not scroll listeners.
 */
import { useEffect, useRef, useState } from 'preact/hooks';
import { STRATEGY_COPY } from '../../lib/copy';
import type { Strategy } from '../../lib/calc';
import { formatInt } from '../../lib/format';

interface Props {
  /** The results section to watch and jump to. */
  targetId: string;
  /** The heading inside it that receives focus. */
  headingId: string;
  strategy: Strategy;
  reached: number;
}

const NARROW = '(max-width: 63.99rem)';

export default function ResultsBar({ targetId, headingId, strategy, reached }: Props) {
  const [below, setBelow] = useState(false);
  const [narrow, setNarrow] = useState(() => window.matchMedia(NARROW).matches);
  const bar = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const query = window.matchMedia(NARROW);
    const onChange = () => setNarrow(query.matches);
    query.addEventListener('change', onChange);
    return () => query.removeEventListener('change', onChange);
  }, []);

  useEffect(() => {
    const target = document.getElementById(targetId);
    if (!target) return;
    const observer = new IntersectionObserver(([entry]) => {
      // Not intersecting and starting below the top edge: results are further down the page.
      setBelow(!entry.isIntersecting && entry.boundingClientRect.top > 0);
    });
    observer.observe(target);
    return () => observer.disconnect();
  }, [targetId]);

  const visible = narrow && below;

  // Keep focused fields and anchor jumps clear of the bar while it is showing.
  useEffect(() => {
    const root = document.documentElement;
    if (visible && bar.current) root.style.scrollPaddingBottom = `${bar.current.offsetHeight}px`;
    return () => { root.style.scrollPaddingBottom = ''; };
  }, [visible]);

  if (!visible) return null;
  return (
    <div class="results-bar" ref={bar}>
      <p>
        <span class="results-bar__text">{STRATEGY_COPY[strategy].name}: {formatInt(reached)} households reached.</span>{' '}
        <a href={`#${targetId}`} class="button button--small" onClick={(e) => {
          e.preventDefault();
          const heading = document.getElementById(headingId);
          heading?.scrollIntoView();
          heading?.focus();
        }}>See results</a>
      </p>
    </div>
  );
}
