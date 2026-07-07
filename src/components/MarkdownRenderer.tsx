'use client';

import React, { useState, useCallback, ReactElement } from 'react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import hljs from 'highlight.js/lib/core';
import javascript from 'highlight.js/lib/languages/javascript';
import python from 'highlight.js/lib/languages/python';
import bash from 'highlight.js/lib/languages/bash';
import 'highlight.js/styles/github.css'; // 可替换为你喜欢的主题

// 注册常用语言，可根据需要扩展
hljs.registerLanguage('javascript', javascript);
hljs.registerLanguage('python', python);
hljs.registerLanguage('bash', bash);

interface MarkdownRendererProps {
  content: string;
}

export default function MarkdownRenderer({ content }: MarkdownRendererProps) {
  // 剥离最外层的 markdown 代码块
  const trimmed = content.trim();
  let markdownContent = trimmed;
  const codeBlockMatch = trimmed.match(/^```markdown\s*\n([\s\S]*?)\n```$/);
  if (codeBlockMatch) {
    markdownContent = codeBlockMatch[1];
  } else if (trimmed.startsWith('```') && trimmed.endsWith('```')) {
    // 通用代码块剥离
    const innerMatch = trimmed.match(/^```(?:\w+)?\s*\n([\s\S]*?)\n```$/);
    if (innerMatch) markdownContent = innerMatch[1];
  }

  if (!markdownContent.trim()) {
    return <span className="text-gray-400 italic">[空消息]</span>;
  }

  return (
    <div className="prose prose-sm dark:prose-invert max-w-none break-words text-gray-900 dark:text-gray-100">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          code({ className, children, ...props }) {
            const match = /language-(\w+)/.exec(className || '');
            const codeString = String(children).replace(/\n$/, '');
            if (match) {
              // 代码块：高亮 + 复制
              const language = match[1];
              let highlighted = codeString;
              try {
                highlighted = hljs.highlight(codeString, {
                  language,
                  ignoreIllegals: true,
                }).value;
              } catch {}
              return (
                <CodeBlock code={codeString} language={language}>
                  <code dangerouslySetInnerHTML={{ __html: highlighted }} />
                </CodeBlock>
              );
            }
            // 行内代码
            return (
              <code className="bg-gray-100 dark:bg-gray-800 px-1 py-0.5 rounded text-sm font-mono text-pink-500">
                {children}
              </code>
            );
          },
          pre({ children }) {
            // 代码块外层容器在 CodeBlock 中处理，这里直接返回
            return <>{children}</>;
          },
        }}
      >
        {markdownContent}
      </ReactMarkdown>
    </div>
  );
}

// 带复制按钮的代码块组件
function CodeBlock({
  code,
  language,
  children,
}: {
  code: string;
  language: string;
  children: React.ReactNode;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = useCallback(async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [code]);

  return (
    <div className="relative group my-2">
      <div className="flex items-center justify-between bg-gray-200 dark:bg-gray-700 rounded-t-lg px-4 py-1 text-xs text-gray-700 dark:text-gray-300">
        <span>{language}</span>
        <button
          onClick={handleCopy}
          className="text-blue-500 hover:text-blue-700 dark:text-blue-300"
        >
          {copied ? '已复制' : '复制'}
        </button>
      </div>
      <pre className="bg-gray-50 dark:bg-gray-800 rounded-b-lg p-4 overflow-x-auto text-sm">{children}</pre>
    </div>
  );
}