
"use client";

import { useState, useEffect } from "react";
import {
  Menu,
  Plus,
  MessageSquare,
  Send,
  Sparkles,
  PanelLeftClose,
  X,
  LoaderCircle,
  Bot,
  User,
  LogOut,
  Copy,
  Check,
  Trash2,
  Pencil
} from "lucide-react";
import { sendChatMessage,getConversations,getConversationMessages,type Conversation, editChatMessage, } from "../lib/api";
import { useRouter } from "next/navigation";
import { deleteConversation } from "../lib/api";

interface ChatMessage {
  id?: string;
  role: "user" | "assistant";
  content: string;
}

const suggestions = [
  "Explain Python decorators",
  "Help me build a FastAPI API",
  "Explain machine learning simply",
  "Write a React component",
];

export default function Home() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [historyError, setHistoryError] = useState("");
  const [message, setMessage] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [chatStarted, setChatStarted] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [conversationId, setConversationId] = useState<string | undefined>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  const [authChecking, setAuthChecking] = useState(true);
  const [editingIndex, setEditingIndex] = useState<number | null>(null);
  const [editedText, setEditedText] = useState("");
  const [editLoading, setEditLoading] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  async function handleSend(text?: string) {
    const userMessage = (text ?? message).trim();

    if (!userMessage || loading) return;

    // Read the JWT saved during login.
    const token = sessionStorage.getItem("access_token");

    if (!token) {
      setError("Please log in first to use the chatbot.");
      return;
    }

    setChatStarted(true);
    setMessage("");
    setError("");
    setLoading(true);

    // Display the user's message immediately.
    setMessages((previous) => [
      ...previous,
      { role: "user", content: userMessage },
    ]);

    try {
      const result = await sendChatMessage(
        userMessage,
        token,
        conversationId,
      );

      // Remember the ID so the next message continues this conversation.
      setConversationId(result.conversation_id);
      // Refresh the sidebar with the latest backend history.
      const updatedHistory = await getConversations(token);
      setConversations(updatedHistory.items);

      // Display the real response returned by FastAPI and Groq.
      setMessages((previous) => [
        ...previous,
        { role: "assistant", content: result.reply },
      ]);
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleCopy(content: string, index: number) {
  try {
    await navigator.clipboard.writeText(content);
    setCopiedIndex(index);

    window.setTimeout(() => {
      setCopiedIndex((current) =>
        current === index ? null : current
      );
    }, 1500);
  } catch {
    setError("Unable to copy this message.");
  }
}

async function handleOpenConversation(conversation: Conversation) {
  const token = sessionStorage.getItem("access_token");

  if (!token) {
    setError("Please log in to view your conversations.");
    return;
  }

  setLoading(true);
  setError("");

  try {
    const result = await getConversationMessages(
      conversation.id,
      token
    );

    setConversationId(result.conversation_id);
    setMessages(
      result.messages.map((item) => ({
         id: item.id,
    role: item.role,
    content: item.content,
      }))
    );

    setChatStarted(true);
    setMessage("");
    setSidebarOpen(false);
  } catch (err) {
    console.error("Failed to load conversation:", err);
    setError("Could not load this conversation. Please try again.");
  } finally {
    setLoading(false);
  }
}


async function handleSaveEdit() {
    console.log("Save & Send clicked");

  if (editingIndex === null || !conversationId) {
    setError("Open a saved conversation before editing a message.");
    return;
  }

  const editedMessage = messages[editingIndex];

  if (!editedMessage?.id) {
    setError("This message has no saved ID. Please reopen the conversation.");
    return;
  }

  const updatedText = editedText.trim();

  if (!updatedText) {
    setError("Message cannot be empty.");
    return;
  }

  const token = sessionStorage.getItem("access_token");

  if (!token) {
    setError("Please log in again.");
    return;
  }

  setEditLoading(true);
  setError("");


try {
  const editResult = await editChatMessage(
    conversationId,
    editedMessage.id,
    updatedText,
    token,
  );

  console.log("EDIT API RESPONSE:", editResult);

  const result = await getConversationMessages(
    conversationId,
    token,
  );

  console.log("GET MESSAGES RESPONSE:", result);

  setMessages(
    result.messages.map((item) => ({
      id: item.id,
      role: item.role,
      content: item.content,
    })),
  );

  setEditingIndex(null);
  setEditedText("");
}
 finally {
  setEditLoading(false);
}
}




function handleLogout() {
  // Remove the saved access token
  sessionStorage.removeItem("access_token");

  // Clear the current chat from the screen
  setMessages([]);
  setConversationId(undefined);
  setMessage("");
  setConversations([]);
  setChatStarted(false);
  setError("");

  // Return to the login page
  window.location.href = "/login";
}



async function handleDeleteConversation(id: string) {
  const token = sessionStorage.getItem("access_token");

  if (!token) {
    setError("Please log in again.");
    return;
  }

  try {
    setError("");

    await deleteConversation(id, token);

    setConversations((current) =>
      current.filter((conversation) => conversation.id !== id)
    );

    // Clear the chat if the deleted conversation is currently open
    if (id === conversationId) {
      setMessages([]);
      setConversationId(undefined);
      setChatStarted(false);
    }
  } catch (err) {
    setError(
      err instanceof Error
        ? err.message
        : "Unable to delete conversation."
    );
  }
}




  function handleNewChat() {
    setMessages([]);
    setConversationId(undefined);
    setMessage("");
    setError("");
    setChatStarted(false);
    setSidebarOpen(false);
  }

  useEffect(() => {
  async function loadConversations() {
    const token = sessionStorage.getItem("access_token");

    if (!token) return;

    setHistoryLoading(true);
    setHistoryError("");

    try {
      const result = await getConversations(token);
      setConversations(result.items);
    } catch (err) {
      setHistoryError(
        err instanceof Error
          ? err.message
          : "Could not load conversation history.",
      );
    } finally {
      setHistoryLoading(false);
    }
  }

  void loadConversations();
}, []);

useEffect(() => {
  const token = sessionStorage.getItem("access_token");

  if (!token) {
    router.replace("/login");
    return;
  }

  setAuthChecking(false);
}, [router]);

  return (
    <main className="flex h-dvh overflow-hidden bg-white text-slate-900">
      {sidebarOpen && (
        <button
          aria-label="Close sidebar backdrop"
          className="fixed inset-0 z-20 bg-black/30 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-30 flex w-72 flex-col border-r border-slate-200 bg-slate-50 p-4 transition-transform duration-300 md:static md:translate-x-0 ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="mb-6 flex items-center justify-between">
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-600 text-white">
              <Sparkles size={19} />
            </div>
            <span>Nova AI</span>
          </div>

          <button
            aria-label="Close sidebar"
            className="rounded-lg p-2 hover:bg-slate-200 md:hidden"
            onClick={() => setSidebarOpen(false)}
          >
            <X size={19} />
          </button>
        </div>

        <button
          onClick={handleNewChat}
          className="flex items-center justify-center gap-2 rounded-xl bg-violet-600 px-4 py-3 text-sm font-medium text-white transition hover:bg-violet-700"
        >
          <Plus size={18} />
          New chat
        </button>

        <p className="mb-3 mt-8 text-xs font-semibold uppercase tracking-wider text-slate-400">
          Recent conversations
        </p>

       
<div className="flex-1 space-y-1 overflow-y-auto">
  {historyLoading && (
    <p className="px-3 py-2 text-sm text-slate-500">
      Loading conversations...
    </p>
  )}

  {historyError && (
    <p className="px-3 py-2 text-sm text-red-600">
      {historyError}
    </p>
  )}

  {!historyLoading &&
    !historyError &&
    conversations.length === 0 && (
      <p className="px-3 py-2 text-sm text-slate-500">
        No conversations yet.
      </p>
    )}

  
{conversations.map((conversation) => (
  <div
    key={conversation.id}
    className="group flex items-center gap-1 rounded-lg transition hover:bg-slate-200"
  >
    <button
      type="button"
      onClick={() => handleOpenConversation(conversation)}
      className="flex min-w-0 flex-1 items-center gap-3 rounded-lg px-3 py-3 text-left text-sm text-slate-600"
    >
      <MessageSquare size={17} className="shrink-0" />
      <span className="truncate">{conversation.title}</span>
    </button>

    <button
      type="button"
      title="Delete conversation"
      aria-label={`Delete ${conversation.title}`}
      onClick={() =>
        void handleDeleteConversation(conversation.id)
      }
      className="mr-2 rounded-lg p-2 text-slate-400 transition hover:bg-red-100 hover:text-red-600"
    >
      <Trash2 size={16} />
    </button>
  </div>
))}

</div>


        <button
          type="button"
          onClick={handleLogout}
        className="flex w-full items-center gap-3 rounded-xl px-4 py-3 text-sm text-gray-600 transition hover:bg-red-50 hover:text-red-600 dark:text-gray-300 dark:hover:bg-red-950/30"
        >
          <LogOut size={18} />
          <span>Logout</span>
        </button>

      </aside>

      <section className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-16 shrink-0 items-center justify-between border-b border-slate-100 px-4 sm:px-6">
          <div className="flex items-center gap-3">
            <button
              aria-label="Open sidebar"
              className="rounded-lg p-2 transition hover:bg-slate-100 md:hidden"
              onClick={() => setSidebarOpen(true)}
            >
              <Menu size={21} />
            </button>

            <PanelLeftClose
              size={20}
              className="hidden text-slate-400 md:block"
            />

            <span className="font-medium">AI Assistant</span>
          </div>

          <div className="rounded-full border border-slate-200 px-3 py-1.5 text-xs text-slate-500">
            Powered by Groq
          </div>
        </header>

        <div className="flex flex-1 flex-col overflow-y-auto">
          {!chatStarted ? (
            <div className="m-auto w-full max-w-3xl px-4 py-10 sm:px-8">
              <div className="mx-auto mb-5 flex h-14 w-14 items-center justify-center rounded-2xl bg-violet-100 text-violet-700">
                <Sparkles size={28} />
              </div>

              <h1 className="text-center text-3xl font-semibold tracking-tight sm:text-4xl">
                What can I help you with?
              </h1>

              <p className="mt-3 text-center text-sm text-slate-500 sm:text-base">
                Ask questions, explore ideas, or build something amazing.
              </p>

              <div className="mt-9 grid grid-cols-1 gap-3 sm:grid-cols-2">
                {suggestions.map((suggestion) => (
                  <button
                    key={suggestion}
                    onClick={() => handleSend(suggestion)}
                    disabled={loading}
                    className="rounded-2xl border border-slate-200 p-4 text-left text-sm transition hover:border-violet-300 hover:bg-violet-50 disabled:opacity-50"
                  >
                    <Sparkles
                      size={17}
                      className="mb-3 text-violet-600"
                    />
                    {suggestion}
                  </button>
                ))}
              </div>
            </div>
          ) : (
            <div className="mx-auto w-full max-w-3xl space-y-6 px-4 py-8 sm:px-8">
              

{messages.map((chatMessage, index) => (
  <div
    key={chatMessage.id ?? `${index}-${chatMessage.role}`}
    className={`group flex gap-3 ${
      chatMessage.role === "user" ? "justify-end" : "justify-start"
    }`}
  >
    {chatMessage.role === "assistant" && (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
        <Bot size={19} />
      </div>
    )}

    <div
      className={`min-w-0 max-w-[85%] ${
        chatMessage.role === "user"
          ? "rounded-2xl bg-violet-600 px-4 py-3 text-white"
          : "flex-1 text-slate-800"
      }`}
    >
      {editingIndex === index && chatMessage.role === "user" ? (
        <div className="min-w-[240px] space-y-2">
          <textarea
            value={editedText}
            onChange={(event) => setEditedText(event.target.value)}
            rows={3}
            maxLength={2000}
            disabled={editLoading}
            className="w-full resize-y rounded-lg border border-violet-200 bg-white p-3 text-sm leading-6 text-slate-800 outline-none focus:ring-2 focus:ring-violet-400"
            autoFocus
          />

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => void handleSaveEdit()}
              disabled={editLoading || !editedText.trim()}
              className="rounded-lg bg-white px-3 py-2 text-xs font-semibold text-violet-700 hover:bg-violet-50 disabled:opacity-50"
            >
              {editLoading ? "Generating..." : "Save & Send"}
            </button>

            <button
              type="button"
              onClick={() => {
                setEditingIndex(null);
                setEditedText("");
                setError("");
              }}
              disabled={editLoading}
              className="rounded-lg px-3 py-2 text-xs text-white hover:bg-violet-500 disabled:opacity-50"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="whitespace-pre-wrap break-words text-sm leading-7">
          {chatMessage.content}
        </div>
      )}

      {!(editingIndex === index && chatMessage.role === "user") && (
        <div
          className={`mt-2 flex items-center gap-1 opacity-100 transition sm:opacity-0 sm:group-hover:opacity-100 ${
            chatMessage.role === "user" ? "justify-end" : "justify-start"
          }`}
        >
          <button
            type="button"
            onClick={() => void handleCopy(chatMessage.content, index)}
            aria-label="Copy message"
            title={copiedIndex === index ? "Copied" : "Copy message"}
            className="inline-flex items-center gap-1 rounded-lg p-2 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-violet-700"
          >
            {copiedIndex === index ? (
              <Check size={15} />
            ) : (
              <Copy size={15} />
            )}
            <span>{copiedIndex === index ? "Copied" : "Copy"}</span>
          </button>

          {chatMessage.role === "user" && (
            <button
              type="button"
              onClick={() => {
                setEditingIndex(index);
                setEditedText(chatMessage.content);
                setError("");
              }}
              disabled={loading || editLoading}
              aria-label="Edit message"
              title="Edit message"
              className="inline-flex items-center gap-1 rounded-lg p-2 text-xs text-slate-500 transition hover:bg-slate-100 hover:text-violet-700 disabled:opacity-50"
            >
              <Pencil size={15} />
              <span>Edit</span>
            </button>
          )}
        </div>
      )}
    </div>

    {chatMessage.role === "user" && (
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-slate-200 text-slate-700">
        <User size={19} />
      </div>
    )}
  </div>
))}



              {loading && (
                <div className="flex items-center gap-3 text-sm text-slate-500">
                  <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-violet-100 text-violet-700">
                    <Bot size={19} />
                  </div>
                  <LoaderCircle size={18} className="animate-spin" />
                  Nova AI is thinking...
                </div>
              )}

              <div aria-live="polite">
                {error && (
                  <p
                    role="alert"
                    className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700"
                  >
                    {error}
                  </p>
                )}
              </div>
            </div>
          )}
        </div>

        <div className="shrink-0 px-3 pb-4 pt-2 sm:px-6 sm:pb-6">
          <div className="mx-auto max-w-3xl">
            {error && !chatStarted && (
              <p role="alert" className="mb-2 text-sm text-red-600">
                {error}
              </p>
            )}

            <div className="flex items-end gap-2 rounded-2xl border border-slate-200 bg-white p-2 shadow-sm transition focus-within:border-violet-400 focus-within:ring-4 focus-within:ring-violet-100">
              <textarea
                value={message}
                onChange={(event) => setMessage(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault();
                    void handleSend();
                  }
                }}
                placeholder="Message Nova AI..."
                rows={2}
                disabled={loading}
                className="max-h-40 min-h-12 flex-1 resize-none bg-transparent px-3 py-3 text-sm outline-none placeholder:text-slate-400 disabled:opacity-60"
              />

              <button
                aria-label="Send message"
                onClick={() => void handleSend()}
                disabled={!message.trim() || loading}
                className="mb-1 flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-violet-600 text-white transition hover:bg-violet-700 disabled:cursor-not-allowed disabled:opacity-40"
              >
                {loading ? (
                  <LoaderCircle size={18} className="animate-spin" />
                ) : (
                  <Send size={18} />
                )}
              </button>
            </div>

            <p className="mt-2 text-center text-xs text-slate-400">
              AI can make mistakes. Check important information.
            </p>
          </div>
        </div>
      </section>
    </main>
  );
}
