"use client";

import React, {
  useRef,
  useState,
  useImperativeHandle,
  forwardRef,
} from "react";
import { WrapText, Copy, Check, Terminal } from "lucide-react";

export interface RawMarkdownEditorRef {
  wrapSelection: (prefix: string, suffix: string, fallback?: string) => void;
  prefixLine: (prefix: string) => void;
  insertText: (text: string) => void;
  focus: () => void;
}

interface RawMarkdownEditorProps {
  content: string;
  onChange: (value: string) => void;
  onSave?: () => void;
  fontSize: number;
}

export const RawMarkdownEditor = forwardRef<
  RawMarkdownEditorRef,
  RawMarkdownEditorProps
>(({ content, onChange, onSave, fontSize }, ref) => {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);
  const gutterRef = useRef<HTMLDivElement | null>(null);
  const [wordWrap, setWordWrap] = useState(true);
  const [copied, setCopied] = useState(false);

  // Expose text manipulation methods to parent toolbar
  useImperativeHandle(ref, () => ({
    wrapSelection: (prefix: string, suffix: string, fallback = "") => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const hasSelection = start !== end;
      const selectedText = hasSelection ? value.substring(start, end) : fallback;
      const replacement = `${prefix}${selectedText}${suffix}`;
      const nextVal = value.substring(0, start) + replacement + value.substring(end);
      onChange(nextVal);

      requestAnimationFrame(() => {
        textarea.focus();
        if (hasSelection) {
          textarea.selectionStart = start + prefix.length;
          textarea.selectionEnd = start + prefix.length + selectedText.length;
        } else {
          const cursor = start + prefix.length;
          textarea.selectionStart = cursor;
          textarea.selectionEnd = cursor + selectedText.length;
        }
      });
    },

    prefixLine: (prefix: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const value = textarea.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const nextVal = value.substring(0, lineStart) + prefix + value.substring(lineStart);
      onChange(nextVal);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = start + prefix.length;
        textarea.selectionEnd = start + prefix.length;
      });
    },

    insertText: (textToInsert: string) => {
      const textarea = textareaRef.current;
      if (!textarea) return;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;
      const nextVal = value.substring(0, start) + textToInsert + value.substring(end);
      onChange(nextVal);

      requestAnimationFrame(() => {
        textarea.focus();
        textarea.selectionStart = textarea.selectionEnd = start + textToInsert.length;
      });
    },

    focus: () => {
      textareaRef.current?.focus();
    },
  }));

  const handleScroll = (e: React.UIEvent<HTMLTextAreaElement>) => {
    if (gutterRef.current) {
      gutterRef.current.scrollTop = e.currentTarget.scrollTop;
    }
  };

  const handleCopy = () => {
    if (!content) return;
    void navigator.clipboard.writeText(content);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Save: Ctrl+S / Cmd+S
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "s") {
      e.preventDefault();
      onSave?.();
      return;
    }

    // Tab key: Indent / Dedent with 2 spaces
    if (e.key === "Tab") {
      e.preventDefault();
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const end = textarea.selectionEnd;
      const value = textarea.value;

      if (e.shiftKey) {
        const lineStart = value.lastIndexOf("\n", start - 1) + 1;
        const line = value.substring(lineStart);
        if (line.startsWith("  ")) {
          const nextVal = value.substring(0, lineStart) + line.substring(2);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = Math.max(lineStart, start - 2);
            textarea.selectionEnd = Math.max(lineStart, end - 2);
          });
        }
      } else {
        const nextVal = value.substring(0, start) + "  " + value.substring(end);
        onChange(nextVal);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + 2;
        });
      }
      return;
    }

    // Enter key: Intelligent auto-indent for lists and blocks
    if (e.key === "Enter" && !e.shiftKey) {
      const textarea = e.currentTarget;
      const start = textarea.selectionStart;
      const value = textarea.value;
      const lineStart = value.lastIndexOf("\n", start - 1) + 1;
      const currentLine = value.substring(lineStart, start);

      // Bullet list: "- ", "* ", "+ "
      const bulletMatch = currentLine.match(/^(\s*)([-*+]\s+)(.*)$/);
      if (bulletMatch) {
        e.preventDefault();
        const [, indent, marker, rest] = bulletMatch;
        if (rest?.trim() === "") {
          const nextVal = value.substring(0, lineStart) + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          });
        } else {
          const insertion = `\n${indent ?? ""}${marker ?? "- "}`;
          const nextVal = value.substring(0, start) + insertion + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
          });
        }
        return;
      }

      // Numbered list: "1. ", "2. "
      const numberedMatch = currentLine.match(/^(\s*)(\d+)\.\s+(.*)$/);
      if (numberedMatch) {
        e.preventDefault();
        const [, indent, numStr, rest] = numberedMatch;
        if (rest?.trim() === "") {
          const nextVal = value.substring(0, lineStart) + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          });
        } else {
          const nextNum = parseInt(numStr ?? "1", 10) + 1;
          const insertion = `\n${indent ?? ""}${nextNum}. `;
          const nextVal = value.substring(0, start) + insertion + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
          });
        }
        return;
      }

      // Task list: "- [ ] " or "- [x] "
      const taskMatch = currentLine.match(/^(\s*-\s*\[[ xX]\]\s+)(.*)$/);
      if (taskMatch) {
        e.preventDefault();
        const [, , rest] = taskMatch;
        if (rest?.trim() === "") {
          const nextVal = value.substring(0, lineStart) + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          });
        } else {
          const insertion = `\n- [ ] `;
          const nextVal = value.substring(0, start) + insertion + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
          });
        }
        return;
      }

      // Blockquote: "> "
      const quoteMatch = currentLine.match(/^(\s*>\s*)(.*)$/);
      if (quoteMatch) {
        e.preventDefault();
        const [, marker, rest] = quoteMatch;
        if (rest?.trim() === "") {
          const nextVal = value.substring(0, lineStart) + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = lineStart;
          });
        } else {
          const insertion = `\n${marker ?? "> "}`;
          const nextVal = value.substring(0, start) + insertion + value.substring(start);
          onChange(nextVal);
          requestAnimationFrame(() => {
            textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
          });
        }
        return;
      }

      // General indentation
      const indentMatch = currentLine.match(/^(\s+)/);
      if (indentMatch) {
        e.preventDefault();
        const insertion = `\n${indentMatch[1] ?? ""}`;
        const nextVal = value.substring(0, start) + insertion + value.substring(start);
        onChange(nextVal);
        requestAnimationFrame(() => {
          textarea.selectionStart = textarea.selectionEnd = start + insertion.length;
        });
        return;
      }
    }
  };

  const lines = content.split("\n");
  const lineCount = Math.max(lines.length, 1);

  return (
    <div className="w-full flex flex-col border border-border/60 rounded-xl bg-card/60 backdrop-blur-md overflow-hidden shadow-sm transition-all focus-within:ring-1 focus-within:ring-primary/40 focus-within:border-primary/60">
      {/* Sub-header / Status Bar */}
      <div className="flex items-center justify-between px-3.5 py-1.5 border-b border-border/40 bg-accent/20 text-xs select-none">
        <div className="flex items-center gap-2">
          <Terminal className="w-3.5 h-3.5 text-primary" />
          <span className="font-mono text-[11px] font-semibold text-foreground">
            Pure Markdown Source
          </span>
          <span className="text-[10px] text-muted-foreground hidden sm:inline">
            • {lineCount} {lineCount === 1 ? "line" : "lines"}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          {/* Word Wrap Toggle */}
          <button
            type="button"
            onClick={() => setWordWrap((w) => !w)}
            className={`flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono transition-colors cursor-pointer ${
              wordWrap
                ? "bg-primary/15 text-primary font-semibold"
                : "text-muted-foreground hover:bg-accent hover:text-foreground"
            }`}
            title="Toggle Soft Word Wrap"
          >
            <WrapText className="w-3 h-3" />
            <span>Wrap: {wordWrap ? "On" : "Off"}</span>
          </button>

          {/* Quick Copy */}
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-mono text-muted-foreground hover:bg-accent hover:text-foreground transition-colors cursor-pointer"
            title="Copy Pure Markdown to Clipboard"
          >
            {copied ? (
              <>
                <Check className="w-3 h-3 text-emerald-500" />
                <span className="text-emerald-500">Copied</span>
              </>
            ) : (
              <>
                <Copy className="w-3 h-3" />
                <span>Copy</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Editor Body: Gutter + Raw Textarea */}
      <div className="relative flex flex-1 w-full min-h-[68vh] overflow-hidden bg-background/50">
        {/* Line Numbers Gutter */}
        <div
          ref={gutterRef}
          aria-hidden="true"
          style={{ fontSize: `${Math.max(11, fontSize - 2)}px` }}
          className="shrink-0 select-none py-4 px-2.5 text-right font-mono text-muted-foreground/35 bg-accent/10 border-r border-border/30 overflow-hidden leading-6"
        >
          {Array.from({ length: lineCount }, (_, i) => (
            <div key={i + 1} className="h-6 leading-6 min-w-[24px]">
              {i + 1}
            </div>
          ))}
        </div>

        {/* Text Area */}
        <textarea
          ref={textareaRef}
          value={content}
          onChange={(e) => onChange(e.target.value)}
          onScroll={handleScroll}
          onKeyDown={handleKeyDown}
          placeholder="# Start typing raw markdown here..."
          style={{
            fontSize: `${fontSize}px`,
            lineHeight: "24px",
          }}
          spellCheck={false}
          className={`flex-1 w-full p-4 bg-transparent font-mono text-foreground focus:outline-none resize-none selection:bg-primary/20 custom-scrollbar ${
            wordWrap ? "whitespace-pre-wrap break-words" : "whitespace-pre overflow-x-auto"
          }`}
        />
      </div>
    </div>
  );
});

RawMarkdownEditor.displayName = "RawMarkdownEditor";
