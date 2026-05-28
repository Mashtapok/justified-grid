export function measureSync<T>(name: string, work: () => T): T {
  if (!import.meta.env.DEV || typeof performance === 'undefined') {
    return work();
  }

  const start = `${name}:start`;
  const end = `${name}:end`;
  performance.mark(start);
  const result = work();
  performance.mark(end);
  performance.measure(name, start, end);
  performance.clearMarks(start);
  performance.clearMarks(end);
  return result;
}
