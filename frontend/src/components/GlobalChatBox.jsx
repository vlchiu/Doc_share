import { Link } from "react-router-dom";
import { Bot } from "lucide-react";
export default function GlobalChatBox() {
  return (
    <Link
      to="/ai-chat"
      className="fixed bottom-6 right-6 z-30 ds-button-primary shadow-lg"
    >
      <Bot size={20} />
      Mở AI Chat
    </Link>
  );
}
