'use client';

import { useState, useEffect, useCallback } from 'react';
import {
  Conversation,
  getAllConversations,
  saveConversation,
  deleteConversation as deleteFromDB,
  generateId,
} from '@/lib/db';

export function useConversations() {
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [currentId, setCurrentId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getAllConversations().then(list => {
      setConversations(list);
      if (list.length > 0) {
        setCurrentId(list[0].id);
      }
      setLoading(false);
    });
  }, []);

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
    return newConv;
  }, []);

  const switchConversation = useCallback((id: string) => {
    setCurrentId(id);
  }, []);

  const removeConversation = useCallback(async (id: string): Promise<string | null> => {
    await deleteFromDB(id);
    let nextId: string | null = null;
    setConversations(prev => {
      const updated = prev.filter(c => c.id !== id);
      if (id === currentId) {
        nextId = updated.length > 0 ? updated[0].id : null;
        setCurrentId(nextId);
      }
      return updated;
    });
    // 由于 setState 是异步的，直接在回调内计算的 nextId 是正确的
    return new Promise(resolve => {
      // 等待一个微任务确保 state 已更新
      setTimeout(() => resolve(nextId), 0);
    });
  }, [currentId]);

  const saveMessages = useCallback(async (id: string, messages: import('@/lib/db').ChatMessage[]) => {
    setConversations(prev => {
      const target = prev.find(c => c.id === id);
      if (!target) return prev;
      const title = messages.find(m => m.role === 'user')?.content.slice(0, 20) + '...' || '新对话';
      const updated: Conversation = {
        ...target,
        messages,
        updatedAt: Date.now(),
        title,
      };
      saveConversation(updated);
      return prev.map(c => (c.id === id ? updated : c));
    });
  }, []);

  return {
    conversations,
    currentId,
    loading,
    createConversation,
    switchConversation,
    removeConversation,
    saveMessages,
  };
}