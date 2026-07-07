"use client";

import { useState, useRef, useEffect, useCallback } from "react";
import { useConversations } from "@/hooks/useConversations";
import { ChatMessage } from "@/lib/db";
import MarkdownRenderer from "@/components/MarkdownRenderer";
import ErrorBoundary from "@/components/ErrorBoundary";

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

  const [isStreaming, setIsStreaming] = useState(false);
  const [input, setInput] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const activeChatId = useRef<string | null>(null);
  const accumulatedRef = useRef("");

  // 流式过程中的临时消息（覆盖显示）
  const [streamingMessages, setStreamingMessages] = useState<
    ChatMessage[] | null
  >(null);

  const [showDebug, setShowDebug] = useState(false);

  // 当前实际显示的消息：流式中用 streamingMessages，否则从 conversations 获取
  const currentConversation =
    conversations.find((c) => c.id === currentId) || null;
  const baseMessages = currentConversation ? currentConversation.messages : [];
  const displayMessages =
    streamingMessages !== null ? streamingMessages : baseMessages;

  // 新建会话
  const handleCreate = useCallback(async () => {
    if (isStreaming) return;
    await createConversation();
  }, [isStreaming, createConversation]);

  // 删除会话
  const handleDelete = useCallback(
    async (id: string) => {
      if (isStreaming) return;
      await removeConversation(id);
    },
    [isStreaming, removeConversation],
  );

  // 自动滚动
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [displayMessages]);

  // 发送消息
  const handleSend = useCallback(async () => {
    const trimmed = input.trim();
    if (!trimmed || isStreaming || !currentId || !currentConversation) return;

    const userMsg: ChatMessage = { role: "user", content: trimmed };
    const newMessages = [...currentConversation.messages, userMsg];
    setInput("");
    setIsStreaming(true);
    activeChatId.current = currentId;
    accumulatedRef.current = "";

    // 开启流式显示，包含用户消息和空助手占位
    setStreamingMessages([...newMessages, { role: "assistant", content: "" }]);

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
                accumulatedRef.current += delta;
                if (activeChatId.current !== currentId) return;
                setStreamingMessages((prev) => {
                  if (!prev) return prev;
                  const updated = [...prev];
                  if (updated.length === 0) return updated;
                  updated[updated.length - 1] = {
                    role: "assistant",
                    content: accumulatedRef.current,
                  };
                  return updated;
                });
              }
            } catch {}
          }
        }
      }

      const finalMessages = [
        ...newMessages,
        { role: "assistant" as const, content: accumulatedRef.current },
      ];

      // 保存到 IndexedDB
      await saveMessages(currentId, finalMessages);
      // 关闭流式模式，显示会切回 baseMessages（此时 conversations 已更新）
      setStreamingMessages(null);
    } catch (error) {
      console.error(error);
      if (activeChatId.current !== currentId) {
        setStreamingMessages(null);
        return;
      }
      setStreamingMessages((prev) => {
        if (!prev) return prev;
        const updated = [...prev];
        if (updated.length > 0) {
          updated[updated.length - 1] = {
            role: "assistant",
            content: "出错了，请重试。",
          };
        }
        return updated;
      });
    } finally {
      setIsStreaming(false);
      // 注意：不在这里清除 streamingMessages，已在成功或错误时处理
    }
  }, [input, isStreaming, currentId, currentConversation, saveMessages]);

  if (loading) {
    return (
      <div className="flex h-screen items-center justify-center text-gray-400">
        加载中...
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-white dark:bg-gray-900">
      <aside className="w-64 border-r border-gray-200 dark:border-gray-700 p-4 flex flex-col">
        <button
          onClick={handleCreate}
          disabled={isStreaming}
          className="mb-4 w-full bg-blue-500 text-white rounded-lg py-2 hover:bg-blue-600 transition disabled:opacity-50"
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
              onClick={() => !isStreaming && switchConversation(conv.id)}
            >
              <span className="text-sm text-gray-700 dark:text-gray-300 truncate flex-1">
                {conv.title}
              </span>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  handleDelete(conv.id);
                }}
                className="text-red-400 hover:text-red-600 opacity-0 group-hover:opacity-100 transition ml-1"
              >
                ✕
              </button>
            </div>
          ))}
          {conversations.length === 0 && (
            <div className="text-gray-400 text-sm text-center mt-4">
              暂无会话
            </div>
          )}
        </div>
      </aside>

      <main className="flex-1 flex flex-col">
        {/* 调试面板 */}
        <div className="bg-yellow-100 dark:bg-yellow-900 p-2 text-xs">
          <button
            onClick={() => setShowDebug(!showDebug)}
            className="underline mb-1"
          >
            Toggle Debug
          </button>
          {showDebug && (
            <>
              <div>
                <strong>currentId:</strong> {currentId}
              </div>
              <div>
                <strong>conversations.length:</strong> {conversations.length}
              </div>
              <div>
                <strong>当前会话消息条数:</strong> {baseMessages.length}
              </div>
              <pre className="max-h-40 overflow-auto">
                {JSON.stringify(baseMessages.slice(-2), null, 2)}
              </pre>
              <div>
                <strong>displayMessages 条数:</strong> {displayMessages.length}
              </div>
              <pre className="max-h-40 overflow-auto">
                {JSON.stringify(displayMessages.slice(-2), null, 2)}
              </pre>
            </>
          )}
        </div>
        <div className="flex-1 p-6 overflow-y-auto">
          {displayMessages.length === 0 ? (
            <div className="text-center text-gray-400 mt-20">
              {currentId ? "开始一段新对话" : "请先创建一个会话"}
            </div>
          ) : (
            <div className="max-w-4xl mx-auto space-y-4">
              {displayMessages.map((msg, idx) => {
                const isLastAssistant =
                  msg.role === "assistant" &&
                  idx === displayMessages.length - 1;
                const isStreamingMsg = isStreaming && isLastAssistant;

                return (
                  <div
                    key={idx}
                    className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
                  >
                    {msg.role === "user" ? (
                      <div className="max-w-[80%] rounded-2xl bg-blue-500 text-white px-4 py-2 text-sm whitespace-pre-wrap">
                        {msg.content}
                      </div>
                    ) : (
                      <div className="max-w-[80%] rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm">
                        {isStreamingMsg ? (
                          <>
                            <span className="whitespace-pre-wrap">
                              {msg.content}
                            </span>
                            <span className="inline-block w-1 h-4 bg-gray-500 ml-1 animate-pulse" />
                          </>
                        ) : (
                          <ErrorBoundary
                            fallback={
                              <div className="whitespace-pre-wrap break-words">
                                {msg.content}
                              </div>
                            }
                          >
                            <MarkdownRenderer content={msg.content} />
                          </ErrorBoundary>
                          // <div className="whitespace-pre-wrap break-words">{msg.content}</div>
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
          <div className="border-t border-gray-200 dark:border-gray-700 p-4">
            <div className="flex gap-2 max-w-4xl mx-auto">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleSend()}
                placeholder="输入消息..."
                className="flex-1 border border-gray-300 dark:border-gray-600 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-800 dark:text-gray-100"
                disabled={isStreaming}
              />
              <button
                onClick={handleSend}
                disabled={isStreaming || !input.trim()}
                className="bg-blue-500 text-white px-6 py-2 rounded-lg hover:bg-blue-600 transition disabled:opacity-50"
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
