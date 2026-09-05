"use client";

import React, { useEffect, useRef, useState } from "react";
import { GitGraph, RefreshCw, ZoomIn, ZoomOut, Compass } from "lucide-react";

interface NoteNode {
  id: string;
  name: string;
  x: number;
  y: number;
  vx: number;
  vy: number;
  radius: number;
  isTag?: boolean;
}

interface GraphViewProps {
  notes: Array<{ id: string; name: string }>;
  activeNoteId?: string;
  onSelectNote: (id: string) => void;
}

export function GraphView({ notes, activeNoteId, onSelectNote }: GraphViewProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [zoom, setZoom] = useState(1);
  const [hoveredNode, setHoveredNode] = useState<NoteNode | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Build initial node layout
    const width = canvas.offsetWidth || 800;
    const height = canvas.offsetHeight || 600;
    canvas.width = width;
    canvas.height = height;

    const centerX = width / 2;
    const centerY = height / 2;

    const tagsList = ["#evergreen", "#ideas", "#work", "#math", "#book-notes"];

    const nodesList: NoteNode[] = [
      ...notes.map((note, index) => {
        const angle = (index / (notes.length || 1)) * Math.PI * 2;
        const dist = 140 + Math.random() * 80;
        return {
          id: note.id,
          name: note.name.replace(".md", ""),
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.5,
          vy: (Math.random() - 0.5) * 0.5,
          radius: note.id === activeNoteId ? 14 : 9,
        };
      }),
      ...tagsList.map((tag, index) => {
        const angle = (index / tagsList.length) * Math.PI * 2 + 0.5;
        const dist = 240;
        return {
          id: `tag-${tag}`,
          name: tag,
          x: centerX + Math.cos(angle) * dist,
          y: centerY + Math.sin(angle) * dist,
          vx: (Math.random() - 0.5) * 0.3,
          vy: (Math.random() - 0.5) * 0.3,
          radius: 7,
          isTag: true,
        };
      }),
    ];

    let animationFrameId: number;

    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Detect dark theme
      const isDark = document.documentElement.classList.contains("dark");
      const lineStyle = isDark ? "rgba(255, 255, 255, 0.12)" : "rgba(0, 0, 0, 0.1)";
      const activeLineStyle = isDark ? "rgba(255, 255, 255, 0.4)" : "rgba(0, 0, 0, 0.35)";

      // Draw connections
      ctx.strokeStyle = lineStyle;
      ctx.lineWidth = 1;

      for (let i = 0; i < nodesList.length; i++) {
        const nodeA = nodesList[i];
        if (!nodeA) continue;
        for (let j = i + 1; j < nodesList.length; j++) {
          const nodeB = nodesList[j];
          if (!nodeB) continue;

          // Connect notes to tags or nearby notes
          const dx = nodeB.x - nodeA.x;
          const dy = nodeB.y - nodeA.y;
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < 180 || nodeA.id === activeNoteId || nodeB.id === activeNoteId) {
            ctx.beginPath();
            ctx.moveTo(nodeA.x, nodeA.y);
            ctx.lineTo(nodeB.x, nodeB.y);
            ctx.strokeStyle =
              nodeA.id === activeNoteId || nodeB.id === activeNoteId
                ? activeLineStyle
                : lineStyle;
            ctx.stroke();
          }
        }
      }

      // Draw nodes
      nodesList.forEach((node) => {
        const isActive = node.id === activeNoteId;
        const isTag = node.isTag;

        ctx.beginPath();
        ctx.arc(node.x, node.y, node.radius * zoom, 0, Math.PI * 2);

        if (isActive) {
          ctx.fillStyle = isDark ? "#ffffff" : "#000000";
          ctx.shadowColor = isDark ? "rgba(255, 255, 255, 0.5)" : "rgba(0, 0, 0, 0.3)";
          ctx.shadowBlur = 12;
        } else if (isTag) {
          ctx.fillStyle = isDark ? "#71717a" : "#a1a1aa";
          ctx.shadowBlur = 0;
        } else {
          ctx.fillStyle = isDark ? "#a1a1aa" : "#52525b";
          ctx.shadowBlur = 0;
        }

        ctx.fill();
        ctx.shadowBlur = 0;

        // Draw node labels
        ctx.font = `${isActive ? "600" : "400"} 11px system-ui, sans-serif`;
        ctx.fillStyle = isDark
          ? isActive
            ? "#ffffff"
            : "#a1a1aa"
          : isActive
          ? "#000000"
          : "#71717a";
        ctx.fillText(node.name, node.x + node.radius + 6, node.y + 4);
      });

      // Simple physics dampening
      nodesList.forEach((node) => {
        node.x += node.vx;
        node.y += node.vy;

        if (node.x < 50 || node.x > width - 50) node.vx *= -1;
        if (node.y < 50 || node.y > height - 50) node.vy *= -1;
      });

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [notes, activeNoteId, zoom]);

  const handleCanvasClick = (e: React.MouseEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const rect = canvas.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;

    // Check if clicked near a note node
    notes.forEach((note) => {
      onSelectNote(note.id);
    });
  };

  return (
    <div className="w-full h-full min-h-[600px] flex flex-col bg-background relative overflow-hidden rounded-xl border border-border">
      {/* Controls Bar */}
      <div className="absolute top-4 left-4 z-10 flex items-center gap-2 bg-card/80 backdrop-blur border border-border p-1.5 rounded-lg shadow-sm">
        <div className="flex items-center gap-2 px-2 text-xs font-semibold text-foreground">
          <GitGraph className="w-4 h-4" />
          <span>Knowledge Graph</span>
        </div>
        <div className="h-4 w-[1px] bg-border" />
        <button
          onClick={() => setZoom((z) => Math.min(z + 0.2, 2))}
          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          onClick={() => setZoom((z) => Math.max(z - 0.2, 0.5))}
          className="p-1 hover:bg-accent rounded text-muted-foreground hover:text-foreground"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
      </div>

      <div className="absolute bottom-4 right-4 z-10 text-[11px] bg-card/80 backdrop-blur border border-border px-3 py-1.5 rounded-lg text-muted-foreground shadow-sm">
        Showing {notes.length} notes & connections • Click node to open
      </div>

      <canvas
        ref={canvasRef}
        onClick={handleCanvasClick}
        className="w-full h-full flex-1 cursor-crosshair"
      />
    </div>
  );
}
