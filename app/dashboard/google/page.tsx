"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Database, Unplug, Loader2, Edit, Trash2, AlertTriangle, RefreshCw } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import * as api from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import GoogleFormSelector from "@/components/GoogleFormSelector";

const REQUIRED_SCOPES = [
  'https://www.googleapis.com/auth/forms.responses.readonly',
  'https://www.googleapis.com/auth/forms.body',
  'https://www.googleapis.com/auth/drive',
];

export default function GoogleFormsPage() {
  const { user, refreshProfile } = useAuth();
  const router = useRouter();
  const [googleForms, setGoogleForms] = useState<any[]>([]);
  const [generatedForms, setGeneratedForms] = useState<any[]>([]);
  const [loadingGoogle, setLoadingGoogle] = useState(false);
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [showDisconnectModal, setShowDisconnectModal] = useState(false);
  const [isDisconnecting, setIsDisconnecting] = useState(false);
  const [formToDelete, setFormToDelete] = useState<string | null>(null);
  const [googleFormToDelete, setGoogleFormToDelete] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const missingScopes = REQUIRED_SCOPES.filter(s => !user?.googleScopes?.includes(s));
  const hasMissingScopes = user?.googleAccessToken && missingScopes.length > 0;

  useEffect(() => {
    if (user && (user as any).googleAccessToken) {
      fetchGoogleForms();
      fetchGeneratedForms();
    }
  }, [user]);

  const fetchGoogleForms = async () => {
    setLoadingGoogle(true);
    try {
      const data = await api.listGoogleForms();
      setGoogleForms(data.forms || []);
    } catch (err: any) {
      console.error(err);
      if (err.code === "MISSING_GOOGLE_SCOPES") {
        toast.error("Missing required permissions for Google Drive/Forms. Please reconnect.");
      } else {
        toast.error("Failed to fetch Google Forms. Try reconnecting.");
      }
    } finally {
      setLoadingGoogle(false);
    }
  };

  const fetchGeneratedForms = async () => {
    try {
      const data = await api.getGeneratedForms();
      setGeneratedForms(data.forms || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleConnectGoogle = async () => {
    try {
      const { url } = await api.getGoogleAuthUrl();
      window.location.href = url;
    } catch (err) {
      toast.error("Failed to start Google connection");
    }
  };

  const handleDisconnectGoogle = async () => {
    setIsDisconnecting(true);
    try {
      await api.disconnectGoogle();
      toast.success("Google account disconnected");
      refreshProfile();
      setGoogleForms([]);
      setShowDisconnectModal(false);
    } catch (err) {
      toast.error("Failed to disconnect Google account");
    } finally {
      setIsDisconnecting(false);
    }
  };

  const handleAnalyzeGoogleForm = async (formId: string, customPrompt?: string) => {
    setIsAnalyzing(true);
    try {
      const res = await api.analyzeGoogleForm(formId, customPrompt);
      toast.success("Analysis complete!");
      refreshProfile();
      router.push(`/dashboard/analysis/${res.analysis._id}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Analysis failed");
    } finally {
      setIsAnalyzing(false);
    }
  };

  const handleDeleteGeneratedForm = async () => {
    if (!formToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteGeneratedForm(formToDelete);
      toast.success("Form deleted successfully");
      setGeneratedForms((prev) => prev.filter((f) => f._id !== formToDelete));
      setFormToDelete(null);
    } catch (err) {
      toast.error("Failed to delete form");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleDeleteGoogleForm = async () => {
    if (!googleFormToDelete) return;
    setIsDeleting(true);
    try {
      await api.deleteGoogleForm(googleFormToDelete);
      toast.success("Google Form deleted successfully");
      setGoogleForms((prev) => prev.filter((f) => f.id !== googleFormToDelete));
      setGeneratedForms((prev) => prev.filter((f) => f.formId !== googleFormToDelete));
      setGoogleFormToDelete(null);
    } catch (err) {
      toast.error("Failed to delete Google Form");
    } finally {
      setIsDeleting(false);
    }
  };

  if (!user) return null;

  return (
    <div className="mx-auto max-w-4xl">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold">Google Forms Sync</h1>
          <p className="mt-2 text-muted-foreground">
            Connect directly to Google Forms and analyze responses instantly.
          </p>
        </div>
        {(user as any).googleAccessToken && (
          <Button variant="outline" size="sm" onClick={() => setShowDisconnectModal(true)} className="gap-2">
            <Unplug className="h-4 w-4" />
            Disconnect Google
          </Button>
        )}
      </div>

      {hasMissingScopes && (
        <Card className="mb-8 border-amber-500 bg-amber-50 dark:bg-amber-950/20">
          <CardContent className="flex flex-col sm:flex-row items-center gap-4 p-4">
            <div className="rounded-full bg-amber-100 dark:bg-amber-900/40 p-2 shrink-0">
              <AlertTriangle className="h-5 w-5 text-amber-600 dark:text-amber-500" />
            </div>
            <div className="flex-1 space-y-1 text-center sm:text-left">
              <h4 className="text-sm font-bold text-amber-900 dark:text-amber-400">Incomplete Permissions</h4>
              <p className="text-xs text-amber-800/80 dark:text-amber-500/80">
                You haven't granted permission to access Google Drive and Forms. Some features will not work.
              </p>
            </div>
            <Button 
              size="sm" 
              variant="outline" 
              className="border-amber-200 bg-white hover:bg-amber-50 text-amber-700 shrink-0 gap-2"
              onClick={handleConnectGoogle}
            >
              <RefreshCw className="h-3.5 w-3.5" />
              Reconnect Now
            </Button>
          </CardContent>
        </Card>
      )}

      {!(user as any).googleAccessToken ? (
        <Card className="border-dashed py-12 text-center">
          <CardContent className="flex flex-col items-center gap-4">
            <div className="rounded-full bg-primary/10 p-4">
              <Database className="h-8 w-8 text-primary" />
            </div>
            <div className="space-y-1">
              <h3 className="text-lg font-bold">No Google Account Connected</h3>
              <p className="text-sm text-muted-foreground max-w-xs mx-auto">
                Connect your Google account to list and analyze your forms without manual exports.
              </p>
            </div>
            <Button onClick={handleConnectGoogle} className="mt-2">
              Connect Google Account
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-8">
          {generatedForms.length > 0 && (
            <div className="space-y-4">
              <h2 className="text-xl font-bold">Your AI Generated Forms</h2>
              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                {generatedForms.map((form) => (
                  <Card key={form._id} className="relative overflow-hidden group">
                    <CardContent className="p-4 flex flex-col h-full justify-between">
                      <div>
                        <h3 className="font-semibold line-clamp-2">{form.draft?.title || "Untitled Form"}</h3>
                        <p className="text-xs text-muted-foreground mt-1">
                          {new Date(form.createdAt).toLocaleDateString()}
                        </p>
                      </div>
                      <div className="mt-4 flex gap-2">
                        <Button 
                          size="sm" 
                          variant="outline" 
                          className="flex-1"
                          onClick={() => router.push(`/dashboard/google/create?id=${form._id}`)}
                        >
                          <Edit className="w-4 h-4 mr-2" /> Edit
                        </Button>
                        <Button 
                          size="sm" 
                          variant="destructive" 
                          onClick={() => setFormToDelete(form._id)}
                        >
                          <Trash2 className="w-4 h-4" />
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          )}

          <div className="space-y-4">
            <h2 className="text-xl font-bold">All Google Forms</h2>
            {loadingGoogle ? (
              <div className="flex flex-col items-center py-12 gap-4">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
                <p className="text-muted-foreground">Fetching your Google Forms...</p>
              </div>
            ) : (
              <GoogleFormSelector
                forms={googleForms}
                onAnalyze={handleAnalyzeGoogleForm}
                onDelete={(formId) => setGoogleFormToDelete(formId)}
                isAnalyzing={isAnalyzing}
              />
            )}
          </div>
        </div>
      )}

      <ConfirmationModal
        isOpen={showDisconnectModal}
        onClose={() => setShowDisconnectModal(false)}
        onConfirm={handleDisconnectGoogle}
        isLoading={isDisconnecting}
        title="Disconnect Google Account"
        description="Are you sure you want to disconnect your Google account? You will lose access to direct form syncing."
        confirmText="Disconnect"
        variant="destructive"
      />

      <ConfirmationModal
        isOpen={!!formToDelete}
        onClose={() => setFormToDelete(null)}
        onConfirm={handleDeleteGeneratedForm}
        isLoading={isDeleting}
        title="Delete Form"
        description="Are you sure you want to delete this generated form? It will also attempt to delete the actual form from your Google Drive."
        confirmText="Delete"
        variant="destructive"
      />

      <ConfirmationModal
        isOpen={!!googleFormToDelete}
        onClose={() => setGoogleFormToDelete(null)}
        onConfirm={handleDeleteGoogleForm}
        isLoading={isDeleting}
        title="Delete Google Form"
        description="Are you sure you want to delete this Google Form? It will be moved to the trash in your Google Drive."
        confirmText="Delete"
        variant="destructive"
      />
    </div>
  );
}
