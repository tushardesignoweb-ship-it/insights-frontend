"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/contexts/AuthContext";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { toast } from "sonner";
import * as api from "@/lib/api";
import { ConfirmationModal } from "@/components/ui/confirmation-modal";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Loader2, User, Lock, CreditCard, Trash2, ShieldAlert, Settings, Check, Sparkles } from "lucide-react";

export default function SettingsPage() {
  const { user, refreshProfile, logout } = useAuth();
  const [name, setName] = useState(user?.name || "");
  const [scoringCriteria, setScoringCriteria] = useState(user?.scoringCriteria || "");
  const [webhookUrl, setWebhookUrl] = useState(user?.webhookUrl || "");
  const [webhookSecret, setWebhookSecret] = useState(user?.webhookSecret || "");
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [isUpdatingWebhooks, setIsUpdatingWebhooks] = useState(false);

  const [currentPassword, setCurrentPassword] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [isCancellingSubscription, setIsCancellingSubscription] = useState(false);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const [isDeletingAccount, setIsDeletingAccount] = useState(false);
  const [isUpgrading, setIsUpgrading] = useState(false);
  const router = useRouter();

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name) return;
    setIsUpdatingProfile(true);
    try {
      await api.updateProfile(name, scoringCriteria);
      await refreshProfile();
      toast.success("Profile updated successfully");
    } catch (err: any) {
      toast.error(err.message || "Failed to update profile");
    } finally {
      setIsUpdatingProfile(false);
    }
  };


  const handleChangePassword = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }
    setIsChangingPassword(true);
    try {
      await api.changePassword(currentPassword, newPassword);
      toast.success("Password changed successfully");
      setCurrentPassword("");
      setNewPassword("");
      setConfirmPassword("");
    } catch (err: any) {
      toast.error(err.message || "Failed to change password");
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleUpgrade = async () => {
    setIsUpgrading(true);
    try {
      const data = await api.createCheckout();
      const options = {
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "AI Form Insights Pro",
        description: "Monthly Subscription",
        prefill: data.prefill,
        handler: function (response: any) {
          toast.success("Payment successful! Your Pro plan is now active.");
          refreshProfile();
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
      });
      rzp.open();
    } catch (err) {
      toast.error("Failed to start checkout");
      setIsUpgrading(false);
    }
  };

  const handleCancelSubscription = async () => {
    setIsCancellingSubscription(true);
    try {
      await api.cancelSubscription();
      await refreshProfile();
      toast.success("Subscription cancelled successfully");
      setShowCancelModal(false);
    } catch (err: any) {
      toast.error(err.message || "Failed to cancel subscription");
    } finally {
      setIsCancellingSubscription(false);
    }
  };

  const handleDeleteAccount = async () => {
    setIsDeletingAccount(true);
    try {
      await api.deleteAccount();
      toast.success("Account deleted successfully");
      logout();
    } catch (err: any) {
      toast.error(err.message || "Failed to delete account");
    } finally {
      setIsDeletingAccount(false);
    }
  };

  if (!user) return null;

  return (
    <div className="max-w-4xl space-y-8">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Settings</h1>
        <p className="text-muted-foreground">Manage your account settings and preferences.</p>
      </div>

      <Tabs defaultValue="profile" className="space-y-6">
        <TabsList className="grid w-full grid-cols-2 md:w-auto md:inline-grid md:grid-cols-4">
          <TabsTrigger value="profile">
            <User className="mr-2 h-4 w-4" />
            Profile
          </TabsTrigger>
          <TabsTrigger value="security">
            <Lock className="mr-2 h-4 w-4" />
            Security
          </TabsTrigger>
          <TabsTrigger value="billing">
            <CreditCard className="mr-2 h-4 w-4" />
            Billing
          </TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Profile Information</CardTitle>
              <CardDescription>Update your name and see your email address.</CardDescription>
            </CardHeader>
            <form onSubmit={handleUpdateProfile}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="email">Email</Label>
                  <Input id="email" value={user.email} disabled className="bg-muted" />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Your email address is used for login and notifications.
                  </p>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="name">Full Name</Label>
                  <Input 
                    id="name" 
                    value={name} 
                    onChange={(e) => setName(e.target.value)} 
                    placeholder="Your Name" 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="scoringCriteria">Custom AI Scoring Criteria (Optional)</Label>
                  <textarea
                    id="scoringCriteria"
                    value={scoringCriteria}
                    onChange={(e) => setScoringCriteria(e.target.value)}
                    placeholder="E.g., 'Score highly if they mention they love our customer support, give 0 if they complain about pricing.'"
                    className="flex min-h-[80px] w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50 resize-none"
                  />
                  <p className="text-[0.8rem] text-muted-foreground">
                    Define custom rules. The AI will use this to assign a 0-100 score to new responses.
                  </p>
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isUpdatingProfile || (name === user.name && scoringCriteria === (user.scoringCriteria || ""))}>
                  {isUpdatingProfile && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Save Changes
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="security" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Change Password</CardTitle>
              <CardDescription>Update your password to keep your account secure.</CardDescription>
            </CardHeader>
            <form onSubmit={handleChangePassword}>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="current-password">Current Password</Label>
                  <Input 
                    id="current-password" 
                    type="password" 
                    value={currentPassword} 
                    onChange={(e) => setCurrentPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="new-password">New Password</Label>
                  <Input 
                    id="new-password" 
                    type="password" 
                    value={newPassword} 
                    onChange={(e) => setNewPassword(e.target.value)} 
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="confirm-password">Confirm New Password</Label>
                  <Input 
                    id="confirm-password" 
                    type="password" 
                    value={confirmPassword} 
                    onChange={(e) => setConfirmPassword(e.target.value)} 
                  />
                </div>
              </CardContent>
              <CardFooter>
                <Button type="submit" disabled={isChangingPassword || !currentPassword || !newPassword}>
                  {isChangingPassword && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                  Update Password
                </Button>
              </CardFooter>
            </form>
          </Card>
        </TabsContent>

        <TabsContent value="billing" className="space-y-4">
          <div className="grid gap-6 md:grid-cols-2">
            {/* Current Plan Summary */}
            <Card className="md:col-span-2">
              <CardHeader>
                <CardTitle>Subscription Overview</CardTitle>
                <CardDescription>You are currently on the {user?.plan?.name} plan.</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 rounded-xl border p-6 bg-muted/30">
                  <div className="space-y-1">
                    <p className="text-sm font-medium text-muted-foreground">Current Status</p>
                    <div className="flex items-center gap-2">
                      <p className="text-3xl font-bold capitalize">{user?.plan?.name || "free"}</p>
                      <Badge variant={user?.plan?.id === "pro" ? "default" : "secondary"} className="px-3 py-1">
                        {user?.plan?.id === "pro" ? "Active" : "Free"}
                      </Badge>
                    </div>
                  </div>
                  {user?.plan?.id === "pro" && (
                    <Button variant="outline" onClick={() => setShowCancelModal(true)} className="text-destructive hover:bg-destructive/10 hover:text-destructive">
                      Cancel Subscription
                    </Button>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Plan Comparison / Upgrade Options */}
            <Card className={user?.plan?.id === "free" ? "border-primary/50 bg-primary/5 shadow-md" : "opacity-60"}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2">
                    Free Plan
                    {user?.plan?.id === "free" && <Badge variant="secondary">Current</Badge>}
                  </CardTitle>
                </div>
                <CardDescription>Basic features for personal use.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$0<span className="text-sm font-normal text-muted-foreground">/forever</span></div>
                <ul className="space-y-2.5">
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    5 AI Analyses per month
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    Basic Data Insights
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    CSV Upload Support
                  </li>
                  <li className="flex items-center text-sm text-muted-foreground">
                    <div className="mr-2 h-4 w-4" />
                    Standard PDF Reports
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                <Button variant="outline" className="w-full" disabled={user?.plan?.id === "free"}>
                  {user?.plan?.id === "free" ? "Current Plan" : "Downgrade"}
                </Button>
              </CardFooter>
            </Card>

            <Card className={user?.plan?.id === "pro" ? "border-primary bg-primary/5" : "border-primary shadow-lg relative overflow-hidden"}>
              {user?.plan?.id !== "pro" && (
                <div className="absolute top-0 right-0">
                  <div className="bg-primary text-primary-foreground text-[10px] font-bold px-3 py-1 rounded-bl-lg">
                    RECOMMENDED
                  </div>
                </div>
              )}
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  Pro Plan
                  {user?.plan?.id === "pro" && <Badge>Current</Badge>}
                  <Sparkles className="h-4 w-4 text-primary" />
                </CardTitle>
                <CardDescription>Advanced insights for professionals.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="text-3xl font-bold">$19<span className="text-sm font-normal text-muted-foreground">/month</span></div>
                <ul className="space-y-2.5">
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    4 AI Analyses
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    Advanced AI Insights
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    Google Forms Integration
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    Priority Support
                  </li>
                  <li className="flex items-center text-sm">
                    <Check className="mr-2 h-4 w-4 text-primary" />
                    Custom PDF Branding
                  </li>
                </ul>
              </CardContent>
              <CardFooter>
                {user?.plan?.id === "pro" ? (
                  <Button variant="outline" className="w-full" disabled>
                    Current Plan
                  </Button>
                ) : (
                  <Button className="w-full" onClick={handleUpgrade} disabled={isUpgrading}>
                    {isUpgrading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Upgrade to Pro
                  </Button>
                )}
              </CardFooter>
            </Card>
          </div>
        </TabsContent>

      </Tabs>

      <ConfirmationModal
        isOpen={showCancelModal}
        onClose={() => setShowCancelModal(false)}
        onConfirm={handleCancelSubscription}
        title="Cancel Subscription"
        description="Are you sure you want to cancel your subscription? You will still have access to Pro features until the end of your current billing period."
        confirmText="Cancel Subscription"
        variant="destructive"
      />

      <ConfirmationModal
        isOpen={showDeleteModal}
        onClose={() => setShowDeleteModal(false)}
        onConfirm={handleDeleteAccount}
        title="Delete Account"
        description="This action is permanent and cannot be undone. All your data will be permanently wiped from our servers."
        confirmText="Delete My Account"
        variant="destructive"
      />
    </div>
  );
}
