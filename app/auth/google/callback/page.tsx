"use client";

import { useEffect, useRef, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { useAuth } from "@/contexts/AuthContext";

function GoogleCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const code = searchParams.get("code");
  const processed = useRef(false);
  const { refreshProfile, setAuthData } = useAuth();

  useEffect(() => {
    if (code) {
      if (!processed.current) {
        processed.current = true;
        handleCallback(code);
      }
    } else {
      router.push("/auth/login");
    }
  }, [code, router]);

  const handleCallback = async (authCode: string) => {
    try {
      const token = localStorage.getItem("token");
      if (token) {
        // Connect Google account to existing user
        await api.connectGoogle(authCode);
        await refreshProfile();
        toast.success("Google account connected successfully!");
        router.push("/dashboard/google");
      } else {
        // Login or Signup with Google
        const data = await api.googleAuth(authCode);
        setAuthData(data.token, data.user);
        toast.success("Successfully authenticated!");
        router.push("/dashboard/new");
      }
    } catch (err) {
      toast.error("Failed to authenticate with Google");
      router.push("/auth/login");
    }
  };

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4">
      <Loader2 className="h-8 w-8 animate-spin text-primary" />
      <p className="text-muted-foreground font-medium">Authenticating with Google...</p>
    </div>
  );
}

export default function GoogleCallbackPage() {
  return (
    <Suspense fallback={
      <div className="flex min-h-screen flex-col items-center justify-center gap-4">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
        <p className="text-muted-foreground font-medium">Loading...</p>
      </div>
    }>
      <GoogleCallbackContent />
    </Suspense>
  );
}
