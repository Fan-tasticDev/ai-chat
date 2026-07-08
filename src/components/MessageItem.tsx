import React from "react";
import dynamic from "next/dynamic";
import { ChatMessage } from "@/lib/db"; // 导入消息类型

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), {
  loading: () => <div className="text-gray-400">加载中…</div>,
});

interface MessageItemProps {
  content: string;
  role: ChatMessage["role"]; // 允许所有角色
  isStreaming: boolean;
}

const MessageItem = React.memo(function MessageItem({
  content,
  role,
  isStreaming,
}: MessageItemProps) {
  // 不渲染 system 消息（如果有的话）
  if (role === "system") return null;

  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[80%] rounded-2xl bg-blue-500 text-white px-4 py-2 text-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

  // assistant 消息
  return (
    <div className="flex justify-start">
      <div className="max-w-[90%] md:max-w-[80%] rounded-2xl bg-gray-100 dark:bg-gray-800 px-4 py-2 text-sm">
        {isStreaming ? (
          <>
            <span className="whitespace-pre-wrap">{content}</span>
            <span className="inline-block w-1 h-4 bg-gray-500 ml-1 animate-pulse" />
          </>
        ) : (
          <MarkdownRenderer content={content} />
        )}
      </div>
    </div>
  );
});

export default MessageItem;