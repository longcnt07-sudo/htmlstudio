import React, { useEffect, useRef } from 'react';
import Prism from 'prismjs';
import 'prismjs/themes/prism-tomorrow.css';
import 'prismjs/components/prism-markup';
import 'prismjs/components/prism-css';
import { cn } from '../lib/utils';

interface CodeEditorProps {
  value: string;
  onChange: (value: string) => void;
  language: 'html' | 'css';
  className?: string;
  placeholder?: string;
}

export const CodeEditor: React.FC<CodeEditorProps> = ({ value, onChange, language, className, placeholder }) => {
  const preRef = useRef<HTMLPreElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const lines = value.split('\n');

  useEffect(() => {
    if (preRef.current) {
      Prism.highlightElement(preRef.current);
    }
  }, [value, language]);

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (preRef.current) {
        preRef.current.scrollTop = e.currentTarget.scrollTop;
        preRef.current.scrollLeft = e.currentTarget.scrollLeft;
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    onChange(e.target.value);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Tab') {
      e.preventDefault();
      const start = e.currentTarget.selectionStart;
      const end = e.currentTarget.selectionEnd;
      const newValue = value.substring(0, start) + '  ' + value.substring(end);
      onChange(newValue);
      
      setTimeout(() => {
        e.currentTarget.selectionStart = e.currentTarget.selectionEnd = start + 2;
      }, 0);
    }
  };

  return (
    <div className={cn("relative font-mono text-sm bg-app-code-bg h-full flex flex-col p-4", className)}>
      <div className="relative flex-1 overflow-hidden flex gap-4" ref={containerRef}>
        {/* Line Numbers */}
        <div className="flex flex-col text-right text-[#475569] select-none text-[12px] pt-4 min-w-[2rem] font-mono">
            {lines.map((_, i) => (
                <div key={i} className="h-[21px] leading-[21px]">{i + 1}</div>
            ))}
        </div>

        <div className="relative flex-1 h-full overflow-hidden">
            <textarea
              ref={textareaRef}
              value={value}
              onChange={handleChange}
              onKeyDown={handleKeyDown}
              onScroll={handleScroll}
              className="absolute inset-0 w-full h-full p-0 m-0 bg-transparent caret-white resize-none outline-none z-10 whitespace-pre leading-[21px] pt-4 overflow-auto custom-scrollbar font-mono text-[13px] editor-input"
              spellCheck={false}
              placeholder={placeholder}
            />
            <pre
              ref={preRef}
              className={cn(
                "absolute inset-0 w-full h-full p-0 m-0 pointer-events-none overflow-hidden language-" + language,
                "!bg-transparent leading-[21px] pt-4 whitespace-pre font-mono text-[13px]"
              )}
              aria-hidden="true"
            >
              <code className={"language-" + language}>{value || ' '}</code>
            </pre>
        </div>
      </div>

      <style>{`
        /* Reset Prism default styles that might cause misalignment or overlap */
        code[class*="language-"],
        pre[class*="language-"],
        code[class*="language-"] *,
        pre[class*="language-"] * {
          font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", "Courier New", monospace !important;
          font-size: 13px !important;
          line-height: 21px !important;
          tab-size: 2 !important;
          margin: 0 !important;
          padding: 0 !important;
          background: none !important;
          border: none !important;
          box-shadow: none !important;
          text-shadow: none !important;
        }

        /* Hide labels some Prism themes add */
        pre[class*="language-"]::before,
        pre[class*="language-"]::after,
        code[class*="language-"]::before,
        code[class*="language-"]::after {
          content: none !important;
          display: none !important;
        }

        .editor-input {
          color: transparent !important;
          -webkit-text-fill-color: transparent !important;
        }

        .editor-input::placeholder {
          color: #64748B !important;
          -webkit-text-fill-color: #64748B !important;
          opacity: 0.5 !important;
        }

        .token.comment { color: #64748B; }
        .token.tag { color: #F472B6; }
        .token.attr-name { color: #FB923C; }
        .token.attr-value { color: #34D399; }
        .token.string { color: #34D399; }
        .token.selector { color: #F472B6; }
        .token.property { color: #FB923C; }
        .token.punctuation { color: #94A3B8; }
      `}</style>
    </div>
  );
};
