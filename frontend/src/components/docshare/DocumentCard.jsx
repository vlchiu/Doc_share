import CoverImage from "./CoverImage";
import { Link } from "react-router-dom";
import { FileText, Eye, ArrowRight, Download } from "lucide-react";
import { getFileLabel, FILE_BADGE_COLORS } from "../../utils/fileHelper";
export function FileBadge({ doc }) {
  const label = getFileLabel(doc.file_type, doc.file_url);
  const color = FILE_BADGE_COLORS[label] || FILE_BADGE_COLORS.TXT;
  return (
    <span
      className="inline-flex items-center gap-1 rounded px-1.5 py-1 text-[10px] font-semibold"
      style={{ background: color.bg, color: color.color }}
    >
      <FileText size={12} />
      {label}
    </span>
  );
}
export function DocumentThumbnail({ doc, className = "" }) {
  const label = getFileLabel(doc.file_type, doc.file_url);
  const color = FILE_BADGE_COLORS[label] || FILE_BADGE_COLORS.TXT;
  const fallback = (
    <div
      aria-hidden="true"
      style={{ background: color.bg, color: color.color }}
      className="flex h-full items-center justify-center"
    >
      <div className="rotate-[-8deg] rounded-lg border border-white bg-white/80 p-5 shadow-lg shadow-blue-200/60">
        <FileText size={32} />
        <span className="mt-1 block text-center text-xs font-bold">
          {label}
        </span>
      </div>
    </div>
  );
  return (
    <div
      className={`relative overflow-hidden rounded-lg bg-blue-50 ${className}`}
    >
      {doc.thumbnail_url ? (
        <CoverImage
          key={doc.thumbnail_url}
          url={doc.thumbnail_url}
          fallback={fallback}
        />
      ) : (
        fallback
      )}
    </div>
  );
}

export default function DocumentCard({ doc, list = false, compact = false }) {
  return (
    <article className={`ds-document-card ${list ? "ds-document-list" : ""}`}>
      <Link
        to={`/documents/${doc.id}`}
        aria-label={`Xem tài liệu: ${doc.title}`}
        className="relative block"
      >
        <DocumentThumbnail doc={doc} className="ds-document-thumb" />
        <span className="absolute bottom-2 left-2">
          <FileBadge doc={doc} />
        </span>
      </Link>
      <div className="flex min-w-0 flex-1 flex-col">
        <Link
          to={`/documents/${doc.id}`}
          className="mt-2 line-clamp-2 text-sm font-bold leading-snug text-[#111633] hover:text-blue-600"
        >
          {doc.title}
        </Link>
        {!compact && (
          <p className="mt-1 line-clamp-2 text-xs leading-relaxed text-[#7181a8]">
            {doc.description ||
              "Khám phá nội dung và trao đổi cùng cộng đồng DocShare."}
          </p>
        )}
        <span className="my-2 w-fit rounded-md bg-blue-50 px-2 py-1 text-[11px] text-blue-600">
          {doc.category?.name || doc.doc_type || "Tài liệu"}
        </span>
        <div className="mt-auto flex items-center justify-between gap-2 text-[11px] text-[#7181a8]">
          <span className="flex items-center gap-1">
            <Eye size={13} />
            {Number(doc.view_count || 0).toLocaleString("vi-VN")} lượt xem
          </span>
          <span className="flex items-center gap-1">
            <Download size={13} />
            {doc.download_count || 0}
          </span>
        </div>
        <Link
          className="ds-button-outline mt-3 !py-2 text-xs"
          to={`/documents/${doc.id}`}
        >
          Xem chi tiết <ArrowRight size={14} />
        </Link>
      </div>
    </article>
  );
}
export function DocumentRow({ doc }) {
  return (
    <Link
      to={`/documents/${doc.id}`}
      className="flex gap-3 rounded-lg py-2 hover:bg-blue-50"
    >
      <DocumentThumbnail doc={doc} className="h-11 w-12 shrink-0" />
      <div className="min-w-0">
        <h3 className="line-clamp-2 text-xs font-medium">{doc.title}</h3>
        <p className="mt-1 text-[11px] text-[#7181a8]">
          {doc.category?.name || "Tài liệu"} · {doc.view_count || 0} lượt xem
        </p>
      </div>
    </Link>
  );
}
