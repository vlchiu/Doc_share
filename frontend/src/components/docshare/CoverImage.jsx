import { useEffect, useRef, useState } from "react";
import axiosClient from "../../api/axiosClient";
export default function CoverImage({ url, fallback }) {
  const root = useRef(null);
  const [image, setImage] = useState("");
  const [failed, setFailed] = useState(false);
  useEffect(() => {
    if (!url.startsWith("/api/documents/thumbnail/")) return;
    const controller = new AbortController();
    let objectUrl;
    let started = false;
    const load = () => {
      if (started) return;
      started = true;
      axiosClient
        .get(url.slice(4), { responseType: "blob", signal: controller.signal })
        .then(({ data }) => {
          if (controller.signal.aborted) return;
          objectUrl = URL.createObjectURL(data);
          setImage(objectUrl);
        })
        .catch(() => {
          if (!controller.signal.aborted) setFailed(true);
        });
    };
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting)) {
          observer.disconnect();
          load();
        }
      },
      { rootMargin: "100px" },
    );
    observer.observe(root.current);
    return () => {
      observer.disconnect();
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [url]);
  const source = url.startsWith("/api/documents/thumbnail/") ? image : url;
  return (
    <div ref={root} className="h-full w-full">
      {source && !failed ? (
        <img
          src={source}
          alt=""
          loading="lazy"
          decoding="async"
          onError={() => setFailed(true)}
          className="h-full w-full object-cover"
        />
      ) : (
        fallback
      )}
    </div>
  );
}
