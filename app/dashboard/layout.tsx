"use client";
import React, { useMemo, useCallback } from "react";
import { useEffect } from "react";
import { useRouter, usePathname } from "next/navigation";
import Link from "next/link";
import {
  LayoutDashboard,
  Loader2,
  ChevronRight,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/contexts/AuthContext";
import { Badge } from "@/components/ui/badge";
import { ThemeToggle } from "@/components/ThemeToggle";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import * as api from "@/lib/api";
import Sidebar from "@/components/Sidebar";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, logout, loading: authLoading, refreshProfile } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const [showLogoutModal, setShowLogoutModal] = React.useState(false);
  const [isUpgrading, setIsUpgrading] = React.useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.push("/auth");
    }
  }, [user, authLoading, router]);

  const handleUpgrade = useCallback(async () => {
    setIsUpgrading(true);
    
    try {
      const data = await api.createCheckout();
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "AI Form Insights Pro",
        description: "Monthly Subscription",
        prefill: data.prefill,
        handler: async function (response: any) {
          try {
            // Direct verification for immediate UI update
            await api.verifySubscription({
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_subscription_id: response.razorpay_subscription_id,
              razorpay_signature: response.razorpay_signature,
            });
            
            toast.success("Payment successful! Your Pro plan is now active.");
            await refreshProfile();
            setIsUpgrading(false);
            router.refresh();
          } catch (err) {
            console.error("Verification error", err);
            toast.error("Payment verified by Razorpay but failed to update locally. Please refresh in a moment.");
            setIsUpgrading(false);
          }
        },
        modal: {
          ondismiss: function() {
            setIsUpgrading(false);
          }
        },
        theme: {
          color: "#000000"
        }
      };

      const rzp = new (window as any).Razorpay(options);
      rzp.on('payment.failed', function () {
        setIsUpgrading(false);
        toast.error("Payment failed. Please try again.");
      });
      rzp.open();
    } catch (err) {
      toast.error("Failed to start checkout");
      setIsUpgrading(false);
    }
  }, [refreshProfile, router]);

  const activeTab = useMemo(() => {
    if (pathname.startsWith("/dashboard/google/create")) return "builder";
    if (pathname.startsWith("/dashboard/google")) return "google";
    if (pathname.startsWith("/dashboard/history")) return "history";
    if (pathname.startsWith("/dashboard/settings")) return "settings";
    if (pathname.startsWith("/dashboard/analysis/")) return "details";
    if (pathname === "/dashboard/new" || pathname === "/dashboard") return "new";
    return "";
  }, [pathname]);

  const pageTitle = useMemo(() => {
    switch (activeTab) {
      case "new": return "New Analysis";
      case "history": return "History";
      case "google": return "Google Forms";
      case "builder": return "AI Form Builder";
      case "settings": return "Settings";
      case "details": return "Analysis Details";
      default: return "Dashboard";
    }
  }, [activeTab]);

  if (authLoading || !user) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex min-h-screen bg-muted/30">
      <Sidebar 
        activeTab={activeTab} 
        user={user} 
        isUpgrading={isUpgrading} 
        onUpgrade={handleUpgrade} 
        onLogout={() => setShowLogoutModal(true)} 
      />

      {/* Main Content */}
      <main className="ml-64 flex-1">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b bg-background/80 px-8 backdrop-blur-md">
          <div className="flex items-center gap-2">
            <LayoutDashboard className="h-5 w-5 text-muted-foreground" />
            <Link href="/dashboard" className="text-sm font-medium text-muted-foreground hover:text-foreground">
              Dashboard
            </Link>
            <ChevronRight className="h-4 w-4 text-muted-foreground" />
            <span className="text-sm font-bold">
              {pageTitle}
            </span>
          </div>
          <div className="flex items-center gap-4">
            <ThemeToggle />
            <div className="flex flex-col items-end">
              <span className="text-sm font-medium">{user?.name}</span>
              <Badge variant={user?.plan?.id === "pro" ? "default" : "secondary"} className="text-[10px] h-4">
                {(user?.plan?.name || "FREE").toUpperCase()}
              </Badge>
            </div>
          </div>
        </header>

        <div className="p-8">
          {children}
        </div>
      </main>

      <ConfirmationModal
        isOpen={showLogoutModal}
        onClose={() => setShowLogoutModal(false)}
        onConfirm={() => {
          logout();
          setShowLogoutModal(false);
        }}
        title="Confirm Logout"
        description="Are you sure you want to log out? You will need to sign in again to access your dashboard."
        confirmText="Log out"
        variant="destructive"
      />
    </div>
  );
}
