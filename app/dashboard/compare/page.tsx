"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Loader2, GitCompare, ArrowRight } from "lucide-react";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { toast } from "sonner";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

// Custom markdown components for the report
const MarkdownComponents = {
  h1: ({ node, ...props }: any) => <h1 className="text-3xl font-extrabold mt-8 mb-6 text-foreground tracking-tight border-b pb-4" {...props} />,
  h2: ({ node, ...props }: any) => <h2 className="text-2xl font-bold mt-8 mb-4 text-foreground flex items-center gap-2" {...props} />,
  h3: ({ node, ...props }: any) => <h3 className="text-xl font-semibold mt-6 mb-3 text-foreground" {...props} />,
  p: ({ node, ...props }: any) => <p className="leading-7 text-muted-foreground mb-4" {...props} />,
  ul: ({ node, ...props }: any) => <ul className="list-disc pl-6 mb-4 space-y-2 text-muted-foreground" {...props} />,
  ol: ({ node, ...props }: any) => <ol className="list-decimal pl-6 mb-4 space-y-2 text-muted-foreground" {...props} />,
  li: ({ node, ...props }: any) => <li className="pl-1" {...props} />,
  strong: ({ node, ...props }: any) => <strong className="font-semibold text-foreground" {...props} />,
  blockquote: ({ node, ...props }: any) => (
    <blockquote className="border-l-4 border-primary/40 pl-4 py-1 italic bg-muted/20 my-4 rounded-r-lg text-muted-foreground" {...props} />
  ),
  table: ({ node, ...props }: any) => (
    <div className="overflow-x-auto my-8 rounded-xl border border-border shadow-sm">
      <table className="w-full text-sm text-left border-collapse" {...props} />
    </div>
  ),
  thead: ({ node, ...props }: any) => <thead className="bg-muted/80 text-muted-foreground uppercase text-xs font-semibold" {...props} />,
  th: ({ node, ...props }: any) => <th className="px-5 py-4 border-b border-border whitespace-nowrap" {...props} />,
  td: ({ node, ...props }: any) => <td className="px-5 py-4 border-b border-border/50 align-top" {...props} />,
};

export default function ComparePage() {
  const router = useRouter();
  const [analyses, setAnalyses] = useState<any[]>([]);
  const [comparisons, setComparisons] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  
  const [selected1, setSelected1] = useState("");
  const [selected2, setSelected2] = useState("");
  const [isComparing, setIsComparing] = useState(false);
  const [activeReport, setActiveReport] = useState<any>(null);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [analysesRes, comparisonsRes] = await Promise.all([
        api.getAnalyses(),
        api.getComparisons()
      ]);
      setAnalyses(analysesRes.analyses || []);
      setComparisons(comparisonsRes.comparisons || []);
    } catch (err) {
      toast.error("Failed to load history.");
    } finally {
      setLoading(false);
    }
  };

  const handleCompare = async () => {
    if (!selected1 || !selected2) {
      toast.error("Please select two analyses to compare.");
      return;
    }
    if (selected1 === selected2) {
      toast.error("Please select two different analyses.");
      return;
    }

    setIsComparing(true);
    try {
      const data = await api.compareAnalyses(selected1, selected2);
      setActiveReport(data.comparison);
      toast.success("Comparison completed!");
      fetchData(); // Refresh history
    } catch (err: any) {
      toast.error(err.message || "Comparison failed.");
    } finally {
      setIsComparing(false);
    }
  };

  if (loading) {
    return (
      <div className="flex h-64 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8">
      <div>
        <h1 className="text-3xl font-bold flex items-center gap-2">
          <GitCompare className="w-8 h-8 text-primary" />
          Compare Analyses
        </h1>
        <p className="text-muted-foreground mt-2">
          Select two historical reports to generate a comparative analysis, highlighting shifts in sentiment and emerging trends.
        </p>
      </div>

      {!activeReport ? (
        <div className="grid md:grid-cols-2 gap-8">
          <Card>
            <CardHeader>
              <CardTitle>Create New Comparison</CardTitle>
              <CardDescription>Select baseline and current datasets.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">Dataset 1 (Baseline/Older)</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selected1}
                  onChange={(e) => setSelected1(e.target.value)}
                >
                  <option value="">Select an analysis...</option>
                  {analyses.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.uploadId?.originalName || 'Untitled'} ({new Date(a.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex justify-center">
                <ArrowRight className="w-6 h-6 text-muted-foreground rotate-90 md:rotate-0" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Dataset 2 (Current/Newer)</label>
                <select 
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                  value={selected2}
                  onChange={(e) => setSelected2(e.target.value)}
                >
                  <option value="">Select an analysis...</option>
                  {analyses.map(a => (
                    <option key={a._id} value={a._id}>
                      {a.uploadId?.originalName || 'Untitled'} ({new Date(a.createdAt).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
            </CardContent>
            <CardFooter>
              <Button onClick={handleCompare} disabled={isComparing || !selected1 || !selected2} className="w-full">
                {isComparing ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : <GitCompare className="w-4 h-4 mr-2" />}
                Generate Comparison
              </Button>
            </CardFooter>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Comparison History</CardTitle>
              <CardDescription>View past comparative reports.</CardDescription>
            </CardHeader>
            <CardContent>
              {comparisons.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No comparisons generated yet.</p>
              ) : (
                <div className="space-y-3 max-h-[300px] overflow-y-auto pr-2">
                  {comparisons.map(c => (
                    <div 
                      key={c._id} 
                      className="p-3 border rounded-lg hover:border-primary cursor-pointer transition-colors"
                      onClick={() => setActiveReport(c)}
                    >
                      <h4 className="font-medium text-sm truncate">{c.summary}</h4>
                      <p className="text-xs text-muted-foreground mt-1 flex items-center gap-1 truncate">
                        {c.analysisId1?.uploadId?.originalName || 'Untitled'} 
                        <ArrowRight className="w-3 h-3" /> 
                        {c.analysisId2?.uploadId?.originalName || 'Untitled'}
                      </p>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      ) : (
        <div className="space-y-6">
          <Button variant="outline" onClick={() => setActiveReport(null)} className="mb-4">
            &larr; Back to Compare
          </Button>
          <Card className="border-primary/20 shadow-lg">
            <CardHeader className="bg-primary/5 pb-4">
              <CardTitle className="text-2xl flex items-center gap-2">
                <GitCompare className="h-6 w-6 text-primary" />
                Comparative Analysis Report
              </CardTitle>
              <CardDescription className="mt-1 text-base text-foreground font-medium">
                {activeReport.summary}
              </CardDescription>
            </CardHeader>
            <CardContent className="pt-6">
              <div className="prose prose-sm md:prose-base prose-blue max-w-none dark:prose-invert">
                <ReactMarkdown remarkPlugins={[remarkGfm]} components={MarkdownComponents}>
                  {activeReport.detailedReport}
                </ReactMarkdown>
              </div>
            </CardContent>
          </Card>
        </div>
      )}
    </div>
  );
}