"use client";

import { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { Loader2, ShieldAlert } from "lucide-react";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import AnalysisDashboard from "@/components/AnalysisDashboard";
import Link from "next/link";

export default function SharedAnalysisPage() {
  const params = useParams();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    if (params.id) {
      fetchAnalysis(params.id as string);
    }
  }, [params.id]);

  const fetchAnalysis = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getPublicAnalysis(id);
      setAnalysis(data.analysis);
    } catch (err: any) {
      setError(err.message || "Failed to load shared analysis");
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center text-center p-6">
        <ShieldAlert className="h-12 w-12 text-destructive mb-4" />
        <h2 className="text-2xl font-bold">Analysis Not Found</h2>
        <p className="text-muted-foreground mt-2 max-w-md">
          {error || "This report might be private or doesn't exist."}
        </p>
        <Link href="/">
          <Button className="mt-6">Go to Homepage</Button>
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background py-12 px-4 sm:px-6">
      <div className="mx-auto max-w-5xl">
        <div className="mb-8 flex items-center justify-between border-b pb-6">
          <div>
            <div className="inline-flex items-center rounded-full bg-primary/10 px-3 py-1 text-sm font-medium text-primary mb-3">
              Public Report
            </div>
            <h1 className="text-3xl font-bold">
              {analysis.uploadId?.originalName || "Analysis Results"}
            </h1>
            <p className="mt-1 text-muted-foreground">
              Analyzed on {new Date(analysis.createdAt).toLocaleDateString()} • {analysis.uploadId?.rowCount || 0} responses
            </p>
          </div>
          <Link href="/">
            <Button variant="outline">Create Your Own</Button>
          </Link>
        </div>
        
        {/* We pass a stripped down version of analysis, or the component can be modified to accept isPublicView prop. 
            For now, we just pass the analysis. The Chat and Refine buttons will fail if clicked by unauthenticated user, 
            but a better approach is to add a readonly prop to AnalysisDashboard. */}
        <AnalysisDashboard analysis={analysis} isReadOnly={true} />
      </div>
    </div>
  );
}