"use client";

import React, { useState } from "react";
import {
  Table as TableIcon,
  Plus,
  Filter,
  ArrowUpDown,
  Search,
  Star,
  CheckCircle,
  Clock,
  AlertCircle,
  MoreHorizontal,
  User,
  Calendar,
} from "lucide-react";

interface RecordItem {
  id: string;
  title: string;
  owner: string;
  priority: number; // 1 to 5
  progress: number; // 0 to 100
  status: "Done" | "Doing" | "Todo" | "Stuck";
  deadline: string;
  tags: string[];
}

interface TableViewProps {
  noteTitle?: string;
}

export function TableView({ noteTitle }: TableViewProps) {
  const [records, setRecords] = useState<RecordItem[]>([
    {
      id: "1",
      title: "Risk Monitoring & Compliance Audit",
      owner: "John",
      priority: 3,
      progress: 90,
      status: "Doing",
      deadline: "2026-09-10",
      tags: ["Security", "Audit"],
    },
    {
      id: "2",
      title: "Continuously track and evaluate project progress",
      owner: "Chris",
      priority: 4,
      progress: 100,
      status: "Done",
      deadline: "2026-09-15",
      tags: ["DevOps"],
    },
    {
      id: "3",
      title: "Define all team roles and responsibilities",
      owner: "Smith",
      priority: 3,
      progress: 66,
      status: "Doing",
      deadline: "2026-09-20",
      tags: ["Management"],
    },
    {
      id: "4",
      title: "Develop detailed timeline & Gantt chart",
      owner: "Howard",
      priority: 5,
      progress: 100,
      status: "Done",
      deadline: "2026-09-04",
      tags: ["Planning"],
    },
    {
      id: "5",
      title: "Clearly outline project boundaries and goals",
      owner: "Thor",
      priority: 2,
      progress: 25,
      status: "Stuck",
      deadline: "2026-09-25",
      tags: ["Documentation"],
    },
  ]);

  const [filterStatus, setFilterStatus] = useState<string>("All");

  const statusColors = {
    Done: "bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border-emerald-500/20",
    Doing: "bg-blue-500/10 text-blue-600 dark:text-blue-400 border-blue-500/20",
    Todo: "bg-amber-500/10 text-amber-600 dark:text-amber-400 border-amber-500/20",
    Stuck: "bg-rose-500/10 text-rose-600 dark:text-rose-400 border-rose-500/20",
  };

  const handleAddRecord = () => {
    const newRecord: RecordItem = {
      id: Date.now().toString(),
      title: "New Task / Record",
      owner: "User",
      priority: 3,
      progress: 0,
      status: "Todo",
      deadline: new Date().toISOString().split("T")[0]!,
      tags: ["General"],
    };
    setRecords([...records, newRecord]);
  };

  const filteredRecords =
    filterStatus === "All"
      ? records
      : records.filter((r) => r.status === filterStatus);

  return (
    <div className="w-full h-full flex flex-col bg-background rounded-xl border border-border overflow-hidden">
      {/* Table Toolbar */}
      <div className="p-4 border-b border-border flex flex-wrap items-center justify-between gap-3 bg-card/40">
        <div className="flex items-center gap-2">
          <TableIcon className="w-4 h-4 text-foreground" />
          <h3 className="font-semibold text-sm text-foreground">
            {noteTitle?.replace(".md", "") || "Database View"}
          </h3>
          <span className="text-xs px-2 py-0.5 rounded-full bg-accent text-muted-foreground font-mono">
            {records.length} records
          </span>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1 bg-muted p-1 rounded-lg border border-border text-xs">
            <Filter className="w-3.5 h-3.5 text-muted-foreground ml-1" />
            {["All", "Doing", "Done", "Stuck"].map((st) => (
              <button
                key={st}
                onClick={() => setFilterStatus(st)}
                className={`px-2.5 py-1 rounded-md transition-all ${
                  filterStatus === st
                    ? "bg-background text-foreground font-medium shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {st}
              </button>
            ))}
          </div>

          <button
            onClick={handleAddRecord}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-foreground text-background font-medium text-xs rounded-lg hover:opacity-90 transition-all shadow-sm"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>New Record</span>
          </button>
        </div>
      </div>

      {/* Table Container */}
      <div className="flex-1 overflow-x-auto">
        <table className="w-full text-left text-xs border-collapse">
          <thead>
            <tr className="border-b border-border bg-muted/60 text-muted-foreground font-semibold">
              <th className="p-3 pl-4 min-w-[240px]">Task / Title</th>
              <th className="p-3 min-w-[120px]">Owner</th>
              <th className="p-3 min-w-[120px]">Priority</th>
              <th className="p-3 min-w-[160px]">Progress</th>
              <th className="p-3 min-w-[110px]">Status</th>
              <th className="p-3 min-w-[120px]">Deadline</th>
              <th className="p-3 pr-4 w-10"></th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border">
            {filteredRecords.map((item) => (
              <tr
                key={item.id}
                className="hover:bg-accent/40 transition-colors group"
              >
                <td className="p-3 pl-4 font-medium text-foreground">
                  <input
                    type="text"
                    value={item.title}
                    onChange={(e) => {
                      const val = e.target.value;
                      setRecords(
                        records.map((r) =>
                          r.id === item.id ? { ...r, title: val } : r
                        )
                      );
                    }}
                    className="w-full bg-transparent focus:outline-none focus:bg-background border-b border-transparent focus:border-foreground rounded px-1 py-0.5"
                  />
                </td>

                <td className="p-3 text-muted-foreground">
                  <div className="flex items-center gap-1.5">
                    <User className="w-3.5 h-3.5 text-muted-foreground" />
                    <span>{item.owner}</span>
                  </div>
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-0.5 text-amber-500">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <Star
                        key={i}
                        className={`w-3 h-3 ${
                          i < item.priority ? "fill-amber-500" : "text-border fill-transparent"
                        }`}
                      />
                    ))}
                  </div>
                </td>

                <td className="p-3">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 h-2 bg-muted rounded-full overflow-hidden border border-border">
                      <div
                        className="h-full bg-foreground transition-all duration-300"
                        style={{ width: `${item.progress}%` }}
                      />
                    </div>
                    <span className="font-mono text-[11px] text-muted-foreground w-8">
                      {item.progress}%
                    </span>
                  </div>
                </td>

                <td className="p-3">
                  <span
                    className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium border ${
                      statusColors[item.status]
                    }`}
                  >
                    {item.status}
                  </span>
                </td>

                <td className="p-3 text-muted-foreground font-mono text-[11px]">
                  <div className="flex items-center gap-1.5">
                    <Calendar className="w-3 h-3 opacity-60" />
                    <span>{item.deadline}</span>
                  </div>
                </td>

                <td className="p-3 pr-4 text-right">
                  <button
                    onClick={() => setRecords(records.filter((r) => r.id !== item.id))}
                    className="p-1 hover:bg-card rounded text-muted-foreground hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete record"
                  >
                    <MoreHorizontal className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
