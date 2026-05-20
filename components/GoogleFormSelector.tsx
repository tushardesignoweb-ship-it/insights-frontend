"use client";

import { useState } from "react";
import { Loader2, Search, ExternalLink, Play, Zap, Copy, Check, Info, Database, Trash2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { useAuth } from "@/contexts/AuthContext";

interface GoogleForm {
  id: string;
  name: string;
  webViewLink?: string;
  iconLink?: string;
}

interface GoogleFormSelectorProps {
  forms: GoogleForm[];
  onAnalyze: (formId: string, customPrompt?: string) => void;
  onDelete: (formId: string) => void;
  isAnalyzing: boolean;
}

export default function GoogleFormSelector({ forms, onAnalyze, onDelete, isAnalyzing }: GoogleFormSelectorProps) {
  const { user } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [customPrompt, setCustomPrompt] = useState("");
  const [selectedFormId, setSelectedFormId] = useState<string | null>(null);

  const filteredForms = forms.filter((form) =>
    form.name.toLowerCase().includes(searchTerm.toLowerCase())
  );


  const getFormColor = (id: string) => {
    const colors = [
      "from-purple-500 to-indigo-600",
      "from-blue-500 to-cyan-600",
      "from-emerald-500 to-teal-600",
      "from-orange-500 to-rose-600",
      "from-pink-500 to-purple-600",
    ];
    const index = id.split("").reduce((acc, char) => acc + char.charCodeAt(0), 0) % colors.length;
    return colors[index];
  };

  return (
    <div className="space-y-6">
      <div className="relative">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="Search your forms..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          className="pl-10 h-11"
        />
      </div>

      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {filteredForms.map((form) => (
          <Card 
            key={form.id} 
            className={`group relative flex flex-col overflow-hidden cursor-pointer transition-all duration-300 hover:shadow-lg hover:-translate-y-1 ${
              selectedFormId === form.id 
                ? "border-primary ring-2 ring-primary/20 bg-primary/5" 
                : "border-border/50 hover:border-primary/50"
            }`}
            onClick={() => setSelectedFormId(form.id)}
          >
            {/* Form "Thumbnail" Header */}
            <div className={`h-24 w-full bg-gradient-to-br ${getFormColor(form.id)} flex items-center justify-center relative overflow-hidden`}>
              <div className="absolute inset-0 bg-black/10 group-hover:bg-black/0 transition-colors" />
              <div className="relative z-10 rounded-lg bg-white/20 p-3 backdrop-blur-md border border-white/30">
                {form.iconLink ? (
                  <img src={form.iconLink} alt="" className="h-8 w-8" />
                ) : (
                  <Database className="h-8 w-8 text-white" />
                )}
              </div>
              {selectedFormId === form.id && (
                <div className="absolute top-2 right-2 bg-white rounded-full p-1 shadow-sm">
                  <Check className="h-3 w-3 text-primary font-bold" />
                </div>
              )}
            </div>

            <CardHeader className="p-4 pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-sm font-bold line-clamp-2 leading-tight">
                  {form.name}
                </CardTitle>
                <div className="flex gap-1 shrink-0">
                  {form.webViewLink && (
                    <a 
                      href={form.webViewLink} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      onClick={(e) => e.stopPropagation()}
                      className="p-1 text-muted-foreground hover:text-primary hover:bg-primary/10 rounded-md transition-colors"
                      title="View Original Form"
                    >
                      <ExternalLink className="h-3.5 w-3.5" />
                    </a>
                  )}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      onDelete(form.id);
                    }}
                    className="p-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 rounded-md transition-colors"
                    title="Delete Form"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                  </button>
                </div>
              </div>
            </CardHeader>
            <CardContent className="p-4 pt-0 mt-auto">
              <div className="flex items-center justify-between">
                <p className="text-[10px] font-mono text-muted-foreground truncate max-w-[120px]">
                  ID: {form.id}
                </p>
                <div className="flex items-center gap-1 text-[10px] font-medium text-muted-foreground">
                  <div className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  Synced
                </div>
              </div>
            </CardContent>
          </Card>
        ))}

        {filteredForms.length === 0 && (
          <div className="col-span-full py-16 text-center border-2 border-dashed rounded-xl">
            <div className="inline-flex h-12 w-12 items-center justify-center rounded-full bg-muted mb-4">
              <Search className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="font-medium">No forms found</h3>
            <p className="text-sm text-muted-foreground mt-1">Try a different search term or reconnect your account.</p>
          </div>
        )}
      </div>

      {selectedFormId && (
        <div className="space-y-4">
          <Card className="border-primary/20 bg-primary/5">
            <CardContent className="p-6">
              <div className="flex flex-col md:flex-row gap-6">
                <div className="flex-1 space-y-4">
                  <div className="space-y-2">
                    <Label htmlFor="custom-prompt">Custom Analysis Instructions (Optional)</Label>
                    <Input
                      id="custom-prompt"
                      placeholder="e.g. Focus on candidates with React skills and >3 years exp..."
                      value={customPrompt}
                      onChange={(e) => setCustomPrompt(e.target.value)}
                    />
                  </div>
                  <Button 
                    className="w-full gap-2" 
                    onClick={() => onAnalyze(selectedFormId, customPrompt)}
                    disabled={isAnalyzing}
                  >
                    {isAnalyzing ? (
                      <>
                        <Loader2 className="h-4 w-4 animate-spin" />
                        Analyzing Responses...
                      </>
                    ) : (
                      <>
                        <Play className="h-4 w-4" />
                        Run Manual Sync
                      </>
                    )}
                  </Button>
                </div>

              </div>
            </CardContent>
          </Card>

        </div>
      )}
    </div>
  );
}
