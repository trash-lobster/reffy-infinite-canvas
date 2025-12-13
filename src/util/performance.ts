export async function performanceTest<T extends any[], U>(
  testSubject: string,
  fn: (...args: T) => U | Promise<U>,
  args: T,
) {
  const performanceStart = performance.now();
  const result = await fn(...args);
  console.log(`${testSubject} took ${performance.now() - performanceStart}ms`);
  return result;
}
