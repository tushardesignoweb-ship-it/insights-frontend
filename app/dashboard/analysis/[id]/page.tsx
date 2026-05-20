"use client";

import { useState, useEffect } from "react";
import { useRouter, useParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import AnalysisDashboard from "@/components/AnalysisDashboard";

export default function AnalysisDetailsPage() {
  const { user } = useAuth();
  const params = useParams();
  const [analysis, setAnalysis] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (user && params.id) {
      fetchAnalysis(params.id as string);
    }
  }, [user, params.id]);

  const fetchAnalysis = async (id: string) => {
    setLoading(true);
    try {
      const data = await api.getAnalysis(id);
      console.log(data);
      
      setAnalysis(data.analysis);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (!user) return null;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!analysis) {
    return (
      <div className="text-center py-20">
        <h2 className="text-2xl font-bold">Analysis not found</h2>
      </div>
    );
  }

  return (
    <div className="w-full">
      <AnalysisDashboard analysis={analysis} />
    </div>
  );
}
