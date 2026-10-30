import { useCallback, useEffect, useRef } from "react";
export default function useLatestRequest() {
  const active = useRef(new Map());
  useEffect(() => {
    const requests = active.current;
    return () => {
      requests.forEach((controller) => controller.abort());
      requests.clear();
    };
  }, []);
  return useCallback((key) => {
    active.current.get(key)?.abort();
    const controller = new AbortController();
    active.current.set(key, controller);
    return controller.signal;
  }, []);
}
