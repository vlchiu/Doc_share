import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Bot, Sparkles, Send, X, RotateCcw, CornerDownLeft } from 'lucide-react';
import axiosClient from '../api/axiosClient';
import toast from 'react-hot-toast';

const SUGGESTIONS = [
  'DocShare là gì?',
  'Hôm nay thời tiết Hà Nội thế nào?',
  'Hướng dẫn tôi học lập trình',
  'Mấy giờ rồi?',
];

function GlobalChatBox() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, loading]);

  const handleSend = async () => {
    if (!input.trim() || loading) return;

    const userMessage = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage }]);
    setLoading(true);

    try {
      const res = await axiosClient.post('/chat/general', {
        message: userMessage,
        history: messages,
      });
      setMessages(prev => [...prev, { role: 'assistant', content: res.data.reply }]);
    } catch (err) {
      toast.error(err.response?.data?.message || 'Lỗi kết nối AI');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: 'Xin lỗi, không thể kết nối tới trợ lý AI lúc này. Vui lòng thử lại sau.'
      }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      {/* TRIGGER BUTTON */}
      {!open && (
        <motion.button
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.92 }}
          onClick={() => setOpen(true)}
          className="fixed bottom-6 right-6 z-50 flex items-center gap-2.5 px-4 py-3 rounded-full bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-700 text-white shadow-xl shadow-indigo-500/30 hover:shadow-indigo-500/50 transition-all border border-white/20 cursor-pointer"
          title="Hỏi AI bất cứ điều gì"
        >
          <div className="relative">
            <Bot className="w-5 h-5 text-white" />
            <span className="absolute -top-1 -right-1 w-2 h-2 rounded-full bg-emerald-400 ring-2 ring-indigo-700 animate-pulse" />
          </div>
          <span className="text-xs font-bold tracking-wide hidden sm:inline">AI Copilot</span>
        </motion.button>
      )}

      {/* CHAT POPUP */}
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.94 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.94 }}
            transition={{ duration: 0.22, ease: 'easeOut' }}
            className="fixed bottom-6 right-6 z-50 w-full sm:w-[420px] max-w-[calc(100vw-2rem)] h-[560px] max-h-[calc(100vh-5rem)] rounded-3xl bg-white shadow-2xl border border-slate-200/90 flex flex-col overflow-hidden"
          >
            {/* HEADER */}
            <div className="relative overflow-hidden bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white p-4 flex items-center justify-between border-b border-white/10 shrink-0">
              <div className="absolute top-0 right-0 w-32 h-32 bg-indigo-500/20 rounded-full blur-2xl pointer-events-none" />
              <div className="flex items-center gap-3 relative z-10">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center shadow-md shadow-indigo-500/30">
                  <Bot className="w-5 h-5" />
                </div>
                <div>
                  <div className="flex items-center gap-1.5 font-bold text-xs">
                    <span>DocShare AI Copilot</span>
                    <Sparkles className="w-3.5 h-3.5 text-amber-400" />
                  </div>
                  <div className="text-[10px] text-slate-400 flex items-center gap-1">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
                    Hỏi bất cứ điều gì
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1 relative z-10">
                {messages.length > 0 && (
                  <button onClick={() => setMessages([])} title="Cuộc hội thoại mới"
                    className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer">
                    <RotateCcw className="w-4 h-4" />
                  </button>
                )}
                <button onClick={() => setOpen(false)}
                  className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-white/10 transition-colors border-0 bg-transparent cursor-pointer">
                  <X className="w-4 h-4" />
                </button>
              </div>
            </div>

            {/* MESSAGES */}
            <div className="flex-1 overflow-y-auto p-4 space-y-3.5 bg-slate-50/70">
              {messages.length === 0 ? (
                <div className="py-6 px-2 text-center">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mx-auto mb-3 text-indigo-600 shadow-sm">
                    <Sparkles className="w-6 h-6" />
                  </div>
                  <h4 className="text-sm font-bold text-slate-800">Xin chào! Tôi có thể giúp gì?</h4>
                  <p className="text-xs text-slate-500 mt-1 max-w-xs mx-auto leading-relaxed">
                    Hỏi tôi về thời tiết, kiến thức, lập trình, hay bất cứ điều gì bạn cần.
                  </p>
                  <div className="mt-5 flex flex-col gap-1.5">
                    {SUGGESTIONS.map(q => (
                      <button key={q} onClick={() => setInput(q)}
                        className="text-left text-xs font-medium text-slate-700 bg-white hover:bg-indigo-50 hover:text-indigo-600 border border-slate-200/80 hover:border-indigo-200 p-2.5 rounded-xl transition-all shadow-sm cursor-pointer flex items-center justify-between group">
                        <span>{q}</span>
                        <CornerDownLeft className="w-3.5 h-3.5 text-slate-300 group-hover:text-indigo-500 shrink-0 ml-2" />
                      </button>
                    ))}
                  </div>
                </div>
              ) : (
                messages.map((msg, i) => (
                  <div key={i} className={`flex items-start gap-2.5 ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                    {msg.role === 'assistant' && (
                      <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0 mt-0.5">
                        <Bot className="w-4 h-4" />
                      </div>
                    )}
                    <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white rounded-br-none'
                        : 'bg-white text-slate-800 border border-slate-200/80 rounded-bl-none'
                    }`}
                      style={{ whiteSpace: 'pre-wrap', wordBreak: 'break-word' }}>
                      {msg.content}
                    </div>
                  </div>
                ))
              )}

              {loading && (
                <div className="flex items-center gap-2.5">
                  <div className="w-7 h-7 rounded-lg bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <Bot className="w-4 h-4" />
                  </div>
                  <div className="bg-white border border-slate-200/80 rounded-2xl rounded-bl-none px-4 py-2 text-xs flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.2s]" />
                    <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 animate-bounce [animation-delay:0.4s]" />
                    <span className="text-slate-400 ml-1">Đang xử lý...</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* INPUT */}
            <div className="p-3 bg-white border-t border-slate-200 shrink-0">
              <form onSubmit={e => { e.preventDefault(); handleSend(); }}
                className="flex items-center gap-2 rounded-2xl bg-slate-100 p-1.5 focus-within:ring-2 focus-within:ring-indigo-500/30 border border-slate-200/70">
                <input
                  type="text" value={input} onChange={e => setInput(e.target.value)}
                  placeholder="Hỏi bất cứ điều gì..." disabled={loading}
                  className="flex-1 bg-transparent px-3 py-1.5 text-xs text-slate-800 placeholder:text-slate-400 outline-none"
                />
                <button type="submit" disabled={!input.trim() || loading}
                  className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white flex items-center justify-center cursor-pointer border-0 shrink-0 transition-colors">
                  <Send className="w-3.5 h-3.5" />
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}

export default GlobalChatBox;
