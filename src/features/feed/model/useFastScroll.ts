import { useCallback, useEffect, useMemo, useRef, useState, type RefObject } from 'react';

const ENTER_FAST_THRESHOLD_PX_MS = 10;
const EXIT_FAST_THRESHOLD_PX_MS = 5;
const VELOCITY_WINDOW_MS = 150;
const CATCH_UP_DELAY_MS = 150;

interface UseFastScrollParams {
  scrollRef: RefObject<HTMLElement | null>;
  visibleItemIds: ReadonlyArray<string>;
}

export interface UseFastScrollResult {
  isFastScrolling: boolean;
  shouldRenderPlainPlaceholder: (id: string) => boolean;
}

/**
 * Tracks scroller velocity with hysteresis and freezes the set of currently
 * visible item ids when the user enters a fast-scroll phase.
 *
 * Items that enter during the flick stay as plain placeholders until scrolling settles.
 */
export function useFastScroll({
  scrollRef,
  visibleItemIds,
}: UseFastScrollParams): UseFastScrollResult {
  const [isFastScrolling, setIsFastScrolling] = useState(false);
  const snapshotRef = useRef<Set<string>>(new Set());
  const visibleSetRef = useRef<Set<string>>(new Set());

  const visibleSet = useMemo(() => new Set(visibleItemIds), [visibleItemIds]);

  useEffect(() => {
    visibleSetRef.current = visibleSet;
    if (!isFastScrolling) {
      return;
    }
    for (const id of snapshotRef.current) {
      if (!visibleSet.has(id)) {
        snapshotRef.current.delete(id);
      }
    }
  }, [isFastScrolling, visibleSet]);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }

    let isFast = false;
    let catchUpTimer: number | undefined;
    const samples: Array<{ position: number; timestamp: number }> = [
      { position: element.scrollTop, timestamp: performance.now() },
    ];

    const updateFastFlag = (next: boolean) => {
      if (isFast === next) {
        return;
      }
      isFast = next;
      if (next) {
        snapshotRef.current = new Set(visibleSetRef.current);
      } else {
        snapshotRef.current.clear();
      }
      setIsFastScrolling(next);
    };

    const catchUp = () => {
      samples.length = 0;
      samples.push({ position: element.scrollTop, timestamp: performance.now() });
      updateFastFlag(false);
    };

    const onScroll = () => {
      const now = performance.now();
      samples.push({ position: element.scrollTop, timestamp: now });

      const cutoff = now - VELOCITY_WINDOW_MS;
      while (samples.length > 0 && samples[0]!.timestamp < cutoff) {
        samples.shift();
      }

      let velocity = 0;
      if (samples.length >= 2) {
        const first = samples[0]!;
        const last = samples[samples.length - 1]!;
        const elapsed = last.timestamp - first.timestamp;
        if (elapsed > 0) {
          velocity = Math.abs(last.position - first.position) / elapsed;
        }
      }

      window.clearTimeout(catchUpTimer);

      if (!isFast && velocity > ENTER_FAST_THRESHOLD_PX_MS) {
        updateFastFlag(true);
      } else if (isFast && velocity < EXIT_FAST_THRESHOLD_PX_MS) {
        catchUp();
        return;
      }

      catchUpTimer = window.setTimeout(catchUp, CATCH_UP_DELAY_MS);
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
      window.clearTimeout(catchUpTimer);
      if (isFast) {
        snapshotRef.current.clear();
        setIsFastScrolling(false);
      }
    };
  }, [scrollRef]);

  const shouldRenderPlainPlaceholder = useCallback(
    (id: string): boolean => isFastScrolling && !snapshotRef.current.has(id),
    [isFastScrolling],
  );

  return { isFastScrolling, shouldRenderPlainPlaceholder };
}
