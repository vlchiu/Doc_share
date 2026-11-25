import useRemoteData from "../hooks/useRemoteData";
import { ErrorState } from "../components/docshare/ResourceState";
import UserConnections from "../components/docshare/UserConnections";
import { useParams, Link } from "react-router-dom";
import Spinner from "../components/Spinner";
import {
  FILE_ICONS,
  FILE_BADGE_COLORS,
  getFileLabel,
} from "../utils/fileHelper";

const API_URL = import.meta.env.VITE_API_URL;

function UserProfile() {
  const { userId } = useParams();
  const { data, loading, error, retry } = useRemoteData(
    `/documents/user/${userId}`,
  );
  if (loading) return <Spinner />;
  if (error) return <ErrorState error={error} onRetry={retry} />;
  if (!data)
    return (
      <div style={{ textAlign: "center", padding: "60px" }}>
        Không tìm thấy.
      </div>
    );

  const { user, documents } = data;

  return (
    <div style={{ maxWidth: "900px", margin: "0 auto", color: "#1a1a1a" }}>
      {/* HEADER USER */}
      <div
        style={{
          borderRadius: "16px",
          overflow: "hidden",
          boxShadow: "0 4px 20px rgba(0,0,0,0.08)",
          marginBottom: "24px",
        }}
      >
        {/* Gradient banner */}
        <div
          style={{
            background:
              "linear-gradient(135deg, #1e3a8a 0%, #3b82f6 60%, #06b6d4 100%)",
            height: "80px",
            position: "relative",
          }}
        >
          <div
            style={{
              position: "absolute",
              top: "-20px",
              right: "-20px",
              width: "100px",
              height: "100px",
              borderRadius: "50%",
              background: "rgba(255,255,255,0.08)",
            }}
          />
        </div>
        <div
          style={{
            background: "#fff",
            padding: "0 20px 24px",
            flexWrap: "wrap",
            display: "flex",
            gap: "20px",
            alignItems: "flex-start",
          }}
        >
          <div
            style={{
              position: "relative",
              zIndex: 1,
              width: "80px",
              height: "80px",
              borderRadius: "50%",
              overflow: "hidden",
              background: "#cbd5e1",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "#fff",
              fontSize: "28px",
              fontWeight: "bold",
              flexShrink: 0,
              border: "4px solid #fff",
              marginTop: "-40px",
              boxShadow: "0 4px 12px rgba(0,0,0,0.15)",
            }}
          >
            {user.avatar_url ? (
              <img
                src={
                  user.avatar_url.startsWith("https://")
                    ? user.avatar_url
                    : `${API_URL}${user.avatar_url}`
                }
                alt="avatar"
                style={{ width: "100%", height: "100%", objectFit: "cover" }}
              />
            ) : (
              user.name.charAt(0).toUpperCase()
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0, paddingTop: "12px", paddingBottom: "4px" }}>
            <h2
              style={{
                margin: "0 0 4px",
                fontSize: "20px",
                fontWeight: "bold",
                color: "#1a1a1a",
              }}
            >
              {user.name}
            </h2>
            <p
              style={{ margin: "0 0 10px", color: "#64748b", fontSize: "13px" }}
            >
              📅 Tham gia{" "}
              {new Date(user.created_at).toLocaleDateString("vi-VN")} · 📄{" "}
              {documents.length} tài liệu
            </p>
            <UserConnections key={userId} userId={userId} />
          </div>
        </div>
      </div>

      {/* DANH SÁCH TÀI LIỆU */}
      <h3
        style={{
          fontSize: "17px",
          fontWeight: "bold",
          marginBottom: "16px",
          color: "#334155",
        }}
      >
        Tài liệu đã đăng
      </h3>

      {documents.length === 0 ? (
        <div
          style={{
            textAlign: "center",
            padding: "50px",
            background: "#fff",
            borderRadius: "14px",
          }}
        >
          <div style={{ fontSize: "48px", marginBottom: "10px" }}>📭</div>
          <p style={{ color: "#64748b" }}>Chưa có tài liệu nào được duyệt.</p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(min(280px, 100%), 1fr))",
            gap: "16px",
          }}
        >
          {documents.map((doc) => {
            const fileIcon = FILE_ICONS[doc.file_type] || "📎";
            const fileLabel = getFileLabel(doc.file_type, doc.file_url);
            const badgeColor = FILE_BADGE_COLORS[fileLabel] || {
              bg: "#f1f5f9",
              color: "#475569",
            };
            return (
              <Link
                key={doc.id}
                to={`/documents/${doc.id}`}
                style={{ textDecoration: "none" }}
              >
                <div
                  style={{
                    background: "#fff",
                    padding: "16px",
                    borderRadius: "12px",
                    boxShadow: "0 2px 10px rgba(0,0,0,0.04)",
                    display: "flex",
                    gap: "12px",
                    alignItems: "flex-start",
                    transition: "0.15s",
                  }}
                  onMouseEnter={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 4px 16px rgba(0,0,0,0.1)")
                  }
                  onMouseLeave={(e) =>
                    (e.currentTarget.style.boxShadow =
                      "0 2px 10px rgba(0,0,0,0.04)")
                  }
                >
                  <span style={{ fontSize: "28px", flexShrink: 0 }}>
                    {fileIcon}
                  </span>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "center",
                        gap: "6px",
                        marginBottom: "4px",
                      }}
                    >
                      <p
                        style={{
                          margin: 0,
                          fontWeight: "bold",
                          fontSize: "14px",
                          color: "#1a1a1a",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          whiteSpace: "nowrap",
                        }}
                      >
                        {doc.title}
                      </p>
                      <span
                        style={{
                          flexShrink: 0,
                          padding: "1px 7px",
                          borderRadius: "5px",
                          fontSize: "10px",
                          fontWeight: "bold",
                          background: badgeColor.bg,
                          color: badgeColor.color,
                        }}
                      >
                        {fileLabel}
                      </span>
                    </div>
                    <p
                      style={{ margin: 0, fontSize: "12px", color: "#64748b" }}
                    >
                      📁 {doc.category?.name} · 👁️ {doc.view_count} · ⬇️{" "}
                      {doc.download_count}
                    </p>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}


    </div>
  );
}

export default UserProfile;
