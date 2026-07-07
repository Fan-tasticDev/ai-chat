import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import 'highlight.js/styles/github.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'AI Chat',
  description: 'AI 智能对话平台',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>{children}</body>
    </html>
  );
}