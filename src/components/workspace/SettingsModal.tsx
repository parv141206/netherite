"use client";

import React, { useState } from "react";
import { X, HardDrive, Moon, Sun, Monitor, Type, Folder, Check } from "lucide-react";
import { useTheme } from "~/components/ThemeProvider";

interface SettingsModalProps {
  isOpen: boolean;
  onClose: () => void;
  userSession?: any;
}

export function SettingsModal({ isOpen, onClose, userSession }: SettingsModalProps) {
  const { theme, setTheme } = useTheme();
  const [folderPath, setFolderPath] = useState("Netherite");
  const [fontFamily, setFontFamily] = useState("sans");

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-4">
      <div className="w-full max-w-lg bg-card border border-border rounded-2xl shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-200">
        {/* Modal Header */}
        <div className="p-4 border-b border-border flex items-center justify-between">
          <div className="flex items-center gap-2">
            <HardDrive className="w-5 h-5 text-foreground" />
            <h2 className="font-bold text-base text-foreground">Workspace Settings</h2>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 hover:bg-accent rounded-lg text-muted-foreground hover:text-foreground transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 space-y-6 text-sm">
          {/* Storage Section */}
          <div className="space-y-3">
            <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
              Google Drive Storage Folder
            </label>
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Folder className="w-4 h-4 absolute left-3 top-2.5 text-muted-foreground" />
                <input
                  type="text"
                  value={folderPath}
                  onChange={(e) => setFolderPath(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 bg-background border border-border rounded-lg text-xs text-foreground focus:outline-none focus:ring-1 focus:ring-ring"
                />
              </div>
              <button
                onClick={() => alert(`Drive storage path saved: ${folderPath}`)}
                className="px-3 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
              >
                Save
              </button>
            </div>
            <p className="text-[11px] text-muted-foreground">
              All markdown files and uploads will be stored inside this folder on your personal Google Drive.
            </p>
          </div>

          {/* Theme Section */}
          <div className="space-y-3">
            <label className="font-semibold text-xs text-muted-foreground uppercase tracking-wider block">
              Theme Mode
            </label>
            <div className="grid grid-cols-3 gap-3">
              {[
                { id: "light", label: "Light", icon: Sun },
                { id: "dark", label: "Dark", icon: Moon },
                { id: "system", label: "System", icon: Monitor },
              ].map((item) => {
                const Icon = item.icon;
                const active = theme === item.id;
                return (
                  <button
                    key={item.id}
                    onClick={() => setTheme(item.id as any)}
                    className={`flex items-center justify-center gap-2 p-3 rounded-xl border transition-all ${
                      active
                        ? "border-foreground bg-accent font-semibold text-foreground"
                        : "border-border text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    <Icon className="w-4 h-4" />
                    <span className="text-xs">{item.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Account Details */}
          <div className="p-3 bg-muted rounded-xl border border-border flex items-center justify-between text-xs">
            <div>
              <div className="font-semibold text-foreground">
                {userSession?.user?.name || "Connected User"}
              </div>
              <div className="text-muted-foreground">{userSession?.user?.email}</div>
            </div>
            <span className="px-2 py-1 bg-emerald-500/10 text-emerald-500 rounded font-mono text-[10px]">
              Connected
            </span>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-border flex justify-end">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-foreground text-background text-xs font-semibold rounded-lg hover:opacity-90 transition-all"
          >
            Done
          </button>
        </div>
      </div>
    </div>
  );
}
