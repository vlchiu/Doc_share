CREATE TABLE "Conversation" (
  "id" TEXT NOT NULL PRIMARY KEY,
  "user_id" INTEGER NOT NULL,
  "document_id" INTEGER,
  "title" VARCHAR(120) NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updated_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "busy_token" TEXT,
  "busy_until" TIMESTAMP(3),
  CONSTRAINT "Conversation_user_id_fkey" FOREIGN KEY ("user_id") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT "Conversation_document_id_fkey" FOREIGN KEY ("document_id") REFERENCES "Document"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE INDEX "Conversation_user_id_updated_at_id_idx" ON "Conversation"("user_id", "updated_at", "id");
CREATE TABLE "ChatMessage" (
  "id" SERIAL NOT NULL PRIMARY KEY,
  "conversation_id" TEXT NOT NULL,
  "request_id" TEXT NOT NULL,
  "role" VARCHAR(16) NOT NULL CHECK ("role" IN ('user', 'assistant')),
  "content" TEXT NOT NULL,
  "created_at" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ChatMessage_conversation_id_fkey" FOREIGN KEY ("conversation_id") REFERENCES "Conversation"("id") ON DELETE CASCADE ON UPDATE CASCADE
);
CREATE UNIQUE INDEX "ChatMessage_conversation_id_request_id_role_key" ON "ChatMessage"("conversation_id", "request_id", "role");
CREATE INDEX "ChatMessage_conversation_id_id_idx" ON "ChatMessage"("conversation_id", "id");
