/**
 * Abortable clock boundary controlled by Vitest without replacing application code.
 */
export const clock = { suspended: false };

export const sleep = (
  delay: number,
  _value?: unknown,
  options?: { signal?: AbortSignal },
): Promise<void> =>
  new Promise((resolve, reject) => {
    const signal = options?.signal;
    const finish = () => {
      signal?.removeEventListener("abort", cancel);
      resolve();
    };
    const timer = clock.suspended ? undefined : setTimeout(finish, delay);
    const cancel = () => {
      clearTimeout(timer);
      reject(signal?.reason ?? new Error("Clock wait aborted"));
    };
    if (signal?.aborted) {
      cancel();
    } else {
      signal?.addEventListener("abort", cancel, { once: true });
    }
  });
