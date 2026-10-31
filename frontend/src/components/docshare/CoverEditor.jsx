import { useState } from "react";
import axiosClient from "../../api/axiosClient";
import { DocumentThumbnail } from "./DocumentCard";
export default function CoverEditor({ doc, onChanged }) {
  const [file, setFile] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");
  async function save(remove = false) {
    if (busy) return;
    setBusy(true);
    setMessage("");
    try {
      if (remove) await axiosClient.delete(`/documents/${doc.id}/cover`);
      else {
        const form = new FormData();
        form.append("cover", file);
        await axiosClient.post(`/documents/${doc.id}/cover`, form, {
          headers: { "Content-Type": "multipart/form-data" },
        });
      }
      onChanged();
    } catch (error) {
      setMessage(
        error.response?.data?.message || "Chưa cập nhật được ảnh bìa.",
      );
    } finally {
      setBusy(false);
    }
  }
  return (
    <details className="my-4 rounded-xl border border-blue-100 p-4">
      <summary className="cursor-pointer text-sm font-semibold">
        Quản lý ảnh bìa tài liệu
      </summary>
      <div className="mt-4 grid gap-4 sm:grid-cols-[150px_1fr]">
        <DocumentThumbnail doc={doc} className="h-28 w-full" />
        <div>
          <p className="mb-3 text-xs leading-relaxed text-slate-500">
            Chọn ảnh bìa bạn có quyền chia sẻ (JPG, PNG, WebP; tối đa 5 MB). Ảnh
            bìa hiển thị công khai khi tài liệu được duyệt. Thay ảnh sẽ đưa tài
            liệu về chờ duyệt lại.
          </p>
          <label className="text-sm">
            Ảnh bìa mới
            <input
              type="file"
              accept="image/jpeg,image/png,image/webp"
              disabled={busy}
              className="mt-2 block w-full text-xs"
              onChange={(event) => {
                const selected = event.target.files?.[0];
                setFile(null);
                setMessage("");
                if (!selected) return;
                if (
                  selected.size > 5 * 1024 * 1024 ||
                  !["image/jpeg", "image/png", "image/webp"].includes(
                    selected.type,
                  )
                ) {
                  setMessage("Chọn JPG, PNG hoặc WebP tối đa 5 MB.");
                  return;
                }
                setFile(selected);
              }}
            />
          </label>
          <div className="mt-3 flex gap-2">
            <button
              type="button"
              className="ds-button-primary text-xs"
              disabled={busy || !file}
              onClick={() => save()}
            >
              Lưu ảnh bìa
            </button>
            {doc.thumbnail_url && (
              <button
                type="button"
                className="ds-button-outline text-xs"
                disabled={busy}
                onClick={() => save(true)}
              >
                Gỡ ảnh bìa
              </button>
            )}
          </div>
          {busy && (
            <p role="status" className="mt-2 text-xs">
              Đang cập nhật ảnh bìa…
            </p>
          )}
          {message && (
            <p role="alert" className="mt-2 text-xs text-rose-600">
              {message}
            </p>
          )}
        </div>
      </div>
    </details>
  );
}
