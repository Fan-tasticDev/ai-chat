// src/app/layout.tsx
import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import "highlight.js/styles/github.css";
import "highlight.js/styles/github-dark.css";
import { ThemeProvider } from "@/components/ThemeProvider";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "AI 智能对话平台 - 流式聊天机器人",
  description:
    "基于通义千问大模型的 AI 对话应用，支持流式应答、多会话管理、Markdown 渲染与代码高亮，适配桌面与移动端。",
  keywords: ["AI", "聊天机器人", "Next.js", "大模型", "前端项目"],
  authors: [{ name: "你的名字" }],
  openGraph: {
    title: "AI 智能对话平台",
    description: "流式 AI 对话，代码高亮，多会话管理",
    type: "website",
  },
   manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN" suppressHydrationWarning>
      <body className={inter.className}>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
