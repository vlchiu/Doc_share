import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
export default function ChatBox({ documentId, isAuthenticated }) {
  return (
    <Link
      to={isAuthenticated ? `/ai-chat?document=${documentId}` : "/login"}
      className="fixed bottom-6 right-6 z-30 ds-button-primary shadow-lg"
    >
      <Bot size={20} />
      Hỏi AI về tài liệu
    </Link>
  );
}
