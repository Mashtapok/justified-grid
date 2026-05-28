import { useEffect, useRef, useState } from 'react';
import { rafBatch } from '@/shared/lib/raf';

interface ViewportMetrics {
  top: number;
  height: number;
}

export function useFeedViewport() {
  const scrollRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState(0);
  const [viewport, setViewport] = useState<ViewportMetrics>({ top: 0, height: 0 });

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }

    const onResize = rafBatch((width: number, height: number) => {
      setContainerWidth(width);
      setViewport((previous) => ({ top: previous.top, height }));
    });
    const observer = new ResizeObserver(([entry]) => {
      if (entry !== undefined) {
        onResize(entry.contentRect.width, entry.contentRect.height);
      }
    });
    observer.observe(element);
    return () => {
      observer.disconnect();
    };
  }, []);

  useEffect(() => {
    const element = scrollRef.current;
    if (element === null) {
      return;
    }

    const onViewportChange = rafBatch((top: number) => {
      setViewport((previous) => ({ ...previous, top }));
    });

    const onScroll = () => {
      onViewportChange(element.scrollTop);
    };

    element.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      element.removeEventListener('scroll', onScroll);
    };
  }, []);

  return { scrollRef, containerWidth, viewport };
}
