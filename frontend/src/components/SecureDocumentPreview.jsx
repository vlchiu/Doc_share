import { useEffect, useState } from 'react';
import axiosClient from '../api/axiosClient';

export default function SecureDocumentPreview({ documentId, fileType, title }) {
  const [deliveryId] = useState(() => crypto.randomUUID());
  const [preview, setPreview] = useState({ id: null, url: '', text: '', error: '' });
  useEffect(() => {
    const controller = new AbortController();
    let objectUrl;
    axiosClient.get(`/documents/proxy-file/${documentId}`, { responseType: 'blob', signal: controller.signal, headers: { 'X-Delivery-ID': deliveryId } })
      .then(async ({ data }) => {
        if (controller.signal.aborted) return;
        if (fileType === 'text/plain') {
          const text = await data.text();
          if (!controller.signal.aborted) setPreview({ id: documentId, text });
        } else {
          objectUrl = URL.createObjectURL(data);
          setPreview({ id: documentId, url: objectUrl });
        }
      })
      .catch((error) => {
        if (!controller.signal.aborted) setPreview({ id: documentId, error: error.response?.data?.message || 'Không thể tải bản xem trước. Hãy đóng và mở lại để thử.' });
      });
    return () => {
      controller.abort();
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [documentId, fileType, deliveryId]);

  if (preview.id !== documentId) return <p className="text-slate-200">Đang tải bản xem trước...</p>;
  if (preview.error) return <p role="alert" className="text-rose-300">{preview.error}</p>;
  if (fileType === 'text/plain') return <pre className="text-slate-200 whitespace-pre-wrap break-words max-h-[600px] overflow-auto">{preview.text}</pre>;
  if (fileType.startsWith('image/')) return <img src={preview.url} alt={title} className="max-w-full max-h-[600px] mx-auto" />;
  return <iframe src={preview.url} title={`Xem trước: ${title}`} className="w-full h-[70vh] border-0 bg-white" />;
}
