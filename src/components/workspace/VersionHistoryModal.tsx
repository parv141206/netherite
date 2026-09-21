"use client";

import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  X,
  GitCommit,
  GitBranch,
  Cloud,
  History,
  RotateCcw,
  Check,
  Copy,
  Download,
  Pin,
  Sparkles,
  Clock,
  User,
  ChevronRight,
  RefreshCw,
  Plus,
  Layers,
} from "lucide-react";
import { toast } from "react-toastify";
import { api } from "~/trpc/react";
import {
  getGitLog,
  getFileAtCommit,
  createMilestoneCommit,
  type GitCommitItem,
} from "~/lib/gitEngine";
import {
  computeLineDiff,
  computeExcalidrawSemanticDiff,
  type DiffResult,
  type DrawingDiffSummary,
} from "./diffUtils";

interface VersionHistoryModalProps {
  isOpen: boolean;
  onClose: () => void;
  noteId: string;
  noteTitle: string;
  currentContent: string;
  onRestoreContent: (restoredContent: string) => void;
}

export function VersionHistoryModal({
  isOpen,
  onClose,
  noteId,
  noteTitle,
  currentContent,
  onRestoreContent,
}: VersionHistoryModalProps) {
  const utils = api.useUtils();
  const [activeSource, setActiveSource] = useState<"git" | "drive">("git");
  const [gitCommits, setGitCommits] = useState<GitCommitItem[]>([]);
  const [selectedCommitOid, setSelectedCommitOid] = useState<string | null>(
    null,
  );
  const [selectedDriveRevId, setSelectedDriveRevId] = useState<string | null>(
    null,
  );
  const [historicalContent, setHistoricalContent] = useState<string | null>(
    null,
  );
  const [isLoadingContent, setIsLoadingContent] = useState<boolean>(false);
  const [viewMode, setViewMode] = useState<"diff" | "preview">("diff");
  const [milestoneMessage, setMilestoneMessage] = useState<string>("");
  const [isCreatingMilestone, setIsCreatingMilestone] =
    useState<boolean>(false);
  const [copied, setCopied] = useState<boolean>(false);
  const [confirmRestore, setConfirmRestore] = useState<boolean>(false);

  const isDrawing = useMemo(() => {
    return noteTitle.endsWith(".excalidraw");
  }, [noteTitle]);

  // Google Drive Revisions query
  const revisionsQuery = api.notes.listRevisions.useQuery(
    { fileId: noteId },
    {
      enabled: isOpen && activeSource === "drive" && Boolean(noteId),
      staleTime: 10_000,
    },
  );

  const pinMutation = api.notes.pinRevision.useMutation({
    onSuccess: () => {
      void utils.notes.listRevisions.invalidate({ fileId: noteId });
      toast.success("Revision pin status updated");
    },
    onError: (err) => {
      toast.error(`Failed to pin revision: ${err.message}`);
    },
  });

  // Refresh git commits
  const refreshGitLog = useCallback(async () => {
    if (!noteId) return;
    try {
      const logs = await getGitLog({
        fileId: noteId,
        fileName: noteTitle,
        depth: 80,
      });
      setGitCommits(logs);
      if (logs.length > 0 && !selectedCommitOid && logs[0]) {
        setSelectedCommitOid(logs[0].oid);
      }
    } catch (err) {
      console.warn("Failed to load git commits:", err);
    }
  }, [noteId, noteTitle, selectedCommitOid]);

  // Load Git log on open or noteId change
  useEffect(() => {
    if (isOpen) {
      void refreshGitLog();
      setConfirmRestore(false);
    } else {
      setSelectedCommitOid(null);
      setSelectedDriveRevId(null);
      setHistoricalContent(null);
      setMilestoneMessage("");
    }
  }, [isOpen, refreshGitLog]);

  // Select initial Drive revision when revisions arrive
  useEffect(() => {
    if (
      activeSource === "drive" &&
      revisionsQuery.data &&
      revisionsQuery.data.length > 0 &&
      !selectedDriveRevId &&
      revisionsQuery.data[0]
    ) {
      setSelectedDriveRevId(revisionsQuery.data[0].id);
    }
  }, [activeSource, revisionsQuery.data, selectedDriveRevId]);

  // Load historical content when selection changes
  useEffect(() => {
    let isCancelled = false;

    async function loadContent() {
      if (!isOpen) return;

      if (activeSource === "git") {
        if (!selectedCommitOid) {
          setHistoricalContent(null);
          return;
        }
        setIsLoadingContent(true);
        try {
          const content = await getFileAtCommit({
            fileId: noteId,
            fileName: noteTitle,
            oid: selectedCommitOid,
          });
          if (!isCancelled) {
            setHistoricalContent(content);
          }
        } catch {
          if (!isCancelled) {
            setHistoricalContent(null);
          }
        } finally {
          if (!isCancelled) {
            setIsLoadingContent(false);
          }
        }
      } else if (activeSource === "drive") {
        if (!selectedDriveRevId) {
          setHistoricalContent(null);
          return;
        }
        setIsLoadingContent(true);
        try {
          const content = await utils.notes.getRevisionContent.fetch({
            fileId: noteId,
            revisionId: selectedDriveRevId,
          });
          if (!isCancelled) {
            setHistoricalContent(content ?? "");
          }
        } catch {
          if (!isCancelled) {
            setHistoricalContent(null);
          }
        } finally {
          if (!isCancelled) {
            setIsLoadingContent(false);
          }
        }
      }
    }

    void loadContent();

    return () => {
      isCancelled = true;
    };
  }, [
    activeSource,
    selectedCommitOid,
    selectedDriveRevId,
    noteId,
    noteTitle,
    isOpen,
    utils,
  ]);

  // Compute diff against current content
  const lineDiff = useMemo<DiffResult>(() => {
    if (historicalContent === null) {
      return {
        hasChanges: false,
        additions: 0,
        deletions: 0,
        totalChanges: 0,
        summary: "0 changes",
        lines: [],
      };
    }
    // Compare historical (baseline) to active currentContent
    return computeLineDiff(historicalContent, currentContent);
  }, [historicalContent, currentContent]);

  const drawingDiff = useMemo<DrawingDiffSummary>(() => {
    if (!isDrawing || historicalContent === null) {
      return {
        hasChanges: false,
        addedCount: 0,
        removedCount: 0,
        modifiedCount: 0,
        totalChanges: 0,
        changes: [],
        summaryText: "0 changes",
      };
    }
    return computeExcalidrawSemanticDiff(historicalContent, currentContent);
  }, [isDrawing, historicalContent, currentContent]);

  // Handle milestone creation
  const handleCreateMilestone = async () => {
    if (!milestoneMessage.trim() || isCreatingMilestone) return;
    setIsCreatingMilestone(true);
    try {
      const res = await createMilestoneCommit({
        fileId: noteId,
        fileName: noteTitle,
        content: currentContent,
        message: milestoneMessage.trim(),
      });
      if (res.success && res.oid) {
        toast.success("Milestone snapshot created in Git");
        setMilestoneMessage("");
        await refreshGitLog();
        setSelectedCommitOid(res.oid);
      } else {
        toast.error(
          `Failed to create milestone: ${res.error ?? "Unknown error"}`,
        );
      }
    } catch (err: unknown) {
      const errMsg = err instanceof Error ? err.message : String(err);
      toast.error(`Error: ${errMsg}`);
    } finally {
      setIsCreatingMilestone(false);
    }
  };

  // Handle Restore
  const handleRestore = () => {
    if (historicalContent === null) return;
    onRestoreContent(historicalContent);
    toast.success("Restored historical snapshot to active document");
    onClose();
  };

  // Handle Copy to clipboard
  const handleCopy = () => {
    if (historicalContent === null) return;
    void navigator.clipboard.writeText(historicalContent);
    setCopied(true);
    toast.success("Version content copied to clipboard");
    setTimeout(() => setCopied(false), 2000);
  };

  // Handle Download file
  const handleDownload = () => {
    if (historicalContent === null) return;
    const blob = new Blob([historicalContent], {
      type: "text/plain;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    const timestamp =
      activeSource === "git"
        ? (gitCommits.find((c) => c.oid === selectedCommitOid)?.shortOid ??
          "snapshot")
        : (selectedDriveRevId?.slice(0, 8) ?? "rev");
    link.href = url;
    link.download = `${noteTitle.replace(/\.[^/.]+$/, "")}_${timestamp}${noteTitle.slice(
      noteTitle.lastIndexOf("."),
    )}`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    toast.info("Downloaded historical version");
  };

  if (!isOpen) return null;

  const currentGitItem = gitCommits.find((c) => c.oid === selectedCommitOid);
  const currentDriveItem = revisionsQuery.data?.find(
    (r) => r.id === selectedDriveRevId,
  );

  return (
    <div className="animate-in fade-in fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-3 backdrop-blur-xs duration-200 sm:p-6">
      <div className="bg-background border-border/80 text-foreground flex h-[88vh] w-full max-w-5xl flex-col overflow-hidden rounded-2xl border shadow-2xl">
        {/* Top Header */}
        <div className="border-border bg-card/60 flex items-center justify-between border-b px-5 py-3.5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="bg-primary/10 text-primary rounded-xl p-2">
              <History className="h-5 w-5" />
            </div>
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <h2 className="max-w-[320px] truncate text-sm font-semibold tracking-tight sm:max-w-md">
                  {noteTitle}
                </h2>
                <span className="bg-muted text-muted-foreground rounded-full px-2 py-0.5 font-mono text-[11px]">
                  Version History
                </span>
              </div>
              <p className="text-muted-foreground truncate text-xs">
                Compare past snapshots against current edits and restore in 1
                click
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {/* Source Switcher */}
            <div className="bg-muted/70 border-border/60 flex items-center rounded-xl border p-1">
              <button
                type="button"
                onClick={() => {
                  setActiveSource("git");
                  setConfirmRestore(false);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeSource === "git"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <GitBranch className="h-3.5 w-3.5" />
                <span>Git Commits</span>
                {gitCommits.length > 0 && (
                  <span className="py-0.2 bg-primary/15 text-primary rounded-full px-1.5 font-mono text-[10px] font-semibold">
                    {gitCommits.length}
                  </span>
                )}
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveSource("drive");
                  setConfirmRestore(false);
                }}
                className={`flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-all ${
                  activeSource === "drive"
                    ? "bg-background text-foreground shadow-xs"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Cloud className="h-3.5 w-3.5" />
                <span>Drive Revisions</span>
                {revisionsQuery.data && (
                  <span className="py-0.2 bg-primary/15 text-primary rounded-full px-1.5 font-mono text-[10px] font-semibold">
                    {revisionsQuery.data.length}
                  </span>
                )}
              </button>
            </div>

            <button
              onClick={onClose}
              className="text-muted-foreground hover:text-foreground hover:bg-muted/60 cursor-pointer rounded-xl p-2 transition-all"
              title="Close (Esc)"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Modal Main Body */}
        <div className="bg-background flex min-h-0 flex-1 flex-col overflow-hidden md:flex-row">
          {/* Left Column: Timeline List */}
          <div className="border-border bg-card/30 flex w-full shrink-0 flex-col border-b md:w-80 md:border-r md:border-b-0 lg:w-96">
            {/* Sub-header / Actions */}
            <div className="border-border/60 flex items-center justify-between gap-2 border-b p-3">
              <span className="text-muted-foreground text-xs font-semibold tracking-wider uppercase">
                {activeSource === "git" ? "Local Git Log" : "Cloud Revisions"}
              </span>

              <button
                onClick={() => {
                  if (activeSource === "git") {
                    void refreshGitLog();
                  } else {
                    void revisionsQuery.refetch();
                  }
                }}
                className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg p-1.5 transition-all"
                title="Refresh history"
              >
                <RefreshCw
                  className={`h-3.5 w-3.5 ${
                    revisionsQuery.isFetching ? "text-primary animate-spin" : ""
                  }`}
                />
              </button>
            </div>

            {/* Git Milestone Creator (visible in Git mode) */}
            {activeSource === "git" && (
              <div className="border-border/50 bg-muted/20 border-b p-3">
                <div className="text-foreground mb-1.5 flex items-center gap-1.5 text-[11px] font-medium">
                  <Sparkles className="h-3.5 w-3.5 text-amber-500" />
                  <span>Create Git Milestone</span>
                </div>
                <div className="flex gap-1.5">
                  <input
                    type="text"
                    placeholder="Milestone tag (e.g. Before refactor)..."
                    value={milestoneMessage}
                    onChange={(e) => setMilestoneMessage(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        void handleCreateMilestone();
                      }
                    }}
                    className="border-border bg-background focus:ring-primary text-foreground placeholder:text-muted-foreground flex-1 rounded-lg border px-2.5 py-1.5 text-xs focus:ring-1 focus:outline-hidden"
                  />
                  <button
                    onClick={() => void handleCreateMilestone()}
                    disabled={!milestoneMessage.trim() || isCreatingMilestone}
                    className="bg-primary text-primary-foreground flex shrink-0 items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <Plus className="h-3.5 w-3.5" />
                    <span>Save</span>
                  </button>
                </div>
              </div>
            )}

            {/* List Entries */}
            <div className="divide-border/40 flex-1 space-y-1 divide-y overflow-y-auto p-2">
              {activeSource === "git" ? (
                gitCommits.length === 0 ? (
                  <div className="text-muted-foreground px-4 py-12 text-center text-xs">
                    <GitCommit className="text-primary mx-auto mb-2 h-8 w-8 opacity-40" />
                    <p className="text-foreground font-medium">
                      No Git commits found
                    </p>
                    <p className="mt-1 text-[11px]">
                      Commits will appear automatically when you save, or create
                      a milestone snapshot above.
                    </p>
                  </div>
                ) : (
                  gitCommits.map((commit) => {
                    const isSelected = selectedCommitOid === commit.oid;
                    return (
                      <button
                        key={commit.oid}
                        type="button"
                        onClick={() => {
                          setSelectedCommitOid(commit.oid);
                          setConfirmRestore(false);
                        }}
                        className={`w-full cursor-pointer rounded-xl p-2.5 text-left transition-all ${
                          isSelected
                            ? "bg-primary/10 border-primary/30 text-foreground border shadow-2xs"
                            : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="min-w-0 flex-1">
                            <div className="flex flex-wrap items-center gap-1.5">
                              {commit.isMilestone && (
                                <span className="inline-flex items-center gap-1 rounded bg-amber-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-amber-600 dark:text-amber-400">
                                  <Sparkles className="h-2.5 w-2.5" />
                                  Milestone
                                </span>
                              )}
                              <span className="bg-muted text-muted-foreground rounded px-1.5 py-0.5 font-mono text-[10px] font-semibold">
                                {commit.shortOid}
                              </span>
                            </div>
                            <p className="text-foreground mt-1 truncate text-xs font-medium">
                              {commit.message}
                            </p>
                            <div className="text-muted-foreground mt-1.5 flex items-center gap-2 text-[11px]">
                              <span className="flex max-w-[120px] items-center gap-1 truncate">
                                <User className="h-3 w-3 shrink-0" />
                                {commit.author.name}
                              </span>
                              <span>•</span>
                              <span className="flex shrink-0 items-center gap-1">
                                <Clock className="h-3 w-3 shrink-0" />
                                {commit.author.dateStr}
                              </span>
                            </div>
                          </div>
                          <ChevronRight
                            className={`mt-2 h-4 w-4 shrink-0 transition-transform ${
                              isSelected
                                ? "text-primary translate-x-0.5"
                                : "opacity-30"
                            }`}
                          />
                        </div>
                      </button>
                    );
                  })
                )
              ) : revisionsQuery.isLoading ? (
                <div className="text-muted-foreground flex flex-col items-center justify-center py-12 text-center text-xs">
                  <RefreshCw className="text-primary mb-2 h-6 w-6 animate-spin" />
                  <span>Loading Google Drive revisions...</span>
                </div>
              ) : !revisionsQuery.data || revisionsQuery.data.length === 0 ? (
                <div className="text-muted-foreground px-4 py-12 text-center text-xs">
                  <Cloud className="text-primary mx-auto mb-2 h-8 w-8 opacity-40" />
                  <p className="text-foreground font-medium">
                    No cloud revisions available
                  </p>
                  <p className="mt-1 text-[11px]">
                    Google Drive records revisions whenever the file is updated
                    in the cloud.
                  </p>
                </div>
              ) : (
                revisionsQuery.data.map((rev, index) => {
                  const isSelected = selectedDriveRevId === rev.id;
                  const formattedDate = new Date(
                    rev.modifiedTime,
                  ).toLocaleString();
                  const sizeKB = rev.size
                    ? (Number(rev.size) / 1024).toFixed(1)
                    : undefined;

                  return (
                    <button
                      key={rev.id}
                      type="button"
                      onClick={() => {
                        setSelectedDriveRevId(rev.id);
                        setConfirmRestore(false);
                      }}
                      className={`w-full cursor-pointer rounded-xl p-2.5 text-left transition-all ${
                        isSelected
                          ? "bg-primary/10 border-primary/30 text-foreground border shadow-2xs"
                          : "hover:bg-muted/60 text-muted-foreground hover:text-foreground"
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <span className="text-foreground text-xs font-medium">
                              {index === 0
                                ? "Latest Cloud Save"
                                : `Revision #${rev.id.slice(-6)}`}
                            </span>
                            {rev.keepForever && (
                              <span className="inline-flex items-center gap-0.5 rounded bg-emerald-500/20 px-1.5 py-0.5 text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
                                <Pin className="h-2.5 w-2.5" />
                                Pinned
                              </span>
                            )}
                          </div>
                          <div className="text-muted-foreground mt-1 flex items-center gap-2 text-[11px]">
                            <span className="flex items-center gap-1">
                              <Clock className="h-3 w-3" />
                              {formattedDate}
                            </span>
                            {sizeKB && (
                              <>
                                <span>•</span>
                                <span>{sizeKB} KB</span>
                              </>
                            )}
                          </div>
                        </div>

                        {/* Pin Button */}
                        <div
                          onClick={(e) => {
                            e.stopPropagation();
                            pinMutation.mutate({
                              fileId: noteId,
                              revisionId: rev.id,
                              keepForever: !rev.keepForever,
                            });
                          }}
                          className={`hover:bg-muted cursor-pointer rounded-lg p-1.5 transition-colors ${
                            rev.keepForever
                              ? "text-emerald-500"
                              : "text-muted-foreground hover:text-foreground"
                          }`}
                          title={
                            rev.keepForever
                              ? "Unpin revision"
                              : "Pin (Keep forever)"
                          }
                        >
                          <Pin className="h-3.5 w-3.5" />
                        </div>
                      </div>
                    </button>
                  );
                })
              )}
            </div>
          </div>

          {/* Right Column: Diff & Content Inspector */}
          <div className="bg-background flex min-w-0 flex-1 flex-col overflow-hidden">
            {/* Action Bar */}
            <div className="border-border bg-card/40 flex flex-wrap items-center justify-between gap-2 border-b p-3">
              <div className="flex min-w-0 items-center gap-2">
                <span className="text-foreground truncate text-xs font-semibold">
                  {activeSource === "git"
                    ? (currentGitItem?.message ?? "Selected Commit")
                    : currentDriveItem
                      ? `Revision from ${new Date(currentDriveItem.modifiedTime).toLocaleDateString()}`
                      : "Selected Revision"}
                </span>

                {historicalContent !== null && (
                  <div className="bg-muted flex items-center gap-1.5 rounded-full px-2 py-0.5 font-mono text-xs">
                    {lineDiff.hasChanges ? (
                      <>
                        <span className="font-bold text-emerald-500">
                          +{lineDiff.additions}
                        </span>
                        <span className="font-bold text-rose-500">
                          -{lineDiff.deletions}
                        </span>
                      </>
                    ) : (
                      <span className="text-muted-foreground">
                        Identical to current note
                      </span>
                    )}
                  </div>
                )}
              </div>

              {/* View toggle & Action Buttons */}
              <div className="flex items-center gap-1.5">
                {/* Diff / Preview Toggle */}
                <div className="bg-muted/60 border-border/60 flex items-center rounded-lg border p-0.5">
                  <button
                    type="button"
                    onClick={() => setViewMode("diff")}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                      viewMode === "diff"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Diff
                  </button>
                  <button
                    type="button"
                    onClick={() => setViewMode("preview")}
                    className={`rounded-md px-2 py-1 text-[11px] font-medium transition-all ${
                      viewMode === "preview"
                        ? "bg-background text-foreground shadow-2xs"
                        : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    Content
                  </button>
                </div>

                {/* Copy */}
                <button
                  type="button"
                  onClick={handleCopy}
                  disabled={historicalContent === null}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg p-1.5 text-xs transition-all"
                  title="Copy content to clipboard"
                >
                  {copied ? (
                    <Check className="h-4 w-4 text-emerald-500" />
                  ) : (
                    <Copy className="h-4 w-4" />
                  )}
                </button>

                {/* Download */}
                <button
                  type="button"
                  onClick={handleDownload}
                  disabled={historicalContent === null}
                  className="text-muted-foreground hover:text-foreground hover:bg-muted/80 rounded-lg p-1.5 text-xs transition-all"
                  title="Download this version"
                >
                  <Download className="h-4 w-4" />
                </button>

                {/* Restore button */}
                {!confirmRestore ? (
                  <button
                    type="button"
                    onClick={() => setConfirmRestore(true)}
                    disabled={historicalContent === null}
                    className="bg-primary text-primary-foreground flex cursor-pointer items-center gap-1.5 rounded-xl px-3 py-1.5 text-xs font-semibold shadow-xs transition-all hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    <RotateCcw className="h-3.5 w-3.5" />
                    <span>Restore Version</span>
                  </button>
                ) : (
                  <div className="flex items-center gap-1 rounded-xl border border-amber-500/30 bg-amber-500/10 p-1">
                    <span className="px-1.5 text-[11px] font-medium text-amber-600 dark:text-amber-400">
                      Confirm replace?
                    </span>
                    <button
                      type="button"
                      onClick={handleRestore}
                      className="cursor-pointer rounded-lg bg-amber-500 px-2.5 py-1 text-xs font-bold text-white transition-all hover:bg-amber-600"
                    >
                      Yes, Restore
                    </button>
                    <button
                      type="button"
                      onClick={() => setConfirmRestore(false)}
                      className="text-muted-foreground hover:text-foreground cursor-pointer rounded-lg px-2 py-1 text-xs"
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </div>

            {/* Viewer Area */}
            <div className="bg-background flex-1 overflow-y-auto p-4 font-mono text-xs">
              {isLoadingContent ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                  <RefreshCw className="text-primary mb-3 h-8 w-8 animate-spin" />
                  <p className="text-foreground text-sm font-semibold">
                    Fetching Version Content
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Retrieving snapshot data from{" "}
                    {activeSource === "git"
                      ? "local Git repository"
                      : "Google Drive"}
                    ...
                  </p>
                </div>
              ) : historicalContent === null ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center">
                  <Layers className="text-muted-foreground/40 mb-3 h-10 w-10" />
                  <p className="text-foreground text-sm font-semibold">
                    No Snapshot Selected
                  </p>
                  <p className="text-muted-foreground mt-1 text-xs">
                    Select a commit or revision from the timeline to view its
                    diff and contents.
                  </p>
                </div>
              ) : viewMode === "preview" ? (
                /* Full Content Preview */
                <div className="border-border bg-card overflow-x-auto rounded-xl border p-4 leading-relaxed whitespace-pre-wrap select-text">
                  {historicalContent}
                </div>
              ) : /* Diff Mode */
              !lineDiff.hasChanges &&
                (!isDrawing || !drawingDiff.hasChanges) ? (
                <div className="text-muted-foreground flex h-full flex-col items-center justify-center text-center">
                  <Check className="mb-2 h-10 w-10 text-emerald-500 opacity-80" />
                  <p className="text-foreground text-sm font-semibold">
                    Identical to Active Note
                  </p>
                  <p className="text-muted-foreground mt-1 max-w-sm text-xs">
                    There are no content differences between this historical
                    snapshot and your active note.
                  </p>
                </div>
              ) : isDrawing && drawingDiff.hasChanges ? (
                /* Visual Semantic Diff for Excalidraw */
                <div className="space-y-3 font-sans">
                  <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
                    <div className="bg-muted/40 flex items-center justify-between px-4 py-2.5 text-xs font-medium">
                      <div className="flex items-center gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-indigo-500" />
                        <span className="text-foreground font-semibold">
                          Canvas Visual Changes ({drawingDiff.changes.length})
                        </span>
                      </div>
                      <div className="flex items-center gap-2 font-mono text-[11px]">
                        <span className="font-bold text-emerald-500">
                          +{drawingDiff.addedCount}
                        </span>
                        <span className="font-bold text-rose-500">
                          -{drawingDiff.removedCount}
                        </span>
                        <span className="font-bold text-amber-500">
                          ~{drawingDiff.modifiedCount}
                        </span>
                      </div>
                    </div>

                    <div className="divide-border/30 max-h-96 divide-y overflow-y-auto p-3">
                      {drawingDiff.changes.map((change) => {
                        const isAdd = change.action === "added";
                        const isDel = change.action === "removed";

                        return (
                          <div
                            key={change.id}
                            className="flex items-start justify-between gap-3 py-2 text-xs first:pt-0 last:pb-0"
                          >
                            <div className="flex min-w-0 flex-1 items-start gap-2.5">
                              <span
                                className={`mt-0.5 flex h-4 w-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
                                  isAdd
                                    ? "bg-emerald-500/20 text-emerald-600 dark:text-emerald-400"
                                    : isDel
                                      ? "bg-rose-500/20 text-rose-600 dark:text-rose-400"
                                      : "bg-amber-500/20 text-amber-600 dark:text-amber-400"
                                }`}
                              >
                                {isAdd ? "+" : isDel ? "-" : "~"}
                              </span>
                              <div className="min-w-0 flex-1">
                                <span className="text-foreground font-medium">
                                  {change.title}
                                </span>
                                {change.details &&
                                  change.details.length > 0 && (
                                    <ul className="text-muted-foreground mt-1 list-inside list-disc space-y-0.5 font-mono text-[11px]">
                                      {change.details.map((detail, dIdx) => (
                                        <li key={dIdx}>{detail}</li>
                                      ))}
                                    </ul>
                                  )}
                              </div>
                            </div>
                            <span className="bg-muted/60 text-muted-foreground shrink-0 rounded px-1.5 py-0.5 font-mono text-[10px] uppercase">
                              {change.elementType}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </div>
              ) : (
                /* Standard Line Diff */
                <div className="border-border bg-card overflow-hidden rounded-xl border shadow-2xs">
                  <div className="divide-border/20 divide-y">
                    {lineDiff.lines.map((line, idx) => {
                      const isAdded = line.type === "added";
                      const isRemoved = line.type === "removed";

                      return (
                        <div
                          key={idx}
                          className={`flex items-start px-3 py-1 font-mono text-xs leading-relaxed select-text ${
                            isAdded
                              ? "bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
                              : isRemoved
                                ? "bg-rose-500/10 text-rose-700 line-through opacity-80 dark:text-rose-300"
                                : "text-foreground/80 hover:bg-muted/30"
                          }`}
                        >
                          <span
                            className={`w-6 shrink-0 text-center font-bold select-none ${
                              isAdded
                                ? "text-emerald-600 dark:text-emerald-400"
                                : isRemoved
                                  ? "text-rose-600 dark:text-rose-400"
                                  : "text-muted-foreground/40"
                            }`}
                          >
                            {isAdded ? "+" : isRemoved ? "-" : " "}
                          </span>
                          <span className="flex-1 break-all whitespace-pre-wrap">
                            {line.content || " "}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
