import { useRef, useState } from 'react';

export function useLayoutDensity(initialTargetItemsPerRow = 4) {
  const [targetItemsPerRow, setTargetItemsPerRow] = useState(initialTargetItemsPerRow);
  const [animateLayout, setAnimateLayout] = useState(false);
  const animationTimerRef = useRef<number | undefined>(undefined);

  const updateDensity = (next: number) => {
    setAnimateLayout(true);
    setTargetItemsPerRow(next);

    window.clearTimeout(animationTimerRef.current);
    animationTimerRef.current = window.setTimeout(() => {
      setAnimateLayout(false);
    }, 350);
  };

  return { targetItemsPerRow, animateLayout, updateDensity, animationTimerRef };
}
