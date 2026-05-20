"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import CsvUpload from "@/components/CsvUpload";

export default function NewAnalysisPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [isUploading, setIsUploading] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);

  const handleUpload = async (file: File, customPrompt?: string) => {
    setIsUploading(true);
    try {
      const res = await api.uploadCsv(file);
      setIsAnalyzing(true);
      const analysisRes = await api.analyzeData(res.upload._id, res.data, customPrompt);
      toast.success("Analysis complete!");
      refreshProfile();
      router.push(`/dashboard/analysis/${analysisRes.analysis._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Upload failed");
    } finally {
      setIsUploading(false);
      setIsAnalyzing(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-2xl">
      <div className="mb-8 text-center">
        <h1 className="text-3xl font-bold">Create New Analysis</h1>
        <p className="mt-2 text-muted-foreground">
          Upload a CSV file with your survey responses to get started.
        </p>
        <p className="mt-4 text-sm font-medium text-primary">
          {user.plan?.id === "pro" ? Math.max(0, 4 - user.analysisCount) : Math.max(0, 2 - user.analysisCount)} analyses remaining in {user.plan?.id === "pro" ? "Pro" : "Free"} plan.
        </p>
      </div>
      <CsvUpload onUpload={handleUpload} isUploading={isUploading || isAnalyzing} />
      {isAnalyzing && (
        <div className="mt-8 flex flex-col items-center gap-4">
          <div className="flex items-center gap-2">
            <Loader2 className="h-5 w-5 animate-spin text-primary" />
            <span className="font-medium">AI is analyzing your data...</span>
          </div>
          <p className="text-sm text-muted-foreground text-center max-w-md">
            We're processing your responses, detecting sentiment, and uncovering key insights. This usually takes 10-20 seconds.
          </p>
        </div>
      )}
    </div>
  );
}
