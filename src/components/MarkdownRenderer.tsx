import React, { useMemo } from 'react';
import { marked } from 'marked';
import DOMPurify from 'dompurify';

interface MarkdownRendererProps {
  content: string;
  isStreaming?: boolean;
}

// Configure marked options
marked.setOptions({
  gfm: true,
  breaks: true,
});

export const MarkdownRenderer: React.FC<MarkdownRendererProps> = ({ content }) => {
  const sanitizedHtml = useMemo(() => {
    if (!content) return '';
    try {
      const rawHtml = marked.parse(content) as string;
      return DOMPurify.sanitize(rawHtml, {
        ADD_ATTR: ['target', 'rel'],
      });
    } catch {
      return content;
    }
  }, [content]);

  // Hook to handle code block copying via delegation
  const handleContainerClick = (e: React.MouseEvent<HTMLDivElement>) => {
    const target = e.target as HTMLElement;
    const copyBtn = target.closest('[data-code-copy]') as HTMLButtonElement | null;
    if (copyBtn) {
      const codeId = copyBtn.getAttribute('data-code-copy');
      const codeEl = document.getElementById(codeId || '');
      if (codeEl) {
        const textToCopy = codeEl.innerText || codeEl.textContent || '';
        navigator.clipboard.writeText(textToCopy);
        const originalText = copyBtn.innerHTML;
        copyBtn.innerHTML = `
          <svg class="w-3.5 h-3.5 text-emerald-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
            <polyline points="20 6 9 17 4 12"></polyline>
          </svg>
          <span class="text-xs text-emerald-400">Copied!</span>
        `;
        setTimeout(() => {
          copyBtn.innerHTML = originalText;
        }, 2000);
      }
    }
  };

  return (
    <div
      onClick={handleContainerClick}
      className="markdown-content text-black dark:text-neutral-100 font-normal leading-relaxed text-[15px] space-y-3 break-words [&_h1]:text-2xl [&_h1]:font-bold [&_h1]:text-black dark:[&_h1]:text-white [&_h1]:mt-6 [&_h1]:mb-3 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-black dark:[&_h2]:text-white [&_h2]:mt-5 [&_h2]:mb-2 [&_h3]:text-lg [&_h3]:font-bold [&_h3]:text-black dark:[&_h3]:text-neutral-100 [&_h3]:mt-4 [&_h3]:mb-2 [&_p]:my-2.5 [&_p]:text-black dark:[&_p]:text-neutral-100 [&_p]:leading-relaxed [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-2.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-2.5 [&_li]:my-1 [&_li]:text-black dark:[&_li]:text-neutral-100 [&_strong]:text-black dark:[&_strong]:text-white [&_strong]:font-bold [&_blockquote]:border-l-4 [&_blockquote]:border-cyan-600 [&_blockquote]:pl-4 [&_blockquote]:py-1.5 [&_blockquote]:italic [&_blockquote]:text-neutral-900 dark:[&_blockquote]:text-neutral-200 [&_blockquote]:bg-slate-200/60 dark:[&_blockquote]:bg-neutral-900/40 [&_blockquote]:rounded-r-lg [&_code]:px-1.5 [&_code]:py-0.5 [&_code]:rounded [&_code]:bg-slate-200 dark:[&_code]:bg-neutral-800 [&_code]:text-cyan-800 dark:[&_code]:text-cyan-300 [&_code]:font-mono [&_code]:text-[13px] [&_code]:font-semibold [&_pre]:p-0 [&_pre]:bg-transparent [&_pre]:my-3 [&_a]:text-cyan-700 dark:[&_a]:text-cyan-400 [&_a]:underline [&_a]:underline-offset-2 [&_a]:font-semibold [&_a]:hover:text-cyan-800 dark:[&_a]:hover:text-cyan-300 [&_hr]:border-slate-300 dark:[&_hr]:border-neutral-800"
      dangerouslySetInnerHTML={{ __html: sanitizedHtml }}
    />
  );
};

export const CodeBlock: React.FC<{ language?: string; text: string }> = ({
  language = 'text',
  text,
}) => {
  const [copied, setCopied] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="relative my-3 rounded-xl overflow-hidden border border-slate-400/80 dark:border-neutral-800 bg-slate-950 dark:bg-neutral-900 shadow-md">
      <div className="flex items-center justify-between px-3.5 py-1.5 bg-slate-900 dark:bg-neutral-950/90 text-neutral-300 dark:text-neutral-400 text-xs border-b border-slate-800 dark:border-neutral-800 font-mono">
        <span className="font-semibold text-slate-200">{language}</span>
        <button
          onClick={handleCopy}
          className="flex items-center gap-1 hover:text-white transition-colors"
          title="Copy code"
        >
          {copied ? (
            <span className="text-emerald-400 font-sans font-medium">Copied!</span>
          ) : (
            <span>Copy</span>
          )}
        </button>
      </div>
      <pre className="p-3.5 overflow-x-auto text-[13px] font-mono text-neutral-100 dark:text-neutral-200 leading-relaxed font-normal">
        <code>{text}</code>
      </pre>
    </div>
  );
};
