// const API_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:5002/api";
// const API_URL = "https://lip-uncoated-haiku.ngrok-free.dev/api"
const API_URL = "https://insights-backend-cbus.onrender.com/api"
// const API_URL = "http://localhost:5002/api"

async function api(endpoint: string, options: RequestInit = {}) {
  const token =
    typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),

    // 🔥 Fix ngrok warning page
    "ngrok-skip-browser-warning": "true",
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  // Don't set Content-Type for FormData (browser sets it with boundary)
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = "application/json";
  }

  const res = await fetch(`${API_URL}${endpoint}`, {
    ...options,
    headers,
  });

  const data = await res.json();

  if (!res.ok) {
    const error: any = new Error(data.error || "Something went wrong");
    error.code = data.code;
    error.status = res.status;
    // Attach any other properties returned from the backend
    Object.keys(data).forEach(key => {
      if (key !== 'error') {
        error[key] = data[key];
      }
    });
    throw error;
  }

  return data;
}

// Auth
export async function signup(email: string, password: string, name: string) {
  return api("/auth/signup", {
    method: "POST",
    body: JSON.stringify({ email, password, name }),
  });
}

export async function login(email: string, password: string) {
  return api("/auth/login", {
    method: "POST",
    body: JSON.stringify({ email, password }),
  });
}

export async function getProfile() {
  return api("/auth/profile");
}

export async function updateProfile(name: string, scoringCriteria?: string, webhookUrl?: string, webhookSecret?: string) {
  return api("/auth/update-profile", {
    method: "PUT",
    body: JSON.stringify({ name, scoringCriteria, webhookUrl, webhookSecret }),
  });
}

export async function changePassword(currentPassword: string, newPassword: string) {
  return api("/auth/change-password", {
    method: "PUT",
    body: JSON.stringify({ currentPassword, newPassword }),
  });
}

export async function deleteAccount() {
  return api("/auth/delete-account", {
    method: "DELETE",
  });
}

// Upload
export async function uploadCsv(file: File) {
  const formData = new FormData();
  formData.append("file", file);
  return api("/upload", {
    method: "POST",
    body: formData,
  });
}

// Analysis
export async function analyzeData(
  uploadId: string,
  data: Record<string, unknown>[],
  customPrompt?: string
) {
  return api("/analysis", {
    method: "POST",
    body: JSON.stringify({ uploadId, data, customPrompt }),
  });
}

export async function getAnalyses() {
  return api("/analysis");
}

export async function getAnalysis(id: string) {
  return api(`/analysis/${id}`);
}

export async function modifyAnalysis(id: string, customPrompt: string) {
  return api(`/analysis/${id}`, {
    method: "PUT",
    body: JSON.stringify({ customPrompt }),
  });
}

export async function chatAnalysis(id: string, question: string) {
  return api(`/analysis/${id}/chat`, {
    method: "POST",
    body: JSON.stringify({ question }),
  });
}

export async function togglePublicStatus(id: string) {
  return api(`/analysis/${id}/public`, {
    method: "PUT",
  });
}

export async function getPublicAnalysis(id: string) {
  return api(`/analysis/public/${id}`);
}

export async function generateEmailDraft(
  id: string,
  candidateName: string,
  candidateHighlight: string,
  candidateTakeaway: string,
  status: string
) {
  return api(`/analysis/${id}/email-draft`, {
    method: "POST",
    body: JSON.stringify({ candidateName, candidateHighlight, candidateTakeaway, status }),
  });
}

// Comparisons
export async function compareAnalyses(analysisId1: string, analysisId2: string) {
  return api("/analysis/compare", {
    method: "POST",
    body: JSON.stringify({ analysisId1, analysisId2 }),
  });
}

export async function getComparisons() {
  return api("/analysis/compare/history");
}

export async function getComparisonReport(id: string) {
  return api(`/analysis/compare/${id}`);
}

export async function exportAnalysisPDF(id: string) {
  const token = typeof window !== "undefined" ? localStorage.getItem("token") : null;
  if (!token) throw new Error("Not authenticated");
  
  // Directly navigate to the download URL. 
  // The browser will handle the download stream seamlessly.
  window.location.href = `${API_URL}/analysis/${id}/export?token=${token}`;
}

// Razorpay
export async function createCheckout() {
  return api("/razorpay/create-checkout", { method: "POST" });
}

export async function verifySubscription(paymentData: {
  razorpay_payment_id: string;
  razorpay_subscription_id: string;
  razorpay_signature: string;
}) {
  return api("/razorpay/verify-subscription", {
    method: "POST",
    body: JSON.stringify(paymentData),
  });
}

export async function getSubscription() {
  return api("/razorpay/subscription");
}

export async function createPortal() {
  return api("/razorpay/portal", { method: "POST" });
}

export async function cancelSubscription() {
  return api("/razorpay/cancel-subscription", { method: "POST" });
}

// Google
export async function getGoogleLoginUrl() {
  return api("/google/login-url");
}

export async function googleAuth(code: string) {
  return api("/google/auth", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function getGoogleAuthUrl() {
  return api("/google/auth-url");
}

export async function connectGoogle(code: string) {
  return api("/google/callback", {
    method: "POST",
    body: JSON.stringify({ code }),
  });
}

export async function listGoogleForms() {
  return api("/google/forms");
}

export async function analyzeGoogleForm(formId: string, customPrompt?: string) {
  return api("/google/analyze", {
    method: "POST",
    body: JSON.stringify({ formId, customPrompt }),
  });
}

export async function generateFormChat(question: string, history?: any[]) {
  return api("/google/generate-chat", {
    method: "POST",
    body: JSON.stringify({ question, history }),
  });
}

export async function publishForm(formDraft: any, chatHistory?: any[], id?: string) {
  return api("/google/publish", {
    method: "POST",
    body: JSON.stringify({ formDraft, chatHistory, id }),
  });
}

export async function getGeneratedForms() {
  return api("/google/generated-forms");
}

export async function getGeneratedForm(id: string) {
  return api(`/google/generated-forms/${id}`);
}

export async function deleteGeneratedForm(id: string) {
  return api(`/google/generated-forms/${id}`, { method: "DELETE" });
}

export async function deleteGoogleForm(formId: string) {
  return api(`/google/forms/${formId}`, { method: "DELETE" });
}

export async function disconnectGoogle() {
  return api("/google/disconnect", { method: "POST" });
}
