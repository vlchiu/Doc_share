import { useCallback, useEffect, useState } from "react";
import axiosClient from "../api/axiosClient";

// A response belongs to its URL and attempt. Old results never replace a new page.
export default function useRemoteData(url) {
  const [attempt, setAttempt] = useState(0);
  const [result, setResult] = useState({
    key: null,
    data: undefined,
    error: null,
  });
  const key = `${url}:${attempt}`;
  useEffect(() => {
    const controller = new AbortController();
    axiosClient
      .get(url, { signal: controller.signal })
      .then(({ data }) => {
        if (!controller.signal.aborted) setResult({ key, data, error: null });
      })
      .catch((error) => {
        if (!controller.signal.aborted)
          setResult({
            key,
            data: undefined,
            error: { status: error.response?.status || 0 },
          });
      });
    return () => controller.abort();
  }, [url, key]);
  const retry = useCallback(() => setAttempt((value) => value + 1), []);
  const setData = useCallback(
    (update) => {
      setResult((previous) =>
        previous.key === key
          ? {
              ...previous,
              data:
                typeof update === "function" ? update(previous.data) : update,
            }
          : previous,
      );
    },
    [key],
  );
  const current = result.key === key;
  return {
    data: current ? result.data : undefined,
    error: current ? result.error : null,
    loading: !current,
    retry,
    setData,
  };
}
