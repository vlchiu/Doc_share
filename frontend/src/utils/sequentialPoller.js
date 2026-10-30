// One in-flight request per poller, including manual checks.
export function createSequentialPoller({
  task,
  onResult,
  onError,
  intervalMs = 5000,
}) {
  const controller = new AbortController();
  let timer,
    pending,
    stopped = false;
  function stop() {
    stopped = true;
    clearTimeout(timer);
    controller.abort();
  }
  function schedule() {
    if (!stopped) timer = setTimeout(check, intervalMs);
  }
  function check() {
    if (stopped) return Promise.resolve();
    if (pending) return pending;
    clearTimeout(timer);
    pending = Promise.resolve()
      .then(() => {
        if (!stopped) return task(controller.signal);
      })
      .then((result) => {
        if (!stopped && onResult(result) === false) stop();
      })
      .catch((error) => {
        if (!stopped) onError(error);
      })
      .finally(() => {
        pending = null;
        schedule();
      });
    return pending;
  }
  schedule();
  return { check, stop };
}
