"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversations } from "@/hooks/useConversations";
import { ChatMessage } from "@/lib/db";
import { ThemeToggle } from "@/components/ThemeToggle";
import MarkdownRenderer from "@/components/MarkdownRenderer";

export default function Home() {
  const {
    conversations,
    currentId,
    loading,
    createConversation,
    switchConversation,
    removeConversation,
    saveMessages,
  } = useConversations();

  // 手动获取当前会话
  const currentConversation = conversations.find(c => c.id === currentId) || null;

  const [displayMessages, setDisplayMessages] = useState<ChatMessage[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const baseMessages = currentConversation?.messages || [];

  // 切换会话时同步消息
  useEffect(() => {
    setDisplayMessages(baseMessages);
    setIsStreaming(false);
  }, [currentConversation]);

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !currentId) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...displayMessages, userMsg];
    setDisplayMessages(newMessages);
    setInput("");
    setIsStreaming(true);

    const assistantMsg: ChatMessage = { role: "assistant", content: "" };
    setDisplayMessages([...newMessages, assistantMsg]);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) throw new Error("Request failed");
      if (!response.body) throw new Error("No stream");

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulated = "";

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        const chunk = decoder.decode(value, { stream: true });
        const lines = chunk.split("\n").filter((line) => line.trim() !== "");
        for (const line of lines) {
          if (line.startsWith("data:")) {
            const jsonStr = line.slice(5).trim();
            if (jsonStr === "[DONE]") continue;
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulated += delta;
                setDisplayMessages((prev) => {
                  const updated = [...prev];
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulated,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      // 流式结束后保存最终消息
      const finalMessages = [...newMessages, { role: "assistant" as const, content: accumulated }];
      await saveMessages(currentId, finalMessages);
      setDisplayMessages(finalMessages);
    } catch (error) {
      console.error(error);
      setDisplayMessages((prev) => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: "assistant",
          content: "出错了，请重试。",
        };
        return updated;
      });
    } finally {
      setIsStreaming(false);
    }
  }, [input, isStreaming, currentId, displayMessages, saveMessages]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">加载中...</div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      {/* 移动端遮罩 */}
      {sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* 左侧栏 */}
      <aside
        className={`fixed md:static inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-900 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col transform transition-transform md:transform-none ${
          sidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <button
          onClick={() => setSidebarOpen(false)}
          className="self-end mb-2 md:hidden p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-800"
        >
          ✕
        </button>

        <button
          onClick={() => {
            createConversation();
            setSidebarOpen(false);
          }}
          className="mb-4 w-full bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 transition"
        >
          + 新建会话
        </button>

        <div className="flex-1 overflow-y-auto space-y-1">
          {conversations.map((conv) => (
            <div
              key={conv.id}
              className={`group flex items-center justify-between p-2 rounded-lg cursor-pointer ${
                conv.id === currentId
                  ? "bg-blue-100 dark:bg-blue-900"
                  : "hover:bg-gray-100 dark:hover:bg-gray-800"
              }`}
              onClick={() => {
                switchConversation(conv.id);
                setSidebarOpen(false);
              }}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {conv.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeConversation(conv.id);
                }}
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition ml-1"
              >
                ✕
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-gray-400 text-sm text-center mt-4">暂无会话</div>
          )}
        </div>
      </aside>

      {/* 右侧主区域 */}
      <main className="flex-1 flex flex-col min-w-0">
        <header className="flex items-center justify-between p-2 border-b border-gray-200 dark:border-gray-700 md:justify-end">
          <button
            onClick={() => setSidebarOpen(true)}
            className="md:hidden p-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
          <ThemeToggle />
        </header>

        <div className="flex-1 p-4 md:p-6 overflow-y-auto">
          {displayMessages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              {currentId ? "开始一段新对话" : "请先创建一个会话"}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {displayMessages.map((msg, idx) => {
                const isLastAssistant =
                  msg.role === "assistant" && idx === displayMessages.length - 1;
                const isStreamingMsg = isStreaming && isLastAssistant;

                return (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-[85%] md:max-w-[80%] rounded-2xl bg-blue-500 text-white px-4 py-2 text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[90%] md:max-w-[80%] rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm">
                        {isStreamingMsg ? (
                          <>
                            <span className="whitespace-pre-wrap">{msg.content}</span>
                            <span className="inline-block w-1 h-4 bg-gray-500 ml-1 animate-pulse" />
                          </>
                        ) : (
                          <MarkdownRenderer content={msg.content} />
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {currentId && (
          <div className="border-t border-gray-200 dark:border-gray-700 p-3 md:p-4">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="输入消息..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-3 py-2 text-sm md:text-base focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                disabled={isStreaming}
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="bg-blue-500 text-white px-4 py-2 text-sm md:text-base rounded-lg hover:bg-blue-600 transition disabled:opacity-50 disabled:cursor-not-allowed"
              >
                发送
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}