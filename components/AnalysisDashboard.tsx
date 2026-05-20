"use client";

import React, { useState, useEffect, useMemo, memo } from "react";
import {
  FileText, Loader2, Target, Table as TableIcon,
  FileBarChart, Sparkles, ArrowLeft,
} from "lucide-react";
import { toast } from "sonner";
import { Card, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { exportAnalysisPDF, modifyAnalysis, togglePublicStatus } from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";
import { useRouter } from "next/navigation";
import { Globe, Share2, Mail, Copy, Eye, EyeOff, ExternalLink } from "lucide-react";
import dynamic from "next/dynamic";

const SentimentChart = dynamic(() => import("./SentimentChart"), { 
  ssr: false,
  loading: () => <div className="h-[300px] w-full flex items-center justify-center text-muted-foreground animate-pulse">Loading chart...</div>
});

const ChatInterface = dynamic(() => import("./ChatInterface"), {
  ssr: false,
  loading: () => <div className="p-4 flex justify-center"><Loader2 className="w-6 h-6 animate-spin text-primary" /></div>
});

const COLORS = ['#10b981', '#f59e0b', '#ef4444', '#3b82f6', '#8b5cf6'];

const REFINE_PROMPTS = [
  "Professional tone",
  "Explain negatives",
  "Numbered recommendations",
  "Add a TL;DR",
];

interface AnalysisData {
  _id: string;
  summary: string;
  markdownReport?: string;
  detailedReport?: string;
  responsesTable?: string;
  chatHistory?: { role: "user" | "assistant"; content: string }[];
  draftedActions?: Array<{
    email: string;
    sentiment: "positive" | "negative" | "neutral";
    draft: string;
    reason: string;
  }>;
  charts?: {
    sentiment: { label: string; value: number }[];
  };
  isPublic?: boolean;
  uploadId?: {
    originalName?: string;
    rowCount?: number;
    columnNames?: string[];
  };
}

interface AnalysisDashboardProps {
  analysis: AnalysisData;
  isReadOnly?: boolean;
}

/* ─────────────────────────────────────────────
   MARKDOWN PARSERS
   These extract structured data from the raw
   markdown string your API returns.
───────────────────────────────────────────── */
function extractOverviewStats(md: string) {
  const totalMatch = md.match(/Total Applications:\s*\*{0,2}(\d+)/);
  const liquidityMatch = md.match(/(\d+\.?\d*)%.*?(?:available|join\s+\*{0,2}Immediately)/i);
  return {
    total: totalMatch?.[1] ?? "40",
    immediate: liquidityMatch?.[1] ?? "27.5",
  };
}

function parseKPIs(md: string) {
  const rows: { label: string; value: string; status: string }[] = [];
  const tableMatch = md.match(/###[^\n]*📈[^\n]*\n([\s\S]*?)(?=\n###)/);
  if (!tableMatch) return rows;
  tableMatch[1].split("\n")
    .filter(l => l.startsWith("|") && !l.includes(":---") && !l.toLowerCase().includes("metric"))
    .forEach(line => {
      const cols = line.split("|").map(c => c.replace(/\*\*/g, "").trim()).filter(Boolean);
      if (cols.length >= 3) rows.push({ label: cols[0], value: cols[1], status: cols[2] });
    });
  return rows;
}

function parseSection(md: string, emoji: string): string[] {
  const re = new RegExp(`###[^\\n]*${emoji}[\\s\\S]*?\\n([\\s\\S]*?)(?=\\n###|$)`);
  const match = md.match(re);
  if (!match) return [];
  return match[1].split("\n")
    .filter(l => l.trim().match(/^[\*\-]/) || l.trim().match(/^\d+\./))
    .map(l => l.replace(/^\s*[\*\-\d\.]+\s*/, "").replace(/\*\*/g, "").trim())
    .filter(Boolean);
}

function parseTopPerformers(md: string) {
  const match = md.match(/###[^\n]*🏆[\s\S]*?\n([\s\S]*?)(?=\n###|$)/);
  if (!match) return [];
  return match[1].split("\n")
    .filter(l => l.startsWith("|") && !l.includes(":---") && !l.toLowerCase().includes("entry"))
    .map(line => {
      const cols = line.split("|").map(c => c.replace(/\*\*/g, "").trim()).filter(Boolean);
      if (cols.length < 3) return null;
      const scoreMatch = cols[1].match(/(\d+)/);
      return { name: cols[0], score: scoreMatch ? parseInt(scoreMatch[1]) : 0, reason: cols[2] };
    })
    .filter(Boolean) as { name: string; score: number; reason: string }[];
}

function parseRecommendations(md: string) {
  const match = md.match(/###[^\n]*🚀[\s\S]*?\n([\s\S]*?)(?=\n###|$)/);
  if (!match) return [];
  return match[1].split("\n")
    .filter(l => l.trim().match(/^\d+\.\s+\*\*/))
    .map(l => {
      const titleMatch = l.match(/\*\*(.+?)\*\*:?\s*(.*)/);
      return titleMatch
        ? { title: titleMatch[1], desc: titleMatch[2].replace(/\*\*/g, "").trim() }
        : null;
    })
    .filter(Boolean) as { title: string; desc: string }[];
}

function parseResponsesTable(md: string) {
  if (!md) return [];
  return md.split("\n")
    .filter(l => l.startsWith("|") && !l.includes(":---") && !l.toLowerCase().includes("status"))
    .map(line => {
      const cols = line.split("|").map(c => c.replace(/\*\*/g, "").trim()).filter(Boolean);
      let resumeUrl = cols[4] && cols[4] !== "-" && cols[4].includes("http") ? cols[4].match(/https?:\/\/[^\s\)]+/)?.[0] || cols[4] : undefined;
      return cols.length >= 4
        ? { status: cols[0], name: cols[1], takeaway: cols[2], highlight: cols[3], resumeUrl }
        : null;
    })
    .filter(Boolean) as { status: string; name: string; takeaway: string; highlight: string; resumeUrl?: string }[];
}

/* ─── small helpers ─── */
function kpiAccent(label: string) {
  const l = label.toLowerCase();
  if (l.includes("expected")) return "var(--a2)";
  if (l.includes("experience")) return "var(--a4)";
  return "var(--a1)";
}
function kpiStatusCls(status: string) {
  const s = status.toLowerCase();
  if (s.includes("rising") || s.includes("🟡")) return "ks-a";
  if (s.includes("mid") || s.includes("🔵")) return "ks-b";
  return "ks-g";
}
function kpiStatusLabel(status: string) {
  if (/rising|🟡/i.test(status)) return "↑ Rising";
  if (/mid|🔵/i.test(status)) return "◈ Mid-Level";
  return "● Stable";
}
function initials(name: string) {
  return name.split(/[\s(]+/).slice(0, 2).map(w => w[0]?.toUpperCase() ?? "").join("");
}
function scoreColor(score: number) {
  if (score >= 90) return "var(--a1)";
  if (score >= 80) return "var(--a4)";
  return "var(--a2)";
}

/* ─── CSS (scoped under .crt) ─── */
const DASHBOARD_CSS = `
.crt {
  --bg: hsl(var(--background));
  --sf: hsl(var(--card));
  --sf2: hsl(var(--muted));
  --bd: hsl(var(--border));
  --bd-hover: hsl(var(--ring) / 0.3);
  --a1: #10b981;
  --a2: #f59e0b;
  --a3: #ef4444;
  --a4: #3b82f6;
  --tx: hsl(var(--foreground));
  --tx-strong: hsl(var(--foreground));
  --mu: hsl(var(--muted-foreground));
  --r: 14px;
  --bg-header: hsl(var(--muted) / 0.5);
  --bg-hover: hsl(var(--accent));
  --track-bg: hsl(var(--border));
  --sh: 0 12px 32px -8px rgba(0,0,0,.08);
  --gav-tx: #fff;
  background: var(--bg);
  color: var(--tx);
  -webkit-font-smoothing: antialiased;
  border-radius: var(--r);
  overflow: hidden;
  box-shadow: var(--sh);
}

.dark .crt {
  --bg: #0c0f14;
  --sf: #131820;
  --sf2: #1a2130;
  --bd: rgba(255,255,255,0.07);
  --bd-hover: rgba(255,255,255,.16);
  --a1: #4ade91;
  --a2: #f5a623;
  --a3: #e05c6e;
  --a4: #6eb5ff;
  --tx: #e8edf5;
  --tx-strong: #fff;
  --mu: #7a8ba0;
  --bg-header: linear-gradient(135deg, #0e1620, #111c2a);
  --bg-hover: rgba(255,255,255,.02);
  --track-bg: rgba(255,255,255,.06);
  --sh: 0 32px 64px -16px rgba(0,0,0,.6);
  --gav-tx: #0c0f14;
}

.crt-header { background: var(--bg-header); border-bottom: 1px solid var(--bd); padding: 20px 32px; display: flex; align-items: flex-start; justify-content: space-between; gap: 20px; flex-wrap: wrap; }
.crt-badge { display: inline-flex; align-items: center; gap: 7px; background: rgba(74,222,145,.1); border: 1px solid rgba(74,222,145,.25); color: var(--a1); font-size: 12px; font-weight: 700; letter-spacing: 1.3px; text-transform: uppercase; padding: 4px 11px; border-radius: 999px; margin-bottom: 8px; }
.crt-badge::before { content: ''; width: 7px; height: 7px; border-radius: 50%; background: var(--a1); animation: crt-pulse 2s infinite; }
@keyframes crt-pulse { 0%,100%{opacity:1} 50%{opacity:.3} }
.crt-header h1 { font-size: 32px; font-weight: 600; letter-spacing: -.5px; color: var(--tx-strong); margin: 0; }
.crt-header h1 em { color: var(--a1); font-style: italic; }
.crt-meta { font-size: 14px; color: var(--mu); margin-top: 4px; }
.crt-pills { display: flex; gap: 10px; flex-wrap: wrap; align-items: flex-start; }
.crt-pill { background: var(--sf); border: 1px solid var(--bd); border-radius: 10px; padding: 10px 16px; text-align: center; min-width: 88px; }
.crt-pill .num { font-size: 24px; font-weight: 600; color: var(--tx-strong); }
.crt-pill .lbl { font-size: 12px; color: var(--mu); text-transform: uppercase; letter-spacing: .8px; margin-top: 2px; }
.crt-body { padding: 24px 32px; display: flex; flex-direction: column; gap: 20px; }
.crt-sec { display: flex; align-items: center; gap: 9px; font-size: 12px; font-weight: 700; letter-spacing: 1.6px; text-transform: uppercase; color: var(--mu); margin-bottom: 14px; }
.crt-sec::before { content: ''; width: 3px; height: 14px; border-radius: 2px; background: var(--a1); }
.crt-kpis { display: grid; grid-template-columns: repeat(auto-fit,minmax(155px,1fr)); gap: 12px; }
.crt-kpi { background: var(--sf); border: 1px solid var(--bd); border-radius: var(--r); padding: 18px 16px; position: relative; overflow: hidden; transition: border-color .2s, transform .2s; }
.crt-kpi:hover { border-color: var(--bd-hover); transform: translateY(-2px); }
.crt-kpi::after { content: ''; position: absolute; top: 0; left: 0; right: 0; height: 2px; background: var(--kpi-ac, var(--a1)); }
.crt-kpi .kl { font-size: 12px; color: var(--mu); text-transform: uppercase; letter-spacing: .8px; margin-bottom: 8px; }
.crt-kpi .kv { font-size: 24px; font-weight: 600; color: var(--tx-strong); line-height: 1.2; }
.crt-kpi .ks { display: inline-flex; align-items: center; gap: 4px; font-size: 12px; font-weight: 600; margin-top: 7px; padding: 3px 8px; border-radius: 999px; }
.ks-g { background: rgba(74,222,145,.12); color: var(--a1); }
.ks-a { background: rgba(245,166,35,.12); color: var(--a2); }
.ks-b { background: rgba(110,181,255,.12); color: var(--a4); }
.crt-2col { display: grid; grid-template-columns: repeat(auto-fit,minmax(360px,1fr)); gap: 20px; }
.crt-3col { display: grid; grid-template-columns: repeat(auto-fit,minmax(250px,1fr)); gap: 20px; }
.crt-card { background: var(--sf); border: 1px solid var(--bd); border-radius: var(--r); padding: 20px; }
.crt-ct { font-size: 14px; font-weight: 600; color: var(--tx-strong); margin-bottom: 16px; display: flex; align-items: center; gap: 8px; }
.crt-ic { width: 26px; height: 26px; border-radius: 7px; display: flex; align-items: center; justify-content: center; font-size: 15px; flex-shrink: 0; }
.crt-ins { display: flex; gap: 11px; padding: 12px 0; border-bottom: 1px solid var(--bd); }
.crt-ins:last-child { border-bottom: none; padding-bottom: 0; }
.crt-dot { width: 7px; height: 7px; border-radius: 50%; margin-top: 5px; flex-shrink: 0; }
.crt-itx { font-size: 15px; line-height: 1.65; color: var(--tx); }
.crt-itx strong { color: var(--tx-strong); font-weight: 600; }
.crt-tag { display: inline-block; font-size: 12px; font-weight: 600; letter-spacing: .6px; text-transform: uppercase; padding: 2px 7px; border-radius: 4px; margin-left: 5px; vertical-align: middle; }
.tg { background: rgba(74,222,145,.15); color: var(--a1); }
.ta { background: rgba(245,166,35,.15); color: var(--a2); }
.tr { background: rgba(224,92,110,.15); color: var(--a3); }
.tb { background: rgba(110,181,255,.15); color: var(--a4); }
.crt-notice { display: flex; flex-direction: column; gap: 9px; }
.crt-nrow { display: flex; align-items: center; gap: 10px; }
.crt-ndot { width: 9px; height: 9px; border-radius: 50%; flex-shrink: 0; }
.crt-nlbl { font-size: 14px; color: var(--mu); flex: 1; }
.crt-npct { font-size: 14px; color: var(--tx-strong); width: 42px; text-align: right; }
.crt-ntrk { flex: 2; height: 4px; background: var(--track-bg); border-radius: 999px; overflow: hidden; }
.crt-nfil { height: 100%; border-radius: 999px; }
.crt-bars { display: flex; flex-direction: column; gap: 12px; margin-top: 20px; }
.crt-brow { display: flex; flex-direction: column; gap: 4px; }
.crt-bmeta { display: flex; justify-content: space-between; font-size: 13px; }
.crt-blbl { color: var(--mu); }
.crt-bval { color: var(--tx-strong); }
.crt-btrk { height: 5px; background: var(--track-bg); border-radius: 999px; overflow: hidden; }
.crt-bfil { height: 100%; border-radius: 999px; }
.crt-seg { background: var(--sf2); border: 1px solid var(--bd); border-radius: var(--r); padding: 18px; }
.crt-slbl { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; margin-bottom: 5px; }
.crt-sname { font-size: 18px; font-weight: 600; color: var(--tx-strong); margin-bottom: 7px; }
.crt-sdesc { font-size: 14px; color: var(--mu); line-height: 1.6; }
.crt-chips { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 10px; }
.crt-chip { font-size: 12px; padding: 3px 9px; border-radius: 999px; border: 1px solid; font-weight: 500; }
.crt-tbl { width: 100%; border-collapse: collapse; }
.crt-tbl th { font-size: 12px; font-weight: 700; letter-spacing: 1px; text-transform: uppercase; color: var(--mu); padding: 9px 13px; border-bottom: 1px solid var(--bd); text-align: left; }
.crt-tbl td { padding: 12px 13px; border-bottom: 1px solid var(--bd); font-size: 14px; color: var(--tx); vertical-align: middle; }
.crt-tbl tr:last-child td { border-bottom: none; }
.crt-tbl tr:hover td { background: var(--bg-hover); }
.crt-sbar { display: flex; align-items: center; gap: 9px; }
.crt-snum { font-size: 14px; color: var(--tx-strong); width: 34px; }
.crt-strk { flex: 1; height: 3px; background: var(--track-bg); border-radius: 999px; overflow: hidden; }
.crt-sfil { height: 100%; border-radius: 999px; }
.crt-cn { font-weight: 600; color: var(--tx-strong); }
.crt-cid { font-size: 12px; color: var(--mu); margin-left: 3px; }
.crt-gem { background: linear-gradient(135deg, rgba(74,222,145,.06), rgba(110,181,255,.06)); border: 1px solid rgba(74,222,145,.18); border-radius: var(--r); padding: 16px; display: flex; gap: 12px; align-items: flex-start; margin-bottom: 10px; }
.crt-gem:last-child { margin-bottom: 0; }
.crt-gav { width: 34px; height: 34px; border-radius: 9px; background: linear-gradient(135deg, var(--a1), var(--a4)); display: flex; align-items: center; justify-content: center; font-size: 14px; font-weight: 700; color: var(--gav-tx); flex-shrink: 0; }
.crt-gname { font-weight: 600; color: var(--tx-strong); font-size: 15px; }
.crt-gid { font-size: 12px; color: var(--mu); margin-left: 4px; }
.crt-gdesc { font-size: 14px; color: var(--mu); line-height: 1.6; margin-top: 3px; }
.crt-risk { display: flex; gap: 12px; padding: 14px; background: rgba(224,92,110,.05); border: 1px solid rgba(224,92,110,.16); border-radius: 9px; margin-bottom: 10px; }
.crt-risk:last-child { margin-bottom: 0; }
.crt-ric { font-size: 18px; flex-shrink: 0; }
.crt-rtx { font-size: 15px; line-height: 1.65; color: var(--tx); }
.crt-rtx strong { color: var(--a3); }
.crt-reco { display: flex; gap: 12px; align-items: flex-start; padding: 14px 0; border-bottom: 1px solid var(--bd); }
.crt-reco:last-child { border-bottom: none; padding-bottom: 0; }
.crt-rn { width: 26px; height: 26px; border-radius: 7px; background: rgba(74,222,145,.12); color: var(--a1); font-size: 14px; font-weight: 700; display: flex; align-items: center; justify-content: center; flex-shrink: 0; }
.crt-rc { font-size: 15px; line-height: 1.65; color: var(--tx); }
.crt-rc strong { color: var(--tx-strong); font-size: 15px; font-weight: 600; display: block; margin-bottom: 2px; }
.crt-hl { font-size: 13px; color: var(--a1); font-weight: 600; }
.crt-footer { display: flex; justify-content: space-between; align-items: center; padding: 16px 32px; border-top: 1px solid var(--bd); font-size: 13px; color: var(--mu); }
.crt-fbrand { display: flex; align-items: center; gap: 7px; }
.crt-fdot { width: 6px; height: 6px; border-radius: 50%; background: var(--a1); }
.blind-blur { filter: blur(5px); user-select: none; pointer-events: none; opacity: 0.6; }
`;

/* ─────────────────────────────────────────────
   PREMIUM REPORT — reads markdown, renders UI
───────────────────────────────────────────── */
const PremiumReport = memo(({ analysis, isBlindMode, onMailClick }: { analysis: AnalysisData; isBlindMode?: boolean; onMailClick?: (candidate: any) => void }) => {
  const md = analysis.detailedReport ?? analysis.markdownReport ?? "";
  const fileName = analysis.uploadId?.originalName ?? "report.csv";
  const rowCount = analysis.uploadId?.rowCount ?? 40;

  const stats = useMemo(() => extractOverviewStats(md), [md]);
  const kpis = useMemo(() => parseKPIs(md), [md]);
  const insights = useMemo(() => parseSection(md, "💡"), [md]);
  const risks = useMemo(() => parseSection(md, "⚠️"), [md]);
  const recos = useMemo(() => parseRecommendations(md), [md]);
  const topPerformers = useMemo(() => parseTopPerformers(md), [md]);
  const gems = useMemo(() => parseSection(md, "💎"), [md]);
  const responses = useMemo(() => parseResponsesTable(analysis.responsesTable ?? ""), [analysis.responsesTable]);

  const insightColors = ["var(--a2)", "var(--a1)", "var(--a4)", "#9b79ff", "var(--a3)"];
  const insightTags = [
    { cls: "ta", label: "Salary Risk" },
    { cls: "tg", label: "Recommended" },
    { cls: "tb", label: "Advantage" },
    { cls: "tg", label: "High Value" },
    { cls: "tr", label: "Watch" },
  ];

  const expKpi = useMemo(() => kpis.find(k => k.label.toLowerCase().includes("experience")), [kpis]);
  const divKpi = useMemo(() => kpis.find(k => k.label.toLowerCase().includes("diversity")), [kpis]);

  return (
    <>
      {/* ── HEADER ── */}
      <div className="crt-header">
        <div>
          <div className="crt-badge">AI Form Insights · Live Report</div>
          <h1>
            {fileName.replace(/\.[^.]+$/, "").replace(/[_-]/g, " ").split(" ").map((w, i) =>
              i === 0
                ? <span key={i}>{w} </span>
                : <em key={i}>{w} </em>
            )}
          </h1>
          <div className="crt-meta">{fileName} &nbsp;·&nbsp; {rowCount} responses analysed</div>
        </div>
        <div className="crt-pills">
          <div className="crt-pill"><div className="num">{stats.total}</div><div className="lbl">Applicants</div></div>
          <div className="crt-pill"><div className="num" style={{ color: "var(--a1)" }}>{stats.immediate}%</div><div className="lbl">Immediate</div></div>
          {expKpi && <div className="crt-pill"><div className="num" style={{ color: "var(--a4)" }}>{expKpi.value.replace(" Years", "y").replace(" Year", "y")}</div><div className="lbl">Avg Exp</div></div>}
          {divKpi && <div className="crt-pill"><div className="num" style={{ color: "var(--a2)" }}>{divKpi.value}</div><div className="lbl">Diversity</div></div>}
        </div>
      </div>

      <div className="crt-body">
        
        {analysis.charts?.sentiment && analysis.charts.sentiment.length > 0 && (
          <div className="mb-4 p-5 border border-white/10 rounded-xl bg-card shadow-sm">
            <div className="crt-sec" style={{ marginBottom: "16px" }}>Sentiment Distribution</div>
            <SentimentChart data={analysis.charts.sentiment} />
          </div>
        )}

        {/* ── KPIs ── */}
        {kpis.length > 0 && (
          <div>
            <div className="crt-sec">Key Metrics</div>
            <div className="crt-kpis">
              {kpis.map((k, i) => (
                <div key={i} className="crt-kpi" style={{ "--kpi-ac": kpiAccent(k.label) } as React.CSSProperties}>
                  <div className="kl">{k.label}</div>
                  <div className="kv">{k.value}</div>
                  <div className={`ks ${kpiStatusCls(k.status)}`}>{kpiStatusLabel(k.status)}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── INSIGHTS + NOTICE ── */}
        <div className="crt-2col">
          {insights.length > 0 && (
            <div className="crt-card">
              <div className="crt-ct">
                <div className="crt-ic" style={{ background: "rgba(74,222,145,0.1)" }}>💡</div>
                Key Insights &amp; Patterns
              </div>
              {insights.map((txt, i) => {
                const dashIdx = txt.indexOf("—");
                const colonIdx = txt.indexOf(":");
                const splitAt = dashIdx > -1 ? dashIdx : colonIdx;
                const bold = splitAt > -1 ? txt.slice(0, splitAt).trim() : txt;
                const rest = splitAt > -1 ? txt.slice(splitAt + 1).trim() : "";
                const t = insightTags[i % insightTags.length];
                return (
                  <div key={i} className="crt-ins">
                    <div className="crt-dot" style={{ background: insightColors[i % insightColors.length] }} />
                    <div className="crt-itx">
                      <strong>{bold}</strong>{rest ? ` — ${rest}` : ""}
                      <span className={`crt-tag ${t.cls}`}>{t.label}</span>
                    </div>
                  </div>
                );
              })}
            </div>
          )}

          <div className="crt-card">
            <div className="crt-ct">
              <div className="crt-ic" style={{ background: "rgba(110,181,255,0.1)" }}>⏱</div>
              Notice Period Distribution
            </div>
            <div className="crt-notice">
              {[
                { label: "Immediate (0 days)", pct: `${stats?.immediate}%`, w: `${stats?.immediate}%`, c: "var(--a1)" },
                { label: "15 Days", pct: "~30%", w: "30%", c: "var(--a4)" },
                { label: "30 Days", pct: "~30%", w: "30%", c: "var(--a2)" },
                { label: "60 Days (Friction)", pct: "12.5%", w: "12.5%", c: "var(--a3)" },
              ]?.map(r => (
                <div key={r?.label} className="crt-nrow">
                  <div className="crt-ndot" style={{ background: r.c }} />
                  <div className="crt-nlbl">{r?.label}</div>
                  <div className="crt-ntrk"><div className="crt-nfil" style={{ width: r?.w, background: r?.c }} /></div>
                  <div className="crt-npct">{r?.pct}</div>
                </div>
              ))}
            </div>

            <div style={{ marginTop: 20 }}>
              <div className="crt-ct" style={{ marginBottom: 12 }}>
                <div className="crt-ic" style={{ background: "rgba(245,166,35,0.1)" }}>📊</div>
                CTC Hike by Experience Band
              </div>
              <div className="crt-bars">
                {[
                  { label: "0–1 yr (Entry)", val: "~48% hike ask", w: "90%", c: "var(--a3)" },
                  { label: "1–2 yr (Junior)", val: "~30% hike ask", w: "60%", c: "var(--a2)" },
                  { label: "3–5 yr (Mid-Senior)", val: "~20% hike ask", w: "40%", c: "var(--a4)" },
                  { label: "5+ yr (Veteran)", val: "~15% hike ask", w: "28%", c: "var(--a1)" },
                ].map(b => (
                  <div key={b?.label} className="crt-brow">
                    <div className="crt-bmeta">
                      <span className="crt-blbl">{b?.label}</span>
                      <span className="crt-bval">{b?.val}</span>
                    </div>
                    <div className="crt-btrk"><div className="crt-bfil" style={{ width: b?.w, background: b?.c }} /></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── SEGMENTS ── */}
        <div>
          <div className="crt-sec">Candidate Segmentation</div>
          <div className="crt-3col">
            {[
              { lbl: "Segment A", color: "var(--a4)", bc: "rgba(110,181,255,0.25)", name: "⚡ Rapid Starters", desc: "0–2 years experience, ≤15-day notice. Best for agile execution-heavy roles.", chips: ["0–2 yrs", "≤15d notice", "Potential-first"] },
              { lbl: "Segment B · Optimal ROI", color: "var(--a1)", bc: "rgba(74,222,145,0.25)", name: "🎯 Professional Core", desc: "3–5 years, domain expertise, leadership capacity. Best cost-to-value ratio.", chips: ["3–5 yrs", "Stable CTC", "Leadership-ready"] },
              { lbl: "Segment C", color: "#9b79ff", bc: "rgba(155,121,255,0.25)", name: "🏆 Veterans", desc: "5+ years, most conservative hike requests. Ideal for senior / lead roles.", chips: ["5+ yrs", "Low hike ask", "Senior/Lead"] },
            ].map(s => (
              <div key={s?.name} className="crt-seg" style={{ borderColor: s?.bc }}>
                <div className="crt-slbl" style={{ color: s?.color }}>{s?.lbl}</div>
                <div className="crt-sname">{s?.name}</div>
                <div className="crt-sdesc">{s?.desc}</div>
                <div className="crt-chips">
                  {s?.chips?.map(c => <span key={c} className="crt-chip" style={{ color: s.color, borderColor: s.bc }}>{c}</span>)}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* ── TOP PERFORMERS + GEMS ── */}
        <div className="crt-2col">
          {topPerformers?.length > 0 && (
            <div className="crt-card">
              <div className="crt-ct">
                <div className="crt-ic" style={{ background: "rgba(74,222,145,0.1)" }}>🏅</div>
                Top Performers / Best Fits
              </div>
              <table className="crt-tbl">
                <thead><tr><th>Candidate</th><th>Score</th><th>Why Selected</th></tr></thead>
                <tbody>
                  {topPerformers?.map((c, i) => (
                    <tr key={i}>
                      <td><span className={`crt-cn ${isBlindMode ? "blind-blur" : ""}`}>{c.name}</span></td>
                      <td>
                        <div className="crt-sbar">
                          <span className="crt-snum">{c.score}</span>
                          <div className="crt-strk"><div className="crt-sfil" style={{ width: `${c.score}%`, background: scoreColor(c.score) }} /></div>
                        </div>
                      </td>
                      <td>{c.reason}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {gems?.length > 0 && (
            <div className="crt-card">
              <div className="crt-ct">
                <div className="crt-ic" style={{ background: "rgba(74,222,145,0.08)" }}>💎</div>
                Hidden Gems
              </div>
              {gems?.map((g, i) => {
                const nameMatch = g.match(/^([^:(]+)/);
                const name = nameMatch ? nameMatch[1].trim() : `Gem ${i + 1}`;
                const desc = g.replace(/^[^:]+:\s*/, "");
                return (
                  <div key={i} className="crt-gem">
                    <div className="crt-gav">{initials(name)}</div>
                    <div>
                      <div>
                        <span className="crt-gname">{name}</span>
                        <span className={`crt-tag ${i === 0 ? "tg" : "tb"}`}>{i === 0 ? "Immediate" : "High Potential"}</span>
                      </div>
                      <div className="crt-gdesc">{desc}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ── RISKS + RECOS ── */}
        <div className="crt-2col">
          {risks.length > 0 && (
            <div className="crt-card">
              <div className="crt-ct">
                <div className="crt-ic" style={{ background: "rgba(224,92,110,0.1)" }}>⚠️</div>
                Risks &amp; Areas of Concern
              </div>
              {risks.map((r, i) => {
                const icons = ["💸", "⏳", "📉"];
                const ci = r.indexOf(":");
                const bold = ci > -1 ? r.slice(0, ci) : r;
                const rest = ci > -1 ? r.slice(ci + 1).trim() : "";
                return (
                  <div key={i} className="crt-risk">
                    <div className="crt-ric">{icons[i % icons.length]}</div>
                    <div className="crt-rtx"><strong>{bold}:</strong> {rest}</div>
                  </div>
                );
              })}
            </div>
          )}

          {recos.length > 0 && (
            <div className="crt-card">
              <div className="crt-ct">
                <div className="crt-ic" style={{ background: "rgba(74,222,145,0.1)" }}>🎯</div>
                Strategic Recommendations
              </div>
              {recos.map((r, i) => (
                <div key={i} className="crt-reco">
                  <div className="crt-rn">{i + 1}</div>
                  <div className="crt-rc"><strong>{r.title}</strong>{r.desc}</div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── SHORTLIST TABLE ── */}
        {responses.length > 0 && (
          <div>
            <div className="crt-sec">Candidate Shortlist</div>
            <div className="crt-card">
              <table className="crt-tbl">
                <thead>
                  <tr>
                    <th>Status</th>
                    <th>Candidate</th>
                    <th>Key Takeaway</th>
                    <th>Highlight</th>
                    <th>Resume</th>
                    {onMailClick && <th style={{ textAlign: "center", width: "60px" }}>Action</th>}
                  </tr>
                </thead>
                <tbody>
                  {responses.map((r, i) => (
                    <tr key={i}>
                      <td style={{ fontSize: 16 }}>{r.status}</td>
                      <td><span className={`crt-cn ${isBlindMode ? "blind-blur" : ""}`}>{r.name}</span></td>
                      <td>{r.takeaway}</td>
                      <td><span className="crt-hl">{r.highlight}</span></td>
                      <td style={{ textAlign: "center" }}>
                        {r.resumeUrl ? (
                          <a href={r.resumeUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 inline-flex hover:bg-muted rounded-md transition-colors" title="View Resume">
                            <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </a>
                        ) : (
                          <span className="text-xs text-muted-foreground">-</span>
                        )}
                      </td>
                      {onMailClick && (
                        <td style={{ textAlign: "center" }}>
                          <button onClick={() => onMailClick(r)} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Draft Email">
                            <Mail className="w-4 h-4 text-muted-foreground hover:text-primary" />
                          </button>
                        </td>
                      )}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ── FOOTER ── */}
      <div className="crt-footer">
        <div className="crt-fbrand"><div className="crt-fdot" />AI Form Insights Platform</div>
        <div>Report generated automatically · {fileName} · {rowCount} responses</div>
      </div>
    </>
  );
});

PremiumReport.displayName = "PremiumReport";

/* ─────────────────────────────────────────────
   MAIN COMPONENT
───────────────────────────────────────────── */
export default function AnalysisDashboard({ analysis: initialAnalysis, isReadOnly = false }: AnalysisDashboardProps) {
  const router = useRouter();
  const { user } = useAuth();
  const [analysis, setAnalysis] = useState<AnalysisData>(initialAnalysis);
  const [isExporting, setIsExporting] = useState(false);
  const [activeTab, setActiveTab] = useState<"detailed" | "responses" | "actions">("detailed");
  const [isModifying, setIsModifying] = useState(false);
  const [showModifyPrompt, setShowModifyPrompt] = useState(false);
  const [customPrompt, setCustomPrompt] = useState("");
  const [isBlindMode, setIsBlindMode] = useState(false);

  const [emailModalCandidate, setEmailModalCandidate] = useState<any>(null);
  const [emailDraft, setEmailDraft] = useState<string>("");
  const [isDraftingEmail, setIsDraftingEmail] = useState(false);

  useEffect(() => {
    setAnalysis(initialAnalysis);
    setShowModifyPrompt(false);
    setCustomPrompt("");
  }, [initialAnalysis]);

  const handleTogglePublic = async () => {
    try {
      const response = await togglePublicStatus(analysis._id);
      setAnalysis(prev => ({ ...prev, isPublic: response.isPublic }));
      
      if (response.isPublic) {
        const url = `${window.location.origin}/shared/${analysis._id}`;
        await navigator.clipboard.writeText(url);
        toast.success("Report is now public! Link copied to clipboard.");
      } else {
        toast.success("Report is now private.");
      }
    } catch (err) {
      toast.error("Failed to toggle public status");
    }
  };

  const handleExport = async () => {
    setIsExporting(true);
    try {
      await exportAnalysisPDF(analysis._id);
      toast.success("PDF exported successfully!");
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Export failed");
    } finally {
      setIsExporting(false);
    }
  };

  const handleModify = async () => {
    if (!customPrompt.trim()) { toast.error("Please enter a prompt."); return; }
    setIsModifying(true);
    try {
      const response = await modifyAnalysis(analysis._id, customPrompt);
      if (response?.analysis) {
        setAnalysis(response.analysis);
        toast.success("Analysis refined successfully!");
        setShowModifyPrompt(false);
        setCustomPrompt("");
      }
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Refining failed");
    } finally {
      setIsModifying(false);
    }
  };

  const handleMailClick = async (candidate: any) => {
    setEmailModalCandidate(candidate);
    setEmailDraft("");
    setIsDraftingEmail(true);
    try {
      const { generateEmailDraft } = await import("@/lib/api");
      const response = await generateEmailDraft(
        analysis._id,
        candidate.name,
        candidate.highlight,
        candidate.takeaway,
        candidate.status
      );
      setEmailDraft(response.emailDraft);
    } catch (err) {
      toast.error("Failed to generate email draft.");
      setEmailModalCandidate(null);
    } finally {
      setIsDraftingEmail(false);
    }
  };

  const hasData = useMemo(() => !!(analysis.markdownReport || analysis.detailedReport), [analysis]);

  const responses = useMemo(() => parseResponsesTable(analysis.responsesTable ?? ""), [analysis.responsesTable]);

  if (!hasData) {
    return (
      <div className="flex flex-col items-center justify-center p-12 text-muted-foreground">
        <Target className="h-12 w-12 mb-4 text-muted-foreground/50" />
        <p className="text-lg">No report data found for this analysis.</p>
        <p className="text-sm">It might be from an older version of the app.</p>
      </div>
    );
  }

  return (
    <div className="w-full max-w-7xl mx-auto relative">
      <style dangerouslySetInnerHTML={{ __html: DASHBOARD_CSS }} />

      {/* TOP BAR */}
      <div className="flex items-center justify-between mb-6 px-2">
        <Button variant="ghost" size="sm" onClick={() => router.push("/dashboard/history")} className="gap-2">
          <ArrowLeft className="w-4 h-4" />
          Back to History
        </Button>

        <div className="flex gap-1.5 bg-muted/40 border border-border/50 p-1 rounded-md">
          <Button
            variant={activeTab === "detailed" ? "secondary" : "ghost"} size="sm"
            onClick={() => setActiveTab("detailed")}
            className="items-center justify-center gap-1.5 text-xs h-7 px-3 shadow-none"
          >
            <FileBarChart className="w-3.5 h-3.5" /> Detailed Report
          </Button>
          <Button
            variant={activeTab === "responses" ? "secondary" : "ghost"} size="sm"
            onClick={() => setActiveTab("responses")}
            className="items-center justify-center gap-1.5 text-xs h-7 px-3 shadow-none"
          >
            <TableIcon className="w-3.5 h-3.5" /> Raw Responses
          </Button>
          {analysis.draftedActions && analysis.draftedActions.length > 0 && (
            <Button
              variant={activeTab === "actions" ? "secondary" : "ghost"} size="sm"
              onClick={() => setActiveTab("actions")}
              className="items-center justify-center gap-1.5 text-xs h-7 px-3 shadow-none"
            >
              <Mail className="w-3.5 h-3.5" /> Follow-ups
            </Button>
          )}
        </div>

        {!isReadOnly && (
          <div className="flex gap-2">
            <Button
              size="sm"
              variant={isBlindMode ? "default" : "outline"}
              onClick={() => setIsBlindMode(!isBlindMode)}
              className="gap-2 transition-colors"
            >
              {isBlindMode ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              Blind Mode
            </Button>
            <Button
              size="sm"
              variant={analysis.isPublic ? "outline" : "secondary"}
              onClick={handleTogglePublic}
              className="gap-2"
            >
              {analysis.isPublic ? <Globe className="h-4 w-4 text-blue-500" /> : <Share2 className="h-4 w-4" />}
              {analysis.isPublic ? "Public" : "Share"}
            </Button>
            {/* <Button size="sm" onClick={handleExport} disabled={isExporting} className="gap-2">
              {isExporting ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileText className="h-4 w-4" />}
              {isExporting ? "Exporting..." : "Export PDF"}
            </Button> */}
          </div>
        )}
      </div>

      {/* REPORT PANEL */}
      <div className="crt border border-white/5 mb-8">
        {activeTab === "detailed" ? (
          <PremiumReport analysis={analysis} isBlindMode={isBlindMode} onMailClick={!isReadOnly ? handleMailClick : undefined} />
        ) : activeTab === "actions" ? (
          <div className="crt-body">
            <div className="crt-sec">AI-Drafted Follow-ups</div>
            <p className="text-sm text-muted-foreground mb-4">Suggested email replies based on form responses. Copy and send directly to your users.</p>
            <div className="grid gap-4">
              {analysis.draftedActions?.map((action, idx) => (
                <div key={idx} className="border border-border/50 rounded-lg p-5 bg-card shadow-sm space-y-4 relative">
                  <div className="flex justify-between items-start">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className={`font-semibold text-foreground ${isBlindMode ? "blind-blur" : ""}`}>{action.email || "Unknown Email"}</span>
                        <span className={`text-[10px] uppercase font-bold px-2 py-0.5 rounded-full \${
                          action.sentiment === 'positive' ? 'bg-green-500/10 text-green-500' :
                          action.sentiment === 'negative' ? 'bg-red-500/10 text-red-500' :
                          'bg-gray-500/10 text-gray-500'
                        }`}>
                          {action.sentiment}
                        </span>
                      </div>
                      <p className="text-xs text-muted-foreground mt-1.5"><span className="font-medium">Reason:</span> {action.reason}</p>
                    </div>
                    <Button 
                      variant="outline" 
                      size="sm" 
                      className="h-8 shrink-0 text-xs gap-1.5"
                      onClick={() => {
                        navigator.clipboard.writeText(action.draft);
                        toast.success("Draft copied to clipboard!");
                      }}
                    >
                      <Copy className="h-3 w-3" />
                      Copy
                    </Button>
                  </div>
                  <div className="bg-muted/40 rounded-md p-4 text-sm text-foreground whitespace-pre-wrap font-mono relative border border-border/50">
                    {action.draft}
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <div className="crt-body">
            <div className="crt-sec">Raw Responses</div>
            <div className="crt-card">
              {responses.length > 0 ? (
                <table className="crt-tbl">
                  <thead>
                    <tr>
                      <th>Status</th>
                      <th>Candidate</th>
                      <th>Key Takeaway</th>
                      <th>Highlight</th>
                      <th>Resume</th>
                      {!isReadOnly && <th style={{ textAlign: "center", width: "60px" }}>Action</th>}
                    </tr>
                  </thead>
                  <tbody>
                    {responses.map((r, i) => (
                      <tr key={i}>
                        <td style={{ fontSize: 16 }}>{r.status}</td>
                        <td><span className={`crt-cn ${isBlindMode ? "blind-blur" : ""}`}>{r.name}</span></td>
                        <td>{r.takeaway}</td>
                        <td><span className="crt-hl">{r.highlight}</span></td>
                        <td style={{ textAlign: "center" }}>
                          {r.resumeUrl ? (
                            <a href={r.resumeUrl} target="_blank" rel="noopener noreferrer" className="p-1.5 inline-flex hover:bg-muted rounded-md transition-colors" title="View Resume">
                              <ExternalLink className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </a>
                          ) : (
                            <span className="text-xs text-muted-foreground">-</span>
                          )}
                        </td>
                        {!isReadOnly && (
                          <td style={{ textAlign: "center" }}>
                            <button onClick={() => handleMailClick(r)} className="p-1.5 hover:bg-muted rounded-md transition-colors" title="Draft Email">
                              <Mail className="w-4 h-4 text-muted-foreground hover:text-primary" />
                            </button>
                          </td>
                        )}
                      </tr>
                    ))}
                  </tbody>
                </table>
              ) : (
                <p style={{ color: "var(--mu)", fontSize: 13 }}>No response table data available.</p>
              )}
            </div>
          </div>
        )}
      </div>

      {/* REFINE PANEL */}
      <Card className="border-primary/10 bg-muted/5 mb-10 overflow-hidden">
        <CardFooter className="flex flex-col items-stretch gap-3 py-4 px-6 bg-transparent">
          {!showModifyPrompt ? (
            <Button
              variant="outline" size="sm"
              className="w-full sm:w-auto self-end flex items-center gap-2 hover:bg-primary/5 hover:text-primary transition-colors h-8 text-xs"
              onClick={() => setShowModifyPrompt(true)}
            >
              <Sparkles className="w-3.5 h-3.5 text-primary" /> Refine Analysis
            </Button>
          ) : (
            <div className="w-full relative rounded-lg border border-input bg-background shadow-[0_2px_8px_rgba(0,0,0,0.04)] focus-within:ring-1 focus-within:ring-primary/50 transition-all flex flex-col overflow-visible">
              <textarea
                placeholder="E.g., Extract only marketing experience and make tone more casual..."
                value={customPrompt}
                onChange={e => setCustomPrompt(e.target.value)}
                className="w-full resize-none border-0 bg-transparent px-3 py-2.5 text-[13.5px] focus:ring-0 focus-visible:ring-0 placeholder:text-muted-foreground outline-none min-h-[60px]"
                disabled={isModifying}
                onKeyDown={e => { if (e.key === "Enter" && !e.shiftKey && !isModifying) { e.preventDefault(); handleModify(); } }}
                autoFocus
              />
              <div className="flex flex-wrap items-center gap-1.5 px-2 pb-2.5">
                {REFINE_PROMPTS.map((p, i) => (
                  <button key={i} type="button"
                    className="inline-flex items-center gap-1 whitespace-nowrap text-[10px] bg-muted/40 border border-border/50 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-md px-2 py-0.5 transition-all font-medium"
                    onClick={() => setCustomPrompt(p)}
                  >
                    <Sparkles className="w-2.5 h-2.5" />{p}
                  </button>
                ))}
              </div>
              <div className="flex items-center justify-between px-2 py-2 border-t border-border/30 bg-muted/10 rounded-b-lg">
                <Button variant="ghost" size="sm"
                  onClick={() => { setShowModifyPrompt(false); setCustomPrompt(""); }}
                  disabled={isModifying}
                  className="text-[11px] h-6 px-2 text-muted-foreground hover:text-foreground"
                >Cancel</Button>
                <Button size="sm" onClick={handleModify}
                  disabled={isModifying || !customPrompt.trim()}
                  className="text-[11px] h-6 px-3 font-semibold"
                >
                  {isModifying ? <Loader2 className="w-3 h-3 animate-spin mr-1.5" /> : <Sparkles className="w-3 h-3 mr-1.5" />}
                  {isModifying ? "Refining..." : "Update"}
                </Button>
              </div>
            </div>
          )}
        </CardFooter>
      </Card>

      {/* CHAT INTERFACE */}
      {!isReadOnly && (
        <div className="mb-10">
          <ChatInterface analysisId={analysis._id} initialHistory={analysis.chatHistory || []} />
        </div>
      )}

      {/* EMAIL MODAL */}
      {emailModalCandidate && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm p-4">
          <Card className="w-full max-w-lg bg-background shadow-2xl border-primary/20 overflow-hidden">
            <div className="flex items-center justify-between p-4 border-b bg-muted/20">
              <div className="font-semibold flex items-center gap-2">
                <Mail className="w-4 h-4 text-primary" />
                Draft Email to {emailModalCandidate.name}
              </div>
              <Button variant="ghost" size="icon" className="h-6 w-6 rounded-md hover:bg-muted/50" onClick={() => setEmailModalCandidate(null)}>✕</Button>
            </div>
            <div className="p-4">
              {isDraftingEmail ? (
                <div className="flex flex-col items-center justify-center py-12 text-muted-foreground">
                  <Loader2 className="w-8 h-8 animate-spin mb-4 text-primary/60" />
                  <p className="text-sm font-medium animate-pulse">AI is crafting a personalized response...</p>
                </div>
              ) : (
                <textarea
                  className="w-full h-64 p-3 text-sm border border-border/50 rounded-md resize-none focus:outline-none focus:ring-1 focus:ring-primary/40 bg-muted/5 font-mono"
                  value={emailDraft}
                  onChange={(e) => setEmailDraft(e.target.value)}
                  autoFocus
                />
              )}
            </div>
            <div className="flex items-center justify-between p-3.5 border-t bg-muted/10">
              <div className="text-xs text-muted-foreground font-medium pl-1">Review & edit before sending.</div>
              <div className="flex gap-2">
                <Button variant="outline" size="sm" onClick={() => setEmailModalCandidate(null)}>Cancel</Button>
                <Button size="sm" disabled={isDraftingEmail || !emailDraft} onClick={() => { navigator.clipboard.writeText(emailDraft); toast.success("Draft copied to clipboard!"); }}>
                  <Copy className="w-3.5 h-3.5 mr-1.5" /> Copy Draft
                </Button>
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
