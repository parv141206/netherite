import { TableView } from "@tiptap/extension-table";
import {
  formatTableAsMarkdown,
  formatTableAsAscii,
  extractTableMatrixFromDom,
  extractTableMatrixFromNode,
} from "./tableUtils";

const COPY_ICON_SVG = `<svg class="w-3 h-3 text-muted-foreground shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="14" height="14" x="8" y="8" rx="2" ry="2"/><path d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2"/></svg>`;
const CHECK_ICON_SVG = `<svg class="w-3 h-3 text-emerald-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>`;

/**
 * Creates a minimal table toolbar element with "Copy MD" and "Copy ASCII" buttons.
 */
function createToolbarElement(
  position: "top" | "bottom",
  getMatrix: () => string[][]
): HTMLDivElement {
  const toolbar = document.createElement("div");
  toolbar.className = `netherite-table-toolbar netherite-table-toolbar-${position} flex items-center justify-between text-[11px] select-none ${
    position === "top" ? "mb-1" : "mt-1"
  }`;
  toolbar.contentEditable = "false";
  toolbar.setAttribute("data-tauri-no-drag", "true");

  // Left side: Subtle position & table indicator
  const leftGroup = document.createElement("div");
  leftGroup.className = "flex items-center gap-1.5 text-[10px] font-mono text-muted-foreground/60";
  leftGroup.innerHTML = `<span>Table</span><span class="opacity-50">•</span><span class="capitalize text-[9px] opacity-70">${position}</span>`;
  toolbar.appendChild(leftGroup);

  // Right side: Copy buttons group
  const rightGroup = document.createElement("div");
  rightGroup.className = "flex items-center gap-1";

  // Helper to create an action button
  const createButton = (
    label: string,
    successLabel: string,
    onCopy: () => string
  ) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.tabIndex = -1;
    btn.className =
      "px-2 py-0.5 text-[10px] font-mono rounded-md border border-border/40 bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground transition-all cursor-pointer flex items-center gap-1 shadow-2xs";
    btn.title = `Copy table as ${label}`;

    const renderDefault = () => {
      btn.innerHTML = `${COPY_ICON_SVG}<span>${label}</span>`;
    };
    renderDefault();

    let resetTimer: any = null;

    btn.addEventListener("mousedown", (e) => {
      // Prevent losing editor selection / cursor focus
      e.preventDefault();
      e.stopPropagation();
    });

    btn.addEventListener("click", (e) => {
      e.preventDefault();
      e.stopPropagation();

      try {
        const text = onCopy();
        if (!text) return;
        void navigator.clipboard.writeText(text);

        btn.innerHTML = `${CHECK_ICON_SVG}<span class="text-emerald-500 font-semibold">${successLabel}</span>`;
        if (resetTimer) clearTimeout(resetTimer);
        resetTimer = setTimeout(() => {
          renderDefault();
        }, 1800);
      } catch (err) {
        console.error("Failed to copy table:", err);
      }
    });

    return btn;
  };

  // Copy MD Button
  const copyMdBtn = createButton("Copy MD", "Copied MD!", () => {
    const matrix = getMatrix();
    return formatTableAsMarkdown(matrix);
  });
  rightGroup.appendChild(copyMdBtn);

  // Copy ASCII Button
  const copyAsciiBtn = createButton("Copy ASCII", "Copied ASCII!", () => {
    const matrix = getMatrix();
    return formatTableAsAscii(matrix);
  });
  rightGroup.appendChild(copyAsciiBtn);

  toolbar.appendChild(rightGroup);
  return toolbar;
}

/**
 * Custom TipTap TableView with minimal top and bottom toolbars
 * allowing one-click copying to either Markdown or simple ASCII.
 */
export class NetheriteTableView extends TableView {
  topToolbar: HTMLDivElement;
  bottomToolbar: HTMLDivElement;

  constructor(node: any, cellMinWidth: number, view: any, HTMLAttributes: any = {}) {
    super(node, cellMinWidth, view, HTMLAttributes);

    this.dom.classList.add("netherite-table-wrapper", "group");

    const getMatrix = () => this.getTableMatrix();

    // Attach Top Toolbar
    this.topToolbar = createToolbarElement("top", getMatrix);
    this.dom.insertBefore(this.topToolbar, this.table);

    // Attach Bottom Toolbar
    this.bottomToolbar = createToolbarElement("bottom", getMatrix);
    this.dom.appendChild(this.bottomToolbar);
  }

  getTableMatrix(): string[][] {
    // Prefer extracting text directly from live DOM cells
    if (this.table) {
      const matrix = extractTableMatrixFromDom(this.table);
      if (matrix.length > 0) return matrix;
    }
    // Fallback to ProseMirror node structure
    return extractTableMatrixFromNode(this.node);
  }
}
