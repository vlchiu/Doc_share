const { randomUUID } = require("node:crypto");
module.exports = function chatFixture() {
  const conversations = new Map();
  let serial = 0,
    failNext = false;
  let loseResponse = false;
  return {
    conversations,
    loseOnce() {
      loseResponse = true;
    },
    failOnce() {
      failNext = true;
    },
    async handle(route, path) {
      if (!path.startsWith("/chat/conversations")) return false;
      const method = route.request().method();
      const body = route.request().postDataJSON() || {};
      const url = new URL(route.request().url());
      const id = path.split("/")[3];
      let data,
        status = 200;
      if (path === "/chat/conversations") {
        if (method === "GET")
          data = {
            conversations: [...conversations.values()]
              .map((row) => row.conversation)
              .reverse(),
            hasMore: false,
          };
        else {
          data = {
            id: randomUUID(),
            title: body.title,
            document_id: body.documentId,
            updated_at: new Date().toISOString(),
          };
          conversations.set(data.id, { conversation: data, messages: [] });
          status = 201;
        }
      } else {
        const row = conversations.get(id);
        if (!row) {
          status = 404;
          data = { message: "Không tìm thấy hội thoại." };
        } else if (method === "DELETE") {
          conversations.delete(id);
          data = {};
        } else if (method === "PATCH") {
          row.conversation.title = body.title;
          data = { title: body.title };
        } else if (method === "GET") {
          const all = row.messages.filter(
            (m) =>
              !url.searchParams.has("before") ||
              m.id < Number(url.searchParams.get("before")),
          );
          data = {
            conversation: row.conversation,
            messages: all.slice(-50),
            hasMore: all.length > 50,
          };
        } else {
          const previous = row.messages.filter(
            (m) => m.request_id === body.requestId,
          );
          if (previous.length) data = { messages: previous };
          else if (failNext) {
            failNext = false;
            status = 502;
            data = { message: "AI chưa thể trả lời. Hãy thử lại." };
          } else {
            const pair = [
              {
                id: ++serial,
                role: "user",
                content: body.message,
                request_id: body.requestId,
              },
              {
                id: ++serial,
                role: "assistant",
                content: "Đây là câu trả lời thử nghiệm.",
                request_id: body.requestId,
              },
            ];
            row.messages.push(...pair);
            data = { messages: pair };
          }
        }
      }
      if (
        loseResponse &&
        method === "POST" &&
        path.endsWith("/messages") &&
        status === 200
      ) {
        loseResponse = false;
        await route.abort("failed");
        return true;
      }
      await route.fulfill({ status, json: data });
      return true;
    },
  };
};
