"use client";

import { useState, useRef, DragEvent } from "react";
import { Upload, FileText, X, Loader2, MessageSquareText, Sparkles } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Label } from "@/components/ui/label";

const SUGGESTED_PROMPTS = [
  "Top 3 pain points",
  "Sentiment analysis",
  "Feature requests",
  "Executive summary",
];

interface CsvUploadProps {
  onUpload: (file: File, customPrompt?: string) => Promise<void>;
  isUploading: boolean;
}

export default function CsvUpload({ onUpload, isUploading }: CsvUploadProps) {
  const [dragActive, setDragActive] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [customPrompt, setCustomPrompt] = useState("");
  const inputRef = useRef<HTMLInputElement>(null);

  const validateAndSetFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".csv")) {
      toast.error("Only CSV files are allowed.");
      return;
    }
    if (selectedFile.size > 5 * 1024 * 1024) {
      toast.error("File size must be under 5MB.");
      return;
    }
    setFile(selectedFile);
  };

  const handleDrop = (e: DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const selectedFile = e.dataTransfer.files[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const selectedFile = e.target.files?.[0];
    if (selectedFile) validateAndSetFile(selectedFile);
  };

  const clearFile = () => {
    setFile(null);
    if (inputRef.current) inputRef.current.value = "";
  };

  const handleStartAnalysis = async () => {
    if (!file) {
      toast.error("Please upload a CSV file first.");
      return;
    }
    await onUpload(file, customPrompt);
  };

  const handleSuggestionClick = (prompt: string) => {
    setCustomPrompt(prompt);
  };

  return (
    <div className="space-y-6">
      {/* Prompt Card - Now Initial */}
      <Card className="border-primary/20 shadow-md">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2 text-primary">
            <Sparkles className="h-5 w-5" />
            <CardTitle className="text-lg">Analysis Settings</CardTitle>
          </div>
          <CardDescription>
            Customize how the AI interprets your data and what to focus on.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <MessageSquareText className="h-4 w-4 text-muted-foreground" />
                <Label htmlFor="custom-prompt" className="font-bold">
                  Custom Instructions
                </Label>
              </div>
            </div>
            
            {/* Custom integrated chat-like input wrapper */}
            <div className="relative rounded-xl border border-input bg-muted/30 focus-within:ring-2 focus-within:ring-primary focus-within:ring-offset-2 transition-all">
              <textarea
                id="custom-prompt"
                rows={3}
                placeholder="e.g., Focus on product quality feedback. Compare trends by region. Keep the tone executive and concise..."
                className="w-full resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground outline-none disabled:cursor-not-allowed disabled:opacity-50 min-h-[100px]"
                value={customPrompt}
                onChange={(e) => setCustomPrompt(e.target.value)}
                disabled={isUploading}
              />
              <div className="flex flex-wrap items-center gap-1.5 px-3 pb-3">
                {SUGGESTED_PROMPTS.map((prompt, index) => (
                  <button
                    key={index}
                    type="button"
                    className="inline-flex items-center gap-1.5 whitespace-nowrap text-[11px] bg-background/80 border border-border/50 hover:border-primary/30 hover:bg-primary/5 text-muted-foreground hover:text-primary rounded-full px-3 py-1 transition-all font-medium shadow-sm w-fit"
                    onClick={() => handleSuggestionClick(prompt)}
                  >
                    <Sparkles className="w-3 h-3" />
                    {prompt}
                  </button>
                ))}
              </div>
            </div>
            
          </div>
        </CardContent>
      </Card>

      {/* Upload Card */}
      <Card className="overflow-hidden border-2 transition-all">
        <CardContent className="p-0">
          <div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={handleDrop}
            className={`relative flex flex-col items-center justify-center p-10 transition-colors ${
              dragActive
                ? "bg-primary/5"
                : "bg-background hover:bg-muted/30"
            }`}
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv"
              onChange={handleChange}
              className="hidden"
              id="csv-upload"
            />

            {file ? (
              <div className="flex flex-col items-center gap-4 animate-in fade-in zoom-in duration-300">
                <div className="relative">
                  <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-primary/10 text-primary">
                    <FileText className="h-8 w-8" />
                  </div>
                  <button
                    onClick={clearFile}
                    className="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full bg-destructive text-destructive-foreground shadow-sm hover:bg-destructive/90 transition-transform hover:scale-110"
                  >
                    <X className="h-3 w-3" />
                  </button>
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">{file.name}</p>
                  <p className="text-xs text-muted-foreground">
                    {(file.size / 1024).toFixed(1)} KB
                  </p>
                </div>
              </div>
            ) : (
              <label
                htmlFor="csv-upload"
                className="flex cursor-pointer flex-col items-center gap-4 group"
              >
                <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-muted text-muted-foreground transition-all group-hover:bg-primary/10 group-hover:text-primary group-hover:scale-105">
                  <Upload className="h-8 w-8" />
                </div>
                <div className="text-center">
                  <p className="text-sm font-semibold">
                    Drag & drop your CSV file here
                  </p>
                  <p className="mt-1 text-xs text-muted-foreground">
                    or click to browse your computer
                  </p>
                </div>
                <Button variant="outline" size="sm" type="button" className="pointer-events-none">
                  Choose File
                </Button>
              </label>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Action Button */}
      <Button
        className={`w-full py-6 text-lg font-bold shadow-lg transition-all ${
          file ? "shadow-primary/20 opacity-100 translate-y-0" : "opacity-50 cursor-not-allowed"
        }`}
        onClick={handleStartAnalysis}
        disabled={isUploading || !file}
      >
        {isUploading ? (
          <>
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            AI is Analyzing...
          </>
        ) : (
          <>
            <Sparkles className="mr-2 h-5 w-5" />
            Start Expert Analysis
          </>
        )}
      </Button>
    </div>
  );
}
