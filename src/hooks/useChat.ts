// src/hooks/useChat.ts
import { useState, useCallback } from 'react';

export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

interface UseChatReturn {
  messages: ChatMessage[];
  isLoading: boolean;
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
}

export function useChat(): UseChatReturn {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const sendMessage = useCallback(async (content: string) => {
    const userMessage: ChatMessage = { role: 'user', content };
    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setIsLoading(true);

    // 创建一条占位的助手消息，内容会被流式填充
    const assistantMessage: ChatMessage = { role: 'assistant', content: '' };
    setMessages([...newMessages, assistantMessage]);

    try {
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          messages: newMessages.map(({ role, content }) => ({ role, content })),
        }),
      });

      if (!response.ok) {
        throw new Error('Network response was not ok');
      }

      if (!response.body) {
        throw new Error('ReadableStream not supported');
      }

      const reader = response.body.getReader();
      const decoder = new TextDecoder();
      let accumulatedContent = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        const chunk = decoder.decode(value, { stream: true });
        // SSE 格式可能一次收到多条消息，按换行分割
        const lines = chunk.split('\n').filter(line => line.trim() !== '');

        for (const line of lines) {
          // 只处理以 "data:" 开头的行
          if (line.startsWith('data:')) {
            const jsonStr = line.slice(5).trim();
            // SSE 结束标记
            if (jsonStr === '[DONE]') {
              continue;
            }
            try {
              const parsed = JSON.parse(jsonStr);
              const delta = parsed.choices?.[0]?.delta?.content;
              if (delta) {
                accumulatedContent += delta;
                // 更新助手消息内容（注意替换原消息）
                setMessages(prev => {
                  const updated = [...prev];
                  // 最后一条一定是助手消息，因为我们在前面添加了占位
                  updated[updated.length - 1] = {
                    role: 'assistant',
                    content: accumulatedContent,
                  };
                  return updated;
                });
              }
            } catch (e) {
              // 忽略解析错误（可能是不完整的数据块）
            }
          }
        }
      }
    } catch (error) {
      console.error('Stream error:', error);
      // 出错时给助手消息添加错误提示
      setMessages(prev => {
        const updated = [...prev];
        updated[updated.length - 1] = {
          role: 'assistant',
          content: '抱歉，请求出错了，请重试。',
        };
        return updated;
      });
    } finally {
      setIsLoading(false);
    }
  }, [messages]);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  return { messages, isLoading, sendMessage, clearMessages };
}