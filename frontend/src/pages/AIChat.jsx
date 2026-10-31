import useRemoteData from "../hooks/useRemoteData";
import { LoadingState, ErrorState } from "../components/docshare/ResourceState";
import { useEffect, useRef, useState } from "react";
import { useSearchParams, Link, useNavigate } from "react-router-dom";
import {
  Bot,
  Plus,
  Send,
  Sparkles,
  FileText,
  MessageCircle,
  Copy,
  BookOpen,
  Languages,
  X,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import axiosClient from "../api/axiosClient";
import { Panel } from "../components/docshare/Primitives";
const actions = [
  ["Tóm tắt tài liệu", "Tóm tắt nội dung chính của tài liệu.", FileText],
  [
    "Giải thích khái niệm",
    "Giải thích các khái niệm quan trọng.",
    MessageCircle,
  ],
  ["Tạo câu hỏi ôn tập", "Tạo 5 câu hỏi ôn tập từ tài liệu.", BookOpen],
  ["Dịch nội dung", "Dịch nội dung chính sang tiếng Anh.", Languages],
];
export default function AIChat({ user }) {
  const [params] = useSearchParams();
  return <ChatSession key={params.toString()} user={user} />;
}
function ChatSession({ user }) {
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const conversationId = params.get("conversation");
  const [savedDocumentId, setSavedDocumentId] = useState(null);
  const documentId = conversationId ? savedDocumentId : params.get("document");
  const [page, setPage] = useState(1);
  const [searchDraft, setSearchDraft] = useState("");
  const [search, setSearch] = useState("");
  const [historyOpen, setHistoryOpen] = useState(false);
  const [toolsOpen, setToolsOpen] = useState(false);
  const [outgoing, setOutgoing] = useState(null);
  const {
    data: historyPage,
    error: historyError,
    loading: historyLoading,
    retry: refreshHistory,
  } = useRemoteData(
    `/chat/conversations?page=${page}&search=${encodeURIComponent(search)}`,
  );
  const [opening, setOpening] = useState(!!conversationId);
  const [openError, setOpenError] = useState(null);
  const [attempt, setAttempt] = useState(0);
  const [hasOlder, setHasOlder] = useState(false);
  const [olderLoading, setOlderLoading] = useState(false);
  const [title, setTitle] = useState("");
  const [editing, setEditing] = useState(false);
  const [managing, setManaging] = useState(false);
  const pending = useRef(null);
  const createdId = useRef(conversationId);
  const sending = useRef(false);
  const alive = useRef(true);
  const [document, setDocument] = useState(null);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [copied, setCopied] = useState(null);
  const active = useRef(null);
  const end = useRef(null);
  useEffect(() => {
    alive.current = true;
    return () => {
      alive.current = false;
      active.current?.abort();
    };
  }, []);
  useEffect(() => {
    if (!conversationId) return;
    const controller = new AbortController();
    async function openConversation() {
      setOpening(true);
      setOpenError(null);
      try {
        const { data } = await axiosClient.get(
          `/chat/conversations/${conversationId}/messages`,
          { signal: controller.signal },
        );
        if (controller.signal.aborted) return;
        setMessages(data.messages);
        setHasOlder(data.hasMore);
        setTitle(data.conversation.title);
        setSavedDocumentId(data.conversation.document_id);
      } catch (err) {
        if (!controller.signal.aborted)
          setOpenError({ status: err.response?.status || 0 });
      } finally {
        if (!controller.signal.aborted) setOpening(false);
      }
    }
    openConversation();
    return () => controller.abort();
  }, [conversationId, attempt]);
  useEffect(() => {
    if (!documentId) return;
    const controller = new AbortController();
    axiosClient
      .get(`/documents/${encodeURIComponent(documentId)}`, {
        signal: controller.signal,
      })
      .then((res) => {
        if (!controller.signal.aborted) setDocument(res.data);
      })
      .catch(() => {
        if (!controller.signal.aborted)
          setError("Không thể tải tài liệu đã chọn.");
      });
    return () => controller.abort();
  }, [documentId]);
  useEffect(() => {
    end.current?.scrollIntoView({ block: "nearest" });
  }, [loading]);
  async function loadOlder() {
    setOlderLoading(true);
    setError("");
    try {
      const { data } = await axiosClient.get(
        `/chat/conversations/${conversationId}/messages?before=${messages[0].id}`,
      );
      if (!alive.current) return;
      setMessages((previous) => [...data.messages, ...previous]);
      setHasOlder(data.hasMore);
    } catch {
      if (alive.current) setError("Chưa tải được tin nhắn cũ. Hãy thử lại.");
    } finally {
      if (alive.current) setOlderLoading(false);
    }
  }
  async function manage(kind) {
    if (
      kind === "delete" &&
      !window.confirm("Xóa vĩnh viễn hội thoại và toàn bộ tin nhắn?")
    )
      return;
    setManaging(true);
    setError("");
    try {
      if (kind === "delete") {
        await axiosClient.delete(`/chat/conversations/${conversationId}`);
        if (alive.current) navigate("/ai-chat");
      } else {
        await axiosClient.patch(`/chat/conversations/${conversationId}`, {
          title: title.trim(),
        });
        if (alive.current) {
          setEditing(false);
          refreshHistory();
        }
      }
    } catch (err) {
      if (alive.current)
        setError(err.response?.data?.message || "Chưa thể cập nhật hội thoại.");
    } finally {
      if (alive.current) setManaging(false);
    }
  }
  function acceptResult(savedMessages) {
    pending.current = null;
    setOutgoing(null);
    setInput("");
    setError("");
    if (!conversationId)
      navigate(`/ai-chat?conversation=${createdId.current}`, { replace: true });
    else {
      setMessages((previous) => [
        ...previous,
        ...savedMessages.filter(
          (message) => !previous.some((row) => row.id === message.id),
        ),
      ]);
      refreshHistory();
    }
  }
  async function send(event) {
    event.preventDefault();
    if (!input.trim() || sending.current || opening || openError) return;
    sending.current = true;
    const content = input.trim();
    if (!pending.current || pending.current.content !== content)
      pending.current = { content, requestId: crypto.randomUUID() };
    const controller = new AbortController();
    active.current = controller;
    setError("");
    setLoading(true);
    setOutgoing(content);
    try {
      if (!createdId.current) {
        const { data } = await axiosClient.post(
          "/chat/conversations",
          {
            title: content.slice(0, 120),
            documentId: documentId ? Number(documentId) : null,
          },
          { signal: controller.signal },
        );
        createdId.current = data.id;
        refreshHistory();
      }
      const { data } = await axiosClient.post(
        `/chat/conversations/${createdId.current}/messages`,
        { message: content, requestId: pending.current.requestId },
        { signal: controller.signal },
      );
      if (controller.signal.aborted) return;
      acceptResult(data.messages);
    } catch (err) {
      // A lost HTTP response does not imply the committed pair was lost.
      if (!controller.signal.aborted && !err.response && createdId.current) {
        try {
          const { data } = await axiosClient.get(
            `/chat/conversations/${createdId.current}/messages`,
            { signal: controller.signal, timeout: 10000 },
          );
          const saved = data.messages.filter(
            (row) => row.request_id === pending.current?.requestId,
          );
          if (
            !controller.signal.aborted &&
            saved.some((row) => row.role === "assistant")
          ) {
            acceptResult(saved);
            return;
          }
        } catch {
          /* Keep the draft and request ID for the next explicit retry. */
        }
      }
      if (!controller.signal.aborted)
        setError(
          err.response?.data?.message ||
            "Chưa xác nhận được kết quả. Giữ nguyên câu hỏi và gửi lại để kiểm tra, không lưu trùng tin nhắn.",
        );
    } finally {
      sending.current = false;
      if (!controller.signal.aborted) setLoading(false);
    }
  }
  return (
    <div className="ds-chat">
      <aside className="ds-chat-history">
        <button
          type="button"
          className="ds-mobile-disclosure ds-button-outline mb-3 w-full"
          aria-expanded={historyOpen}
          aria-controls="chat-history-panel"
          onClick={() => setHistoryOpen((value) => !value)}
        >
          Lịch sử hội thoại
        </button>
        <div
          id="chat-history-panel"
          className={`ds-chat-collapsible ${historyOpen ? "is-open" : ""}`}
        >
          <div className="mb-5 flex items-center justify-between">
            <h1 className="font-bold">Hội thoại</h1>
            <button
              className="ds-icon-button border border-blue-100 text-blue-600"
              aria-label="Hội thoại mới"
              onClick={() => navigate(`/ai-chat?new=${crypto.randomUUID()}`)}
            >
              <Plus size={18} />
            </button>
          </div>
          <p className="mb-3 text-xs text-[#7181a8]">
            Lịch sử được lưu theo tài khoản
          </p>
          <form
            className="mb-3 flex gap-2"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchDraft.trim());
            }}
          >
            <input
              aria-label="Tìm hội thoại theo tên"
              className="ds-input min-w-0 text-xs"
              value={searchDraft}
              maxLength={120}
              onChange={(event) => setSearchDraft(event.target.value)}
              placeholder="Tìm hội thoại…"
            />
            <button className="ds-button-outline text-xs">Tìm</button>
          </form>
          {historyLoading ? (
            <LoadingState label="Đang tải lịch sử…" />
          ) : historyError ? (
            <ErrorState error={historyError} onRetry={refreshHistory} />
          ) : (
            <>
              <div className="max-h-64 space-y-2 overflow-y-auto lg:max-h-[65vh]">
                {historyPage?.conversations?.map((item) => (
                  <Link
                    key={item.id}
                    to={`/ai-chat?conversation=${item.id}`}
                    aria-current={
                      item.id === conversationId ? "page" : undefined
                    }
                    className={`block rounded-lg p-3 text-xs ${item.id === conversationId ? "border-l-2 border-blue-500 bg-blue-50" : "hover:bg-blue-50"}`}
                  >
                    <span className="line-clamp-2 font-semibold">
                      {item.title}
                    </span>
                    <span className="mt-1 block text-[#7181a8]">
                      {new Date(item.updated_at).toLocaleString("vi-VN")}
                    </span>
                  </Link>
                ))}
                {!historyPage?.conversations?.length && (
                  <p className="text-xs text-[#7181a8]">
                    {search
                      ? "Không có hội thoại phù hợp."
                      : "Chưa có hội thoại."}
                  </p>
                )}
              </div>
              <div className="mt-4 flex justify-between gap-2">
                <button
                  disabled={page === 1}
                  className="ds-button-outline text-xs"
                  onClick={() => setPage((value) => value - 1)}
                >
                  Trước
                </button>
                <button
                  disabled={!historyPage?.hasMore}
                  className="ds-button-outline text-xs"
                  onClick={() => setPage((value) => value + 1)}
                >
                  Tiếp
                </button>
              </div>
            </>
          )}
          <p className="mt-5 text-xs leading-relaxed text-[#7181a8]">
            Câu hỏi và câu trả lời được lưu cùng nhau khi AI trả lời thành công.
            Bạn có thể mở lại hoặc xóa hội thoại.
          </p>
        </div>
      </aside>
      <section className="flex min-w-0 flex-col">
        <header className="flex flex-wrap items-center gap-3 border-b border-blue-100 pb-4">
          <span className="ds-bot">
            <Bot size={25} />
          </span>
          <div>
            <h2 className="font-bold">Trợ lý AI DocShare</h2>
            <p className="text-xs text-[#7181a8]">
              Hỏi, tóm tắt, phân tích tài liệu của bạn
            </p>
          </div>
          {document && (
            <Link
              to="/ai-chat"
              className="ml-auto flex max-w-full items-center gap-2 rounded-lg bg-blue-50 p-2 text-xs"
            >
              <FileText size={15} />
              <span className="max-w-40 truncate">{document.title}</span>
              <X size={14} />
            </Link>
          )}
        </header>
        {conversationId && (
          <div className="my-3 flex flex-wrap items-center gap-2 text-xs">
            {editing ? (
              <form
                className="flex min-w-0 flex-1 gap-2"
                onSubmit={(event) => {
                  event.preventDefault();
                  manage("rename");
                }}
              >
                <input
                  aria-label="Tên hội thoại"
                  value={title}
                  onChange={(event) => setTitle(event.target.value)}
                  maxLength={120}
                  className="ds-input min-w-0"
                />
                <button
                  disabled={managing || !title.trim()}
                  className="ds-button-outline"
                >
                  Lưu tên
                </button>
              </form>
            ) : (
              <button
                className="ds-button-outline"
                onClick={() => setEditing(true)}
                disabled={opening || !!openError || loading}
              >
                Đổi tên
              </button>
            )}
            <button
              className="ds-button-outline !text-rose-600"
              disabled={managing || loading}
              onClick={() => manage("delete")}
            >
              Xóa hội thoại
            </button>
          </div>
        )}
        {opening && <LoadingState label="Đang mở hội thoại…" />}
        {openError && (
          <ErrorState
            error={openError}
            onRetry={() => setAttempt((value) => value + 1)}
          />
        )}
        <div className="ds-chat-messages" aria-live="polite">
          {hasOlder && (
            <button
              disabled={olderLoading}
              onClick={loadOlder}
              className="ds-button-outline mb-4 text-xs"
            >
              {olderLoading ? "Đang tải…" : "Tải tin nhắn cũ"}
            </button>
          )}
          {!messages.length && !outgoing && !opening && !openError && (
            <div className="m-auto py-16 text-center">
              <Bot size={48} className="mx-auto mb-5 text-blue-500" />
              <h2 className="text-xl font-bold">Tôi có thể giúp gì cho bạn?</h2>
              <p className="mx-auto mt-3 max-w-sm text-sm leading-relaxed text-[#7181a8]">
                Đặt câu hỏi hoặc chọn một tài liệu để cùng khám phá kiến thức.
              </p>
            </div>
          )}
          {messages.map((message, index) => (
            <div
              key={index}
              className={`mb-5 flex gap-3 ${message.role === "user" ? "flex-row-reverse" : ""}`}
            >
              <span
                className={message.role === "user" ? "ds-avatar" : "ds-bot"}
              >
                {message.role === "user" ? (
                  user?.name?.[0] || "B"
                ) : (
                  <Bot size={22} />
                )}
              </span>
              <div
                className={`min-w-0 max-w-[86%] rounded-2xl p-4 text-sm leading-relaxed ${message.role === "user" ? "bg-blue-100/70" : "border border-blue-100 bg-white"}`}
              >
                <div className="ds-markdown">
                  <ReactMarkdown>{message.content}</ReactMarkdown>
                </div>
                {message.role === "assistant" && (
                  <button
                    className="mt-3 flex items-center gap-1 text-xs text-[#7181a8]"
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(message.content);
                        setCopied(index);
                      } catch {
                        setError("Không thể sao chép.");
                      }
                    }}
                  >
                    <Copy size={14} />
                    {copied === index ? "Đã sao chép" : "Sao chép"}
                  </button>
                )}
              </div>
            </div>
          ))}
          {outgoing && (
            <div className="mb-4 ml-auto max-w-[86%] rounded-2xl bg-blue-100/70 p-4 text-sm">
              <p className="whitespace-pre-wrap break-words">{outgoing}</p>
              <p className="mt-2 text-xs text-slate-500">
                {loading
                  ? "Đang gửi · chưa lưu"
                  : "Chưa xác nhận lưu · có thể gửi lại"}
              </p>
            </div>
          )}
          {loading && (
            <p role="status" className="text-sm text-blue-600">
              AI đang trả lời và lưu hội thoại…
            </p>
          )}
          <div ref={end} />
        </div>
        {error && (
          <p
            role="alert"
            className="mb-3 rounded-lg bg-rose-50 p-3 text-xs text-rose-600"
          >
            {error}
          </p>
        )}
        <form
          onSubmit={send}
          className="flex gap-2 rounded-2xl border border-blue-100 p-2 shadow-sm"
        >
          <input
            disabled={loading || opening || !!openError}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            maxLength={4000}
            aria-label="Nhập câu hỏi cho AI"
            placeholder="Nhập câu hỏi của bạn…"
            className="min-w-0 flex-1 px-3 text-sm outline-none"
          />
          <button
            disabled={loading || opening || !!openError || !input.trim()}
            className="ds-button-primary !rounded-full !p-3"
            aria-label="Gửi câu hỏi"
          >
            <Send size={20} />
          </button>
        </form>
      </section>
      <aside className="space-y-3">
        <button
          type="button"
          className="ds-mobile-disclosure ds-button-outline w-full"
          aria-expanded={toolsOpen}
          aria-controls="chat-tools-panel"
          onClick={() => setToolsOpen((value) => !value)}
        >
          Tác vụ và tài liệu
        </button>
        <div
          id="chat-tools-panel"
          className={`ds-chat-collapsible space-y-3 ${toolsOpen ? "is-open" : ""}`}
        >
          <Panel
            title={
              <span className="flex gap-2">
                <Sparkles className="text-blue-600" />
                Tác vụ nhanh
              </span>
            }
          >
            <div className="space-y-3">
              {actions.map(([title, prompt, Icon]) => {
                const ActionIcon = Icon;
                return (
                  <button
                    key={title}
                    className="flex w-full items-center gap-3 rounded-xl border border-blue-100 p-3 text-left text-xs hover:bg-blue-50"
                    disabled={loading}
                    onClick={() => setInput(prompt)}
                  >
                    <span className="rounded-full bg-blue-50 p-2 text-blue-600">
                      <ActionIcon size={20} />
                    </span>
                    {title}
                  </button>
                );
              })}
            </div>
          </Panel>
          <Panel title="Tài liệu đang sử dụng">
            {document ? (
              <p className="text-sm">{document.title}</p>
            ) : (
              <p className="text-xs leading-relaxed text-[#7181a8]">
                Chưa chọn tài liệu. Mở chi tiết tài liệu và chọn “Hỏi AI” để bắt
                đầu.
              </p>
            )}
            <Link to="/documents" className="mt-3 block text-xs text-blue-600">
              Chọn tài liệu →
            </Link>
          </Panel>
          <Panel title="Mẹo sử dụng AI Chat" className="!bg-blue-50/70">
            <p className="text-xs leading-6 text-[#7181a8]">
              Đặt câu hỏi cụ thể. Bạn có thể yêu cầu tóm tắt, giải thích hoặc
              tạo câu hỏi ôn tập. Kiểm tra nguồn tài liệu để đối chiếu câu trả
              lời.
            </p>
          </Panel>
        </div>
      </aside>
    </div>
  );
}
