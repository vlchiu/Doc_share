import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Bot,
  Sparkles,
  Send,
  X,
  RotateCcw,
  CornerDownLeft,
  Maximize2,
  Minimize2,
  Copy,
  Check,
  LogIn,
  FileText,
  BrainCircuit,
  MessageSquare
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { Link } from 'react-router-dom';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

function ChatBox({ documentId, documentTitle, isAuthenticated }) {
  const [open, setOpen] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (open) {
      scrollToBottom();
      if (isAuthenticated) {
        setTimeout(() => inputRef.current?.focus(), 150);
      }
    }
  }, [open, messages, loading, isAuthenticated]);

  const handleSend = async (customPrompt) => {
    const textToSend = (typeof customPrompt === 'string' ? customPrompt : input).trim();
    if (!textToSend || loading) return;

    if (!isAuthenticated) {
      toast.error('Vui lòng đăng nhập để sử dụng AI Copilot');
      return;
    }

    setInput('');
    const newMessages = [...messages, { role: 'user', content: textToSend }];
    setMessages(newMessages);
    setLoading(true);

    try {
      const res = await axiosClient.post(`/chat/${documentId}`, {
        message: textToSend,
        history: messages,
      });

      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: res.data.reply,
          modelUsed: res.data.modelUsed
        },
      ]);
    } catch (err) {
      console.error('Chat error:', err);
      const errMsg = err.response?.data?.message || 'Không thể kết nối tới dịch vụ AI vào lúc này.';
      toast.error(errMsg);
      setMessages((prev) => [
        ...prev,
        {
          role: 'assistant',
          content: `⚠️ **Lỗi kết nối:** ${errMsg}\n\nVui lòng thử lại sau vài giây hoặc liên hệ quản trị viên nếu sự cố tiếp diễn.`,
          isError: true,
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const copyToClipboard = (text, index) => {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success('Đã sao chép phản hồi');
    setTimeout(() => setCopiedIndex(null), 2000);
  };

  const quickPrompts = [
    'Tóm tắt các điểm cốt lõi trong tài liệu này',
    'Giải thích những khái niệm quan trọng nhất',
    'Tài liệu này hữu ích cho đối tượng nào?',
    'Tạo 3 câu hỏi trắc nghiệm kiểm tra hiểu bài',
  ];

  return (
    <>
      {/* ── FLOATING TRIGGER BUTTON ── */}
      {!open && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.06, y: -2 }}
          whileTap={{ scale: 0.94 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-3 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-600/30 hover:shadow-indigo-600/50 transition-all border border-white/20 cursor-pointer group backdrop-blur-md"
          title="Hỏi AI Copilot về tài liệu này"
        >
          <div className="relative flex items-center justify-center">
            <Bot className="w-5 h-5 text-white group-hover:rotate-12 transition-transform duration-300" />
            <span className="absolute -top-1 -right-1 w-2.5 h-2.5 rounded-full bg-emerald-400 ring-2 ring-indigo-900 animate-pulse" />
          </div>
          <div className="flex flex-col text-left leading-none">
            <span className="text-xs font-bold tracking-wide">DocShare AI</span>
            <span className="text-[10px] text-indigo-200 font-medium">Hỏi về tài liệu</span>
          </div>
          <Sparkles className="w-3.5 h-3.5 text-amber-300 animate-spin [animation-duration:6s]" />
        </motion.button>
      )}

      {/* ── CHAT STUDIO POPUP ── */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 24, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 24, scale: 0.94 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className={`fixed bottom-6 right-6 z-50 max-w-[calc(100vw-2rem)] rounded-3xl bg-white shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden backdrop-blur-xl transition-all duration-300 ${
              isExpanded
                ? 'w-full sm:w-[680px] h-[680px] max-h-[calc(100vh-4rem)]'
                : 'w-full sm:w-[440px] h-[580px] max-h-[calc(100vh-5rem)]'
            }`}
          >
            {/* STUDIO HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-3.5 sm:p-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="absolute top-0 right-0 w-40 h-40 bg-indigo-500/15 rounded-full blur-2xl pointer-events-none" />
              
              <div className="flex items-center gap-3 relative z-10 min-w-0 pr-2">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white shadow-md shadow-indigo-500/30 shrink-0">
                  <BrainCircuit className="w-5 h-5 text-white" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5 font-bold text-xs truncate">
                    <span className="text-white">DocShare AI Copilot</span>
                    <span className="px-1.5 py-0.5 rounded text-[9px] bg-indigo-500/30 text-indigo-300 font-semibold border border-indigo-400/20">
                      Gemini
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-300 truncate flex items-center gap-1 mt-0.5" title={documentTitle}>
                    <FileText className="w-3 h-3 text-indigo-400 shrink-0" />
                    <span className="truncate">{documentTitle || 'Tài liệu đang xem'}</span>
                  </div>
                </div>
              </div>

              {/* HEADER ACTIONS */}
              <div className="flex items-center gap-1 relative z-10 shrink-0">
                {isAuthenticated && messages.length > 0 && (
                  <button
                    onClick={() => setMessages([])}
                    title="Bắt đầu hội thoại mới"
                    className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
                  >
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}

                <button
                  onClick={() => setIsExpanded(!isExpanded)}
                  title={isExpanded ? 'Thu nhỏ' : 'Mở rộng'}
                  className="hidden sm:inline-flex p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
                >
                  {isExpanded ? <Minimize2 className="w-4 h-4" /> : <Maximize2 className="w-4 h-4" />}
                </button>

                <button
                  onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-300 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer"
                  aria-label="Đóng"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MESSAGE STREAM */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/70">
              {!isAuthenticated ? (
                // ── UNAUTHENTICATED STATE ──
                <div className="h-full flex flex-col items-center justify-center text-center p-6 my-auto">
                  <div className="w-14 h-14 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center text-indigo-600 mb-4 shadow-sm">
                    <LogIn className="w-7 h-7" />
                  </div>
                  <h3 className="text-sm font-bold text-slate-800">
                    Đăng nhập để trò chuyện với AI
                  </h3>
                  <p className="text-xs text-slate-500 mt-2 max-w-xs leading-relaxed">
                    AI Copilot cần xác thực tài khoản để hỗ trợ bạn đọc hiểu, tóm tắt và phân tích chuyên sâu tài liệu này.
                  </p>
                  <div className="mt-5 flex flex-col gap-2 w-full max-w-[220px]">
                    <Link
                      to="/login"
                      className="w-full py-2.5 px-4 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 text-white text-xs font-semibold text-center shadow-md shadow-indigo-500/25 hover:from-indigo-700 hover:to-purple-700 transition-all text-decoration-none"
                    >
                      Đăng nhập ngay
                    </Link>
                    <Link
                      to="/register"
                      className="text-[11px] text-slate-500 hover:text-indigo-600 text-center font-medium transition-colors text-decoration-none"
                    >
                      Chưa có tài khoản? Đăng ký
                    </Link>
                  </div>
                </div>
              ) : messages.length === 0 ? (
                // ── EMPTY STATE WITH INTELLIGENT PROMPTS ──
                <div className="py-4 px-1 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100/80 flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-sm">
                    <Sparkles className="w-6 h-6 animate-pulse" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">DocShare AI đã sẵn sàng!</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Tôi đã nạp ngữ cảnh của tài liệu này. Bạn có thể hỏi bất kỳ điều gì hoặc chọn các gợi ý bên dưới:
                  </p>

                  <div className="mt-5 flex flex-col gap-2">
                    {quickPrompts.map((q, idx) => (
                      <button
                        key={idx}
                        onClick={() => handleSend(q)}
                        disabled={loading}
                        className="text-left text-xs font-medium text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200 hover:border-indigo-300 p-2.5 rounded-xl transition-all shadow-2xs cursor-pointer flex items-center justify-between group disabled:opacity-50"
                      >
                        <span className="line-clamp-1">{q}</span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                // ── CONVERSATION HISTORY ──
                messages.map((msg, i) => (
                  <div
                    key={i}
                    className={`flex items-start gap-2.5 ${
                      msg.role === 'user' ? 'justify-end' : 'justify-start'
                    }`}
                  >
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 mt-0.5 text-xs shadow-xs">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}

                    <div
                      className={`relative group max-w-[88%] rounded-2xl px-4 py-3 text-xs leading-relaxed ${
                        msg.role === 'user'
                          ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none shadow-sm'
                          : msg.isError
                          ? 'bg-rose-50 border border-rose-200 text-rose-800 rounded-bl-none'
                          : 'bg-white text-slate-800 border border-slate-200/90 rounded-bl-none shadow-2xs'
                      }`}
                    >
                      {msg.role === 'user' ? (
                        <p className="whitespace-pre-wrap break-words m-0">{msg.content}</p>
                      ) : (
                        <div className="prose prose-xs max-w-none text-slate-800 break-words font-normal">
                          <ReactMarkdown
                            components={{
                              p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                              ul: ({ node, ...props }) => <ul className="list-disc pl-4 mb-2 space-y-1" {...props} />,
                              ol: ({ node, ...props }) => <ol className="list-decimal pl-4 mb-2 space-y-1" {...props} />,
                              li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                              strong: ({ node, ...props }) => <strong className="font-bold text-slate-900" {...props} />,
                              h1: ({ node, ...props }) => <h1 className="text-sm font-bold text-slate-900 mt-2 mb-1" {...props} />,
                              h2: ({ node, ...props }) => <h2 className="text-xs font-bold text-slate-900 mt-2 mb-1" {...props} />,
                              h3: ({ node, ...props }) => <h3 className="text-xs font-bold text-slate-800 mt-1.5 mb-1" {...props} />,
                              code: ({ node, inline, ...props }) =>
                                inline ? (
                                  <code className="px-1.5 py-0.5 rounded bg-slate-100 text-indigo-600 font-mono text-[11px]" {...props} />
                                ) : (
                                  <pre className="p-2.5 rounded-xl bg-slate-900 text-slate-100 font-mono text-[11px] overflow-x-auto my-2">
                                    <code {...props} />
                                  </pre>
                                ),
                              blockquote: ({ node, ...props }) => (
                                <blockquote className="border-l-2 border-indigo-400 pl-2.5 italic text-slate-500 my-1.5" {...props} />
                              ),
                            }}
                          >
                            {msg.content}
                          </ReactMarkdown>

                          {/* ACTION BAR UNDER RESPONSE */}
                          {!msg.isError && (
                            <div className="mt-2.5 pt-2 border-t border-slate-100 flex items-center justify-between text-[10px] text-slate-400">
                              <span className="font-medium text-slate-400">
                                {msg.modelUsed ? `Model: ${msg.modelUsed}` : 'Gemini AI'}
                              </span>
                              <button
                                onClick={() => copyToClipboard(msg.content, i)}
                                className="flex items-center gap-1 hover:text-indigo-600 transition-colors border-0 bg-transparent cursor-pointer p-0.5"
                                title="Sao chép câu trả lời"
                              >
                                {copiedIndex === i ? (
                                  <>
                                    <Check className="w-3 h-3 text-emerald-500" />
                                    <span className="text-emerald-600 font-medium">Đã chép</span>
                                  </>
                                ) : (
                                  <>
                                    <Copy className="w-3 h-3" />
                                    <span>Sao chép</span>
                                  </>
                                )}
                              </button>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                ))
              )}

              {/* GENERATING INDICATOR */}
              {loading && (
                <div className="flex items-start gap-2.5 text-slate-500">
                  <div className="w-7 h-7 rounded-lg bg-gradient-to-tr from-indigo-600 to-purple-600 text-white flex items-center justify-center shrink-0 text-xs shadow-xs">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200 rounded-2xl rounded-bl-none px-4 py-2.5 text-xs flex items-center gap-2 shadow-2xs">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-slate-500 font-medium ml-1">AI Copilot đang phân tích...</span>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            {/* INPUT BAR */}
            {isAuthenticated && (
              <div className="p-3 bg-white border-t border-slate-200 shrink-0">
                <form
                  onSubmit={(e) => {
                    e.preventDefault();
                    handleSend();
                  }}
                  className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/30 focus-within:bg-white transition-all border border-slate-200/80"
                >
                  <input
                    ref={inputRef}
                    type="text"
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyDown}
                    placeholder="Đặt câu hỏi về tài liệu này..."
                    disabled={loading}
                    className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                  />
                  <button
                    type="submit"
                    disabled={!input.trim() || loading}
                    className="w-8 h-8 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 disabled:opacity-40 disabled:hover:from-indigo-600 text-white flex items-center justify-center transition-all cursor-pointer border-0 shrink-0 shadow-xs"
                    title="Gửi câu hỏi (Enter)"
                  >
                    <Send className="w-3.5 h-3.5" />
                  </button>
                </form>
                <div className="mt-1.5 flex items-center justify-between px-1 text-[10px] text-slate-400">
                  <span>Nhấn Enter để gửi</span>
                  <span>Được hỗ trợ bởi Google Gemini</span>
                </div>
              </div>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default ChatBox;
