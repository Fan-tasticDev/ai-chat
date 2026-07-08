// src/components/MessageItem.tsx
import React from "react";
// import MarkdownRenderer from "./MarkdownRenderer";
import dynamic from "next/dynamic";

interface MessageItemProps {
  content: string;
  role: "user" | "assistant" | "system";
  isStreaming: boolean;
}

const MarkdownRenderer = dynamic(() => import("./MarkdownRenderer"), {
  loading: () => <div className="text-gray-400">加载中…</div>,
});

const MessageItem = React.memo(function MessageItem({
  content,
  role,
  isStreaming,
}: MessageItemProps) {
  if (role === "user") {
    return (
      <div className="flex justify-end">
        <div className="max-w-[85%] md:max-w-[80%] rounded-2xl bg-blue-500 text-white px-4 py-2 text-sm whitespace-pre-wrap">
          {content}
        </div>
      </div>
    );
  }

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
