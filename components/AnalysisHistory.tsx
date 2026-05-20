"use client";

import { FileText, Calendar, Loader2, Inbox, ChevronRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";

interface AnalysisItem {
  _id: string;
  summary: string;
  detailedReport?: string;
  responsesTable?: string;
  source: 'upload' | 'google_form';
  formId?: string;
  uploadId?: {
    originalName: string;
    rowCount: number;
  };
  createdAt: string;
}

interface AnalysisHistoryProps {
  history: AnalysisItem[];
  onSelect: (analysis: any) => void;
  isLoading: boolean;
}

export default function AnalysisHistory({
  history,
  onSelect,
  isLoading,
}: AnalysisHistoryProps) {
  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!history || history.length === 0) {
    return (
      <Card className="border-dashed">
        <CardContent className="flex flex-col items-center justify-center py-20 text-muted-foreground">
          <Inbox className="mb-4 h-12 w-12 text-muted-foreground/50" />
          <p className="text-lg font-medium">No analyses yet</p>
          <p className="text-sm">Upload a CSV file to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="grid gap-4 md:grid-cols-2">
      {history.map((analysis) => (
        <Card
          key={analysis._id}
          className="group cursor-pointer border-border/50 transition-all hover:border-primary/50 hover:bg-accent/30"
          onClick={() => onSelect(analysis)}
        >
          <CardContent className="flex items-start gap-4 p-5">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors group-hover:bg-primary group-hover:text-primary-foreground">
              <FileText className="h-6 w-6" />
            </div>
            <div className="min-w-0 flex-1">
              <div className="flex items-center justify-between gap-2 mb-2">
                <p className="truncate font-bold text-sm">
                  {analysis.source === 'google_form' 
                    ? `Google Form Analysis` 
                    : analysis.uploadId?.originalName || "Untitled Analysis"}
                </p>
                <ChevronRight className="h-4 w-4 text-muted-foreground opacity-0 transition-all group-hover:opacity-100 group-hover:translate-x-1" />
              </div>
              
              <div className="flex flex-wrap gap-2 mb-3">
                <p className="text-xs text-muted-foreground line-clamp-2">
                  {analysis.summary || "No summary available"}
                </p>
              </div>

              <div className="mt-2 flex items-center justify-between text-xs text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  {new Date(analysis.createdAt).toLocaleDateString()}
                </span>
                {analysis.uploadId && (
                  <span className="font-medium text-xs">
                    {analysis.uploadId.rowCount} responses
                  </span>
                )}
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
