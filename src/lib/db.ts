// src/lib/db.ts
import { openDB, DBSchema } from 'idb';

// 类型定义保持不变
export interface ChatMessage {
  role: 'user' | 'assistant' | 'system';
  content: string;
}

export interface Conversation {
  id: string;
  title: string;
  messages: ChatMessage[];
  createdAt: number;
  updatedAt: number;
}

interface ChatDB extends DBSchema {
  conversations: {
    key: string;
    value: Conversation;
  };
}

// 数据库实例缓存，惰性初始化
let dbPromise: ReturnType<typeof openDB<ChatDB>> | null = null;

function getDB() {
  // 仅在客户端环境才初始化
  if (typeof indexedDB === 'undefined') {
    throw new Error('IndexedDB 不可用，请在浏览器环境中运行');
  }
  if (!dbPromise) {
    dbPromise = openDB<ChatDB>('ai-chat-db', 1, {
      upgrade(db) {
        if (!db.objectStoreNames.contains('conversations')) {
          db.createObjectStore('conversations', { keyPath: 'id' });
        }
      },
    });
  }
  return dbPromise;
}

// 工具函数
export const generateId = () => Date.now().toString(36) + Math.random().toString(36).slice(2);

export async function getAllConversations(): Promise<Conversation[]> {
  const db = await getDB();
  const list = await db.getAll('conversations');
  return list.sort((a, b) => b.updatedAt - a.updatedAt);
}

export async function saveConversation(conversation: Conversation): Promise<void> {
  const db = await getDB();
  await db.put('conversations', conversation);
}

export async function deleteConversation(id: string): Promise<void> {
  const db = await getDB();
  await db.delete('conversations', id);
}