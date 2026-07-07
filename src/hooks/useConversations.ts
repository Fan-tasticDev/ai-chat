'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Conversation,
  ChatMessage,
  getAllConversations,
  saveConversation,
  deleteConversation as deleteFromDB,
  generateId,
} from '@/lib/db';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  // 初始化：从 IndexedDB 加载会话列表
  useEffect(() => {
    getAllConversations().then(list => {
      setConversations(list);
      if (list.length > 0) {
        setCurrentId(list[0].id); // 默认选中第一个
      }
      setLoading(false);
    });
  }, []);

  // 当前选中的会话对象
  const currentConversation = conversations.find(c => c.id === currentId) || null;

  // 创建新会话
  const createConversation = useCallback(async () => {
    const newConv: Conversation = {
      id: generateId(),
      title: '新对话',
      messages: [],
      createdAt: Date.now(),
      updatedAt: Date.now(),
    };
    await saveConversation(newConv);
    setConversations(prev => [newConv, ...prev]);
    setCurrentId(newConv.id);
  }, []);

  // 切换会话
  const switchConversation = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  // 删除会话
  const removeConversation = useCallback(async (id: string) => {
    await deleteFromDB(id);
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      // 如果删除的是当前会话，切换到第一个
      if (id === currentId) {
        setCurrentId(updated.length > 0 ? updated[0].id : null);
      }
      return updated;
    });
  }, [currentId]);

  // 更新当前会话的消息（由聊天组件调用）
  const updateCurrentMessages = useCallback(async (messages: ChatMessage[]) => {
    if (!currentId) return;
    setConversations(prev =>
      prev.map(c => {
        if (c.id === currentId) {
          const updated = { ...c, messages, updatedAt: Date.now(), title: getTitleFromMessages(messages) };
          // 异步保存到数据库，不阻塞
          saveConversation(updated);
          return updated;
        }
        return c;
      })
    );
  }, [currentId]);

  return {
    conversations,
    currentConversation,
    currentId,
    loading,
    createConversation,
    switchConversation,
    removeConversation,
    updateCurrentMessages,
  };
}

// 辅助函数：根据消息自动生成会话标题
function getTitleFromMessages(messages: ChatMessage[]): string {
  const firstUserMsg = messages.find(m => m.role === 'user');
  if (firstUserMsg) {
    return firstUserMsg.content.slice(0, 20) + (firstUserMsg.content.length > 20 ? '...' : '');
  }
  return '新对话';
}