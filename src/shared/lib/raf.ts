export function rafBatch<T extends unknown[]>(
  callback: (...values: T) => void,
): (...values: T) => void {
  let frame: number | undefined;
  let latestValues: T;

  return (...values: T) => {
    latestValues = values;
    if (frame !== undefined) {
      return;
    }
    frame = window.requestAnimationFrame(() => {
      frame = undefined;
      callback(...latestValues);
    });
  };
}
