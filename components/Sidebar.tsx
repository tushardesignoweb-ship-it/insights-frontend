"use client";

import React, { memo } from "react";
import Link from "next/link";
import {
  BarChart3,
  History,
  Settings,
  LogOut,
  Plus,
  Loader2,
  Sparkles,
  Database,
  Bot,
} from "lucide-react";
import { Button } from "@/components/ui/button";

interface SidebarProps {
  activeTab: string;
  user: any;
  isUpgrading: boolean;
  onUpgrade: () => void;
  onLogout: () => void;
}

const Sidebar = ({
  activeTab,
  user,
  isUpgrading,
  onUpgrade,
  onLogout,
}: SidebarProps) => {
  return (
    <aside className="fixed left-0 top-0 z-40 h-screen w-64 border-r bg-background">
      <div className="flex h-16 items-center gap-2 border-b px-6">
        <BarChart3 className="h-6 w-6 text-primary" />
        <span className="font-bold">AI Form Insights</span>
      </div>
      <nav className="space-y-1 p-4">
        <Link
          href="/dashboard/new"
          prefetch={true}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "new"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Plus className="h-4 w-4" />
          New Analysis
        </Link>
        <Link
          href="/dashboard/google"
          prefetch={true}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "google"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Database className="h-4 w-4" />
          Google Forms
        </Link>
        <Link
          href="/dashboard/google/create"
          prefetch={true}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "builder"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <Bot className="h-4 w-4" />
          AI Form Builder
        </Link>
        <Link
          href="/dashboard/history"
          prefetch={true}
          className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
            activeTab === "history"
              ? "bg-primary text-primary-foreground"
              : "text-muted-foreground hover:bg-muted hover:text-foreground"
          }`}
        >
          <History className="h-4 w-4" />
          History
        </Link>
        <div className="pt-4">
          <p className="mb-2 px-3 text-[10px] font-bold uppercase tracking-wider text-muted-foreground">
            Account
          </p>
          <Link
            href="/dashboard/settings"
            prefetch={true}
            className={`flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors ${
              activeTab === "settings"
                ? "bg-primary text-primary-foreground"
                : "text-muted-foreground hover:bg-muted hover:text-foreground"
            }`}
          >
            <Settings className="h-4 w-4" />
            Settings
          </Link>
          <button
            onClick={onLogout}
            className="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
          >
            <LogOut className="h-4 w-4" />
            Log out
          </button>
        </div>
      </nav>

      {/* Pro Banner */}
      {user?.plan?.id === "free" && (
        <div className="absolute bottom-4 left-4 right-4">
          <div className="rounded-xl bg-primary/10 p-4">
            <div className="flex items-center gap-2 mb-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-bold">Go Pro</span>
            </div>
            <p className="text-xs text-muted-foreground mb-3">
              Get up to 4 analyses and PDF exports.
            </p>
            <Button size="sm" className="w-full" onClick={onUpgrade} disabled={isUpgrading}>
              {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Upgrade
            </Button>
          </div>
        </div>
      )}
    </aside>
  );
};

export default memo(Sidebar);
