"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import AnalysisHistory from "@/components/AnalysisHistory";

export default function HistoryPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [history, setHistory] = useState<any[]>([]);
  const [loadingHistory, setLoadingHistory] = useState(false);

  useEffect(() => {
    if (user) {
      fetchHistory();
    }
  }, [user]);

  const fetchHistory = async () => {
    setLoadingHistory(true);
    try {
      const data = await api.getAnalyses();
      setHistory(data.analyses);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingHistory(false);
    }
  };

  const handleSelectAnalysis = (analysis: any) => {
    router.push(`/dashboard/analysis/${analysis._id}`);
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Analysis History</h1>
        <p className="mt-2 text-muted-foreground">
          View and manage your previous survey analyses.
        </p>
      </div>
      <AnalysisHistory
        history={history}
        onSelect={handleSelectAnalysis}
        isLoading={loadingHistory}
      />
    </div>
  );
}
