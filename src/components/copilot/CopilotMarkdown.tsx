"use client";

import React, { useState, useEffect, useRef } from "react";
import { Copy, Check, ArrowDownToLine, Workflow, Code2, AlertCircle } from "lucide-react";
import mermaid from "mermaid";
import { useTheme } from "~/components/ThemeProvider";

interface CopilotMarkdownProps {
  content: string;
  onInsertContent?: (text: string) => void;
}

// Interactive Mermaid block inside Copilot chat
function CopilotMermaidBlock({
  code,
  onInsert,
}: {
  code: string;
  onInsert?: (code: string) => void;
}) {
  const { isDark } = useTheme();
  const [svg, setSvg] = useState<string>("");
  const [error, setError] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const [isRaw, setIsRaw] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const renderDiagram = async () => {
      try {
        mermaid.initialize({
          startOnLoad: false,
          theme: isDark ? "dark" : "neutral",
          securityLevel: "loose",
          fontFamily: "Inter, system-ui, sans-serif",
          themeVariables: isDark
            ? {
                darkMode: true,
                background: "transparent",
                primaryColor: "#1e293b",
                primaryTextColor: "#f1f5f9",
                primaryBorderColor: "#475569",
                lineColor: "#64748b",
                nodeTextColor: "#f8fafc",
              }
            : {
                darkMode: false,
                background: "transparent",
                primaryColor: "#f8fafc",
                primaryTextColor: "#0f172a",
                primaryBorderColor: "#cbd5e1",
                lineColor: "#64748b",
                nodeTextColor: "#0f172a",
              },
        });

        const id = `copilot-mmd-${Math.random().toString(36).substring(2, 9)}`;
        const { svg: renderedSvg } = await mermaid.render(id, code.trim());
        if (!cancelled) {
          let cleanSvg = renderedSvg.replace(
            /style="max-width:[^"]*"/i,
            'style="max-width: 100%; height: auto; display: block;"'
          );
          if (!cleanSvg.includes("style=")) {
            cleanSvg = cleanSvg.replace(/<svg\s/i, '<svg style="max-width: 100%; height: auto; display: block;" ');
          }
          setSvg(cleanSvg);
          setError(null);
        }
      } catch (err: any) {
        if (!cancelled) {
          setError(err?.message || "Invalid Mermaid syntax");
        }
      }
    };

    renderDiagram();
    return () => {
      cancelled = true;
    };
  }, [code, isDark]);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="my-2.5 rounded-xl border border-border/70 bg-card/60 overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/50 text-[11px] font-mono select-none">
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <Workflow className="w-3.5 h-3.5" />
          <span>Mermaid Diagram</span>
        </div>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={() => setIsRaw(!isRaw)}
            className="px-2 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Toggle Code / Preview"
          >
            {isRaw ? "Preview" : "Code"}
          </button>
          <button
            type="button"
            onClick={handleCopy}
            className="p-1 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy Mermaid Code"
          >
            {copied ? <Check className="w-3 h-3 text-emerald-500" /> : <Copy className="w-3 h-3" />}
          </button>
          {onInsert && (
            <button
              type="button"
              onClick={() => onInsert(`\`\`\`mermaid\n${code}\n\`\`\``)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
              title="Insert Diagram into Note"
            >
              <ArrowDownToLine className="w-3 h-3" />
              <span>Insert</span>
            </button>
          )}
        </div>
      </div>

      {isRaw ? (
        <pre className="p-3 bg-muted/20 font-mono text-[11px] leading-relaxed overflow-x-auto text-foreground whitespace-pre">
          {code}
        </pre>
      ) : error ? (
        <div className="p-3 bg-red-500/10 text-red-600 dark:text-red-400 text-xs font-mono flex items-start gap-2">
          <AlertCircle className="w-4 h-4 shrink-0 mt-0.5" />
          <div className="break-all">{error}</div>
        </div>
      ) : svg ? (
        <div
          className="p-4 flex items-center justify-center overflow-x-auto [&>svg]:max-w-full [&>svg]:h-auto"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      ) : (
        <div className="p-4 text-center text-muted-foreground/60 font-mono">Rendering diagram…</div>
      )}
    </div>
  );
}

// Code block with copy & insert
function CopilotCodeBlock({
  language,
  code,
  onInsert,
}: {
  language: string;
  code: string;
  onInsert?: (code: string) => void;
}) {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (language.toLowerCase() === "mermaid") {
    return <CopilotMermaidBlock code={code} onInsert={onInsert} />;
  }

  return (
    <div className="my-2.5 rounded-xl border border-border/70 bg-card/70 overflow-hidden text-xs">
      <div className="flex items-center justify-between px-3 py-1.5 bg-muted/40 border-b border-border/50 text-[11px] font-mono text-muted-foreground select-none">
        <span className="font-semibold text-foreground/80">{language || "text"}</span>
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleCopy}
            className="flex items-center gap-1 px-2 py-0.5 rounded hover:bg-muted text-muted-foreground hover:text-foreground transition-colors"
            title="Copy Code"
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
          {onInsert && (
            <button
              type="button"
              onClick={() => onInsert(`\`\`\`${language}\n${code}\n\`\`\``)}
              className="flex items-center gap-1 px-2 py-0.5 rounded bg-primary/10 hover:bg-primary/20 text-primary font-medium transition-colors"
              title="Insert into Note"
            >
              <ArrowDownToLine className="w-3 h-3" />
              <span>Insert</span>
            </button>
          )}
        </div>
      </div>
      <pre className="p-3 bg-muted/20 font-mono text-[11px] leading-relaxed overflow-x-auto text-foreground whitespace-pre">
        {code}
      </pre>
    </div>
  );
}

// Markdown Table Renderer
function MarkdownTable({ rows }: { rows: string[][] }) {
  if (rows.length === 0) return null;
  const header = rows[0];
  const body = rows.slice(1);

  return (
    <div className="my-3 overflow-x-auto rounded-lg border border-border/70 text-xs">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-muted/50 border-b border-border/60">
            {header.map((cell, idx) => (
              <th key={idx} className="px-3 py-2 font-semibold text-foreground border-r border-border/40 last:border-r-0">
                {cell.trim()}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {body.map((row, rIdx) => (
            <tr key={rIdx} className="hover:bg-muted/20 transition-colors">
              {row.map((cell, cIdx) => (
                <td key={cIdx} className="px-3 py-1.5 text-foreground/90 border-r border-border/30 last:border-r-0">
                  {cell.trim()}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Parse inline formatting (bold, italic, code)
function formatInline(text: string): React.ReactNode[] {
  // Regex to match code, bold, italic
  const parts: React.ReactNode[] = [];
  const regex = /(`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*)/g;
  let lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > lastIndex) {
      parts.push(text.substring(lastIndex, match.index));
    }
    const token = match[0];
    if (token.startsWith("`") && token.endsWith("`")) {
      parts.push(
        <code
          key={match.index}
          className="px-1.5 py-0.5 rounded bg-muted/80 text-primary font-mono text-[11px] border border-border/40"
        >
          {token.slice(1, -1)}
        </code>
      );
    } else if (token.startsWith("**") && token.endsWith("**")) {
      parts.push(
        <strong key={match.index} className="font-semibold text-foreground">
          {token.slice(2, -2)}
        </strong>
      );
    } else if (token.startsWith("*") && token.endsWith("*")) {
      parts.push(
        <em key={match.index} className="italic text-foreground/90">
          {token.slice(1, -1)}
        </em>
      );
    }
    lastIndex = regex.lastIndex;
  }

  if (lastIndex < text.length) {
    parts.push(text.substring(lastIndex));
  }

  return parts.length > 0 ? parts : [text];
}

export function CopilotMarkdown({
  content,
  onInsertContent,
}: CopilotMarkdownProps) {
  // Parse markdown into blocks
  const blocks: React.ReactNode[] = [];
  const lines = content.split("\n");
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // Fenced Code Block
    if (line.trim().startsWith("```")) {
      const lang = line.trim().slice(3).trim();
      const codeLines: string[] = [];
      i++;
      while (i < lines.length && !lines[i].trim().startsWith("```")) {
        codeLines.push(lines[i]);
        i++;
      }
      i++; // consume closing ```
      blocks.push(
        <CopilotCodeBlock
          key={`code-${i}`}
          language={lang}
          code={codeLines.join("\n")}
          onInsert={onInsertContent}
        />
      );
      continue;
    }

    // Markdown Table Detection
    if (line.trim().startsWith("|") && line.trim().endsWith("|")) {
      const tableRows: string[][] = [];
      while (i < lines.length && lines[i].trim().startsWith("|") && lines[i].trim().endsWith("|")) {
        const rowStr = lines[i].trim();
        // Ignore separator row like | --- | --- |
        if (!/^\|(\s*:?-+:?\s*\|)+$/.test(rowStr)) {
          const cells = rowStr
            .slice(1, -1)
            .split("|")
            .map((c) => c.trim());
          tableRows.push(cells);
        }
        i++;
      }
      blocks.push(<MarkdownTable key={`table-${i}`} rows={tableRows} />);
      continue;
    }

    // Headers
    if (line.startsWith("### ")) {
      blocks.push(
        <h3 key={`h3-${i}`} className="text-xs font-semibold text-foreground mt-3 mb-1 tracking-tight">
          {formatInline(line.slice(4))}
        </h3>
      );
      i++;
      continue;
    }
    if (line.startsWith("## ")) {
      blocks.push(
        <h2 key={`h2-${i}`} className="text-sm font-bold text-foreground mt-4 mb-1.5 tracking-tight border-b border-border/40 pb-1">
          {formatInline(line.slice(3))}
        </h2>
      );
      i++;
      continue;
    }
    if (line.startsWith("# ")) {
      blocks.push(
        <h1 key={`h1-${i}`} className="text-base font-bold text-foreground mt-4 mb-2 tracking-tight border-b border-border/60 pb-1">
          {formatInline(line.slice(2))}
        </h1>
      );
      i++;
      continue;
    }

    // Blockquote
    if (line.startsWith("> ")) {
      blocks.push(
        <blockquote key={`quote-${i}`} className="border-l-2 border-primary/50 pl-3 my-2 text-xs italic text-muted-foreground">
          {formatInline(line.slice(2))}
        </blockquote>
      );
      i++;
      continue;
    }

    // Bullet list
    if (line.trim().startsWith("- ") || line.trim().startsWith("* ")) {
      const listItems: string[] = [];
      while (i < lines.length && (lines[i].trim().startsWith("- ") || lines[i].trim().startsWith("* "))) {
        listItems.push(lines[i].trim().slice(2));
        i++;
      }
      blocks.push(
        <ul key={`ul-${i}`} className="list-disc list-inside space-y-1 my-1.5 text-xs text-foreground/90 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ul>
      );
      continue;
    }

    // Numbered list
    if (/^\d+\.\s/.test(line.trim())) {
      const listItems: string[] = [];
      while (i < lines.length && /^\d+\.\s/.test(lines[i].trim())) {
        listItems.push(lines[i].trim().replace(/^\d+\.\s/, ""));
        i++;
      }
      blocks.push(
        <ol key={`ol-${i}`} className="list-decimal list-inside space-y-1 my-1.5 text-xs text-foreground/90 pl-1">
          {listItems.map((item, idx) => (
            <li key={idx}>{formatInline(item)}</li>
          ))}
        </ol>
      );
      continue;
    }

    // Horizontal Rule
    if (line.trim() === "---" || line.trim() === "***") {
      blocks.push(<hr key={`hr-${i}`} className="my-3 border-border/50" />);
      i++;
      continue;
    }

    // Standard Paragraph
    if (line.trim()) {
      blocks.push(
        <p key={`p-${i}`} className="my-1.5 leading-relaxed text-xs text-foreground/95">
          {formatInline(line)}
        </p>
      );
    }

    i++;
  }

  return <div className="space-y-1 font-sans">{blocks}</div>;
}
