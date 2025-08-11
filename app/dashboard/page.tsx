"use client";

import { useUser } from "@clerk/nextjs";
import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Separator } from "@/components/ui/separator";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Sparkles,
  Key,
  BarChart3,
  Clock,
  Zap,
  DollarSign,
  TrendingUp,
  Copy,
  Activity,
  Users,
  Globe,
  CheckCircle,
  AlertCircle,
  Plus,
  Edit,
  Trash2,
  Eye,
  EyeOff,
} from "lucide-react";

interface DashboardData {
  user: {
    name: string;
    email: string;
    plan: {
      displayName: string;
      name: string;
    };
    joinedAt: string;
  };
  usage: {
    freeUsage: {
      dailyUsed: number;
      monthlyUsed: number;
    };
    personalUsage: {
      dailyUsed: number;
      monthlyUsed: number;
      totalCost: number;
    };
    hasPersonalApiKeys: boolean;
    totalDailyUsage: number;
    totalMonthlyUsage: number;
  };
  quota: {
    dailyLimit: number;
    monthlyLimit: number;
    dailyRemaining: number;
    monthlyRemaining: number;
    isUnlimited: boolean;
  };
  history: Array<{
    id: string;
    originalText: string;
    enhancedText: string;
    provider: string;
    model: string;
    site: string;
    tokens: number;
    processingTime: number;
    requestType?: "free" | "personal";
    cost?: {
      inputTokens: number;
      outputTokens: number;
      totalCostUSD: number;
    };
    createdAt: string;
  }>;
  apiKeys: {
    openaiKeyInfo: {
      exists: boolean;
      masked?: string;
      isValid?: boolean;
      lastUpdated?: string;
    } | null;
    anthropicKeyInfo: {
      exists: boolean;
      masked?: string;
      isValid?: boolean;
      lastUpdated?: string;
    } | null;
  };
}

export default function Dashboard() {
  const { user, isLoaded } = useUser();
  const [data, setData] = useState<DashboardData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // API Key Management State
  const [apiKeyDialogOpen, setApiKeyDialogOpen] = useState(false);
  const [editingProvider, setEditingProvider] = useState<
    "openai" | "anthropic" | null
  >(null);
  const [apiKeyForm, setApiKeyForm] = useState({ openai: "", anthropic: "" });
  const [showApiKey, setShowApiKey] = useState({
    openai: false,
    anthropic: false,
  });
  const [apiKeyLoading, setApiKeyLoading] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [deletingProvider, setDeletingProvider] = useState<
    "openai" | "anthropic" | null
  >(null);

  useEffect(() => {
    if (isLoaded && user) {
      fetchDashboardData();
    }
  }, [isLoaded, user]);

  const fetchDashboardData = async () => {
    try {
      setLoading(true);

      // Fetch all data in parallel
      const [userRes, historyRes, quotaRes, apiKeysRes] = await Promise.all([
        fetch("/api/user"),
        fetch("/api/user/history"),
        fetch("/api/user/quota"),
        fetch("/api/user/api-keys"),
      ]);

      const [userData, historyData, quotaData, apiKeysData] = await Promise.all(
        [userRes.json(), historyRes.json(), quotaRes.json(), apiKeysRes.json()]
      );

      if (
        !userData.success ||
        !historyData.success ||
        !quotaData.success ||
        !apiKeysData.success
      ) {
        throw new Error("Failed to fetch dashboard data");
      }

      const dashboardData: DashboardData = {
        user: {
          name:
            (userData.data.firstName || "") +
            " " +
            (userData.data.lastName || ""),
          email: userData.data.email,
          plan: userData.data.plan,
          joinedAt: userData.data.createdAt,
        },
        usage: historyData.data.enhancedUsage,
        quota: quotaData.data,
        history: historyData.data.items.slice(0, 10),
        apiKeys: {
          openaiKeyInfo: apiKeysData.data.apiKeys.openaiKeyInfo,
          anthropicKeyInfo: apiKeysData.data.apiKeys.anthropicKeyInfo,
        },
      };

      setData(dashboardData);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to load dashboard");
    } finally {
      setLoading(false);
    }
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 4,
      maximumFractionDigits: 4,
    }).format(amount);
  };

  const formatDate = (date: string) => {
    return new Intl.DateTimeFormat("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit",
    }).format(new Date(date));
  };

  const copyToClipboard = async (text: string) => {
    try {
      await navigator.clipboard.writeText(text);
      // Could add toast notification here
    } catch (err) {
      console.error("Failed to copy:", err);
    }
  };

  // API Key Management Functions
  const openAddApiKeyDialog = (provider: "openai" | "anthropic") => {
    setEditingProvider(provider);
    setApiKeyForm({ openai: "", anthropic: "" });
    setApiKeyDialogOpen(true);
  };

  const openEditApiKeyDialog = async (provider: "openai" | "anthropic") => {
    setEditingProvider(provider);
    setApiKeyLoading(true);
    setApiKeyDialogOpen(true);

    try {
      // Fetch the current API key to edit
      const response = await fetch(`/api/user/api-keys?provider=${provider}`);
      const result = await response.json();

      if (result.success && result.data.apiKeys) {
        const key =
          provider === "openai"
            ? result.data.apiKeys.openaiKey
            : result.data.apiKeys.anthropicKey;
        setApiKeyForm((prev) => ({ ...prev, [provider]: key || "" }));
      }
    } catch (error) {
      console.error("Failed to fetch API key:", error);
    } finally {
      setApiKeyLoading(false);
    }
  };

  const saveApiKey = async () => {
    if (!editingProvider) return;

    setApiKeyLoading(true);
    try {
      const apiKey = apiKeyForm[editingProvider];

      const response = await fetch("/api/user/api-keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKeys: {
            [`${editingProvider}Key`]: apiKey,
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData();
        setApiKeyDialogOpen(false);
        setEditingProvider(null);
        setApiKeyForm({ openai: "", anthropic: "" });
      } else {
        throw new Error(result.error || "Failed to save API key");
      }
    } catch (error) {
      console.error("Failed to save API key:", error);
      setError(
        error instanceof Error ? error.message : "Failed to save API key"
      );
    } finally {
      setApiKeyLoading(false);
    }
  };

  const openDeleteDialog = (provider: "openai" | "anthropic") => {
    setDeletingProvider(provider);
    setDeleteDialogOpen(true);
  };

  const deleteApiKey = async () => {
    if (!deletingProvider) return;

    setApiKeyLoading(true);
    try {
      const response = await fetch("/api/user/api-keys", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          apiKeys: {
            [`${deletingProvider}Key`]: "",
          },
        }),
      });

      const result = await response.json();

      if (result.success) {
        // Refresh dashboard data
        await fetchDashboardData();
        setDeleteDialogOpen(false);
        setDeletingProvider(null);
      } else {
        throw new Error(result.error || "Failed to delete API key");
      }
    } catch (error) {
      console.error("Failed to delete API key:", error);
      setError(
        error instanceof Error ? error.message : "Failed to delete API key"
      );
    } finally {
      setApiKeyLoading(false);
    }
  };

  if (!isLoaded || loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="w-8 h-8 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="w-16 h-16 text-red-500 mx-auto mb-4" />
          <h1 className="text-2xl font-bold text-gray-900 mb-2">
            Something went wrong
          </h1>
          <p className="text-gray-600 mb-4">
            {error || "Failed to load dashboard"}
          </p>
          <Button
            onClick={fetchDashboardData}
            className="bg-emerald-600 hover:bg-emerald-700"
          >
            Try Again
          </Button>
        </div>
      </div>
    );
  }

  const freeQuotaProgress =
    data.quota.dailyLimit > 0
      ? ((data.quota.dailyLimit - data.quota.dailyRemaining) /
          data.quota.dailyLimit) *
        100
      : 0;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-br from-emerald-500 to-teal-600 rounded-lg flex items-center justify-center text-white font-bold text-lg">
                PE
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">
                  Prompt Enhancer
                </h1>
                <p className="text-sm text-gray-500">
                  AI Enhancement Dashboard
                </p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <Badge
                variant="secondary"
                className="bg-emerald-50 text-emerald-700 border-emerald-200"
              >
                {data.user.plan.displayName}
              </Badge>
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">
                  {data.user.name}
                </p>
                <p className="text-xs text-gray-500">{data.user.email}</p>
              </div>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-gray-900 mb-2">
            Welcome back, {data.user.name.split(" ")[0]}! 👋
          </h2>
          <p className="text-gray-600">
            Here&apos;s your prompt enhancement activity and usage insights.
          </p>
        </div>

        {/* Quick Stats Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
          <Card className="bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-emerald-600">
                    Today&apos;s Enhancements
                  </p>
                  <p className="text-3xl font-bold text-emerald-900">
                    {data.usage.totalDailyUsage}
                  </p>
                </div>
                <Sparkles className="w-8 h-8 text-emerald-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-blue-50 to-indigo-50 border-blue-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-blue-600">
                    This Month
                  </p>
                  <p className="text-3xl font-bold text-blue-900">
                    {data.usage.totalMonthlyUsage}
                  </p>
                </div>
                <TrendingUp className="w-8 h-8 text-blue-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-purple-50 to-violet-50 border-purple-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-purple-600">
                    Personal API Cost
                  </p>
                  <p className="text-3xl font-bold text-purple-900">
                    {formatCurrency(data.usage.personalUsage.totalCost)}
                  </p>
                </div>
                <DollarSign className="w-8 h-8 text-purple-500" />
              </div>
            </CardContent>
          </Card>

          <Card className="bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-amber-600">
                    Free Quota Left
                  </p>
                  <p className="text-3xl font-bold text-amber-900">
                    {data.quota.isUnlimited ? "∞" : data.quota.dailyRemaining}
                  </p>
                </div>
                <Activity className="w-8 h-8 text-amber-500" />
              </div>
            </CardContent>
          </Card>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column - Usage Analytics */}
          <div className="lg:col-span-2 space-y-6">
            {/* Usage Breakdown */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <BarChart3 className="w-5 h-5 text-emerald-500" />
                  Usage Analytics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Free Quota Progress */}
                <div>
                  <div className="flex justify-between items-center mb-2">
                    <span className="text-sm font-medium text-gray-700">
                      Free Quota Usage
                    </span>
                    <span className="text-sm text-gray-500">
                      {data.usage.freeUsage.dailyUsed}/{data.quota.dailyLimit}{" "}
                      today
                    </span>
                  </div>
                  <Progress value={freeQuotaProgress} className="h-2" />
                  <p className="text-xs text-gray-500 mt-1">
                    {data.quota.dailyRemaining} requests remaining today
                  </p>
                </div>

                <Separator />

                {/* Usage Breakdown */}
                <div className="grid grid-cols-2 gap-4">
                  <div className="bg-emerald-50 p-4 rounded-lg border border-emerald-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-emerald-500 rounded-full"></div>
                      <span className="text-sm font-medium text-emerald-700">
                        Free Requests
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-emerald-900">
                      {data.usage.freeUsage.dailyUsed}
                    </p>
                    <p className="text-xs text-emerald-600">
                      Today • {data.usage.freeUsage.monthlyUsed} this month
                    </p>
                  </div>

                  <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <div className="flex items-center gap-2 mb-2">
                      <div className="w-3 h-3 bg-blue-500 rounded-full"></div>
                      <span className="text-sm font-medium text-blue-700">
                        Personal API
                      </span>
                    </div>
                    <p className="text-2xl font-bold text-blue-900">
                      {data.usage.personalUsage.dailyUsed}
                    </p>
                    <p className="text-xs text-blue-600">
                      Today • {data.usage.personalUsage.monthlyUsed} this month
                    </p>
                  </div>
                </div>

                {data.usage.personalUsage.totalCost > 0 && (
                  <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <div className="flex justify-between items-center">
                      <div>
                        <p className="text-sm font-medium text-purple-700">
                          Personal API Costs
                        </p>
                        <p className="text-lg font-bold text-purple-900">
                          {formatCurrency(data.usage.personalUsage.totalCost)}{" "}
                          this month
                        </p>
                      </div>
                      <DollarSign className="w-6 h-6 text-purple-500" />
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Recent Activity */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Clock className="w-5 h-5 text-emerald-500" />
                  Recent Enhancements
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {data.history.length === 0 ? (
                    <div className="text-center py-8">
                      <Sparkles className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p className="text-gray-500">No enhancements yet</p>
                      <p className="text-sm text-gray-400">
                        Start using the extension to see your history here
                      </p>
                    </div>
                  ) : (
                    data.history.map((item) => (
                      <div
                        key={item.id}
                        className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors"
                      >
                        <div className="flex justify-between items-start mb-2">
                          <div className="flex items-center gap-2">
                            <Badge
                              variant={
                                item.requestType === "personal"
                                  ? "default"
                                  : "secondary"
                              }
                              className="text-xs"
                            >
                              {item.requestType === "personal"
                                ? "🔑 Personal"
                                : "🆓 Free"}
                            </Badge>
                            <Badge variant="outline" className="text-xs">
                              {item.provider}
                            </Badge>
                            <span className="text-xs text-gray-500">
                              {item.site}
                            </span>
                          </div>
                          <span className="text-xs text-gray-400">
                            {formatDate(item.createdAt)}
                          </span>
                        </div>

                        <div className="space-y-2">
                          <div>
                            <p className="text-xs font-medium text-gray-600">
                              Original:
                            </p>
                            <p className="text-sm text-gray-800 line-clamp-2">
                              {item.originalText}
                            </p>
                          </div>
                          <div>
                            <p className="text-xs font-medium text-gray-600">
                              Enhanced:
                            </p>
                            <p className="text-sm text-gray-800 line-clamp-2">
                              {item.enhancedText}
                            </p>
                          </div>
                        </div>

                        <div className="flex justify-between items-center mt-3 pt-3 border-t border-gray-100">
                          <div className="flex items-center gap-4 text-xs text-gray-500">
                            <span>⚡ {item.processingTime}ms</span>
                            <span>🔤 {item.tokens} tokens</span>
                            {item.cost && item.cost.totalCostUSD > 0 && (
                              <span>
                                💰 {formatCurrency(item.cost.totalCostUSD)}
                              </span>
                            )}
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => copyToClipboard(item.enhancedText)}
                            className="text-xs"
                          >
                            <Copy className="w-3 h-3 mr-1" />
                            Copy
                          </Button>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          {/* Right Column - API Keys & Status */}
          <div className="space-y-6">
            {/* API Keys Status */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Key className="w-5 h-5 text-emerald-500" />
                    API Keys
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => openAddApiKeyDialog("openai")}
                    className="text-xs"
                  >
                    <Plus className="w-3 h-3 mr-1" />
                    Add Key
                  </Button>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* OpenAI Key */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-green-100 rounded-full flex items-center justify-center">
                        <span className="text-green-600 font-bold text-xs">
                          AI
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">OpenAI</span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.apiKeys.openaiKeyInfo?.exists ? (
                        <Badge
                          variant={
                            data.apiKeys.openaiKeyInfo.isValid
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {data.apiKeys.openaiKeyInfo.isValid
                            ? "Active"
                            : "Invalid"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Not Set
                        </Badge>
                      )}
                    </div>
                  </div>

                  {data.apiKeys.openaiKeyInfo?.exists ? (
                    <div>
                      <p className="text-sm text-gray-600 font-mono mb-2">
                        {data.apiKeys.openaiKeyInfo.masked}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        Updated{" "}
                        {formatDate(
                          data.apiKeys.openaiKeyInfo.lastUpdated || ""
                        )}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditApiKeyDialog("openai")}
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog("openai")}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        No API key configured
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddApiKeyDialog("openai")}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add OpenAI Key
                      </Button>
                    </div>
                  )}
                </div>

                {/* Anthropic Key */}
                <div className="border border-gray-200 rounded-lg p-4">
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 bg-orange-100 rounded-full flex items-center justify-center">
                        <span className="text-orange-600 font-bold text-xs">
                          C
                        </span>
                      </div>
                      <span className="font-medium text-gray-900">
                        Anthropic
                      </span>
                    </div>
                    <div className="flex items-center gap-2">
                      {data.apiKeys.anthropicKeyInfo?.exists ? (
                        <Badge
                          variant={
                            data.apiKeys.anthropicKeyInfo.isValid
                              ? "default"
                              : "destructive"
                          }
                          className="text-xs"
                        >
                          {data.apiKeys.anthropicKeyInfo.isValid
                            ? "Active"
                            : "Invalid"}
                        </Badge>
                      ) : (
                        <Badge variant="secondary" className="text-xs">
                          Not Set
                        </Badge>
                      )}
                    </div>
                  </div>

                  {data.apiKeys.anthropicKeyInfo?.exists ? (
                    <div>
                      <p className="text-sm text-gray-600 font-mono mb-2">
                        {data.apiKeys.anthropicKeyInfo.masked}
                      </p>
                      <p className="text-xs text-gray-400 mb-3">
                        Updated{" "}
                        {formatDate(
                          data.apiKeys.anthropicKeyInfo.lastUpdated || ""
                        )}
                      </p>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openEditApiKeyDialog("anthropic")}
                          className="text-xs"
                        >
                          <Edit className="w-3 h-3 mr-1" />
                          Edit
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => openDeleteDialog("anthropic")}
                          className="text-xs text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="w-3 h-3 mr-1" />
                          Delete
                        </Button>
                      </div>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <p className="text-sm text-gray-500">
                        No API key configured
                      </p>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => openAddApiKeyDialog("anthropic")}
                        className="text-xs"
                      >
                        <Plus className="w-3 h-3 mr-1" />
                        Add Anthropic Key
                      </Button>
                    </div>
                  )}
                </div>
              </CardContent>
            </Card>

            {/* Account Info */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="w-5 h-5 text-emerald-500" />
                  Account Info
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-medium text-gray-600">Plan</p>
                    <div className="flex items-center gap-2">
                      <Badge
                        variant="secondary"
                        className="bg-emerald-50 text-emerald-700 border-emerald-200"
                      >
                        {data.user.plan.displayName}
                      </Badge>
                      {data.user.plan.name === "free" && (
                        <Button
                          variant="link"
                          size="sm"
                          className="text-xs h-auto p-0"
                        >
                          Upgrade
                        </Button>
                      )}
                    </div>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">
                      Member Since
                    </p>
                    <p className="text-sm text-gray-800">
                      {formatDate(data.user.joinedAt)}
                    </p>
                  </div>

                  <div>
                    <p className="text-sm font-medium text-gray-600">Status</p>
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-green-500" />
                      <span className="text-sm text-green-600">Active</span>
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Quick Actions */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Zap className="w-5 h-5 text-emerald-500" />
                  Quick Actions
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href="https://chat.openai.com" target="_blank">
                    <Globe className="w-4 h-4 mr-2" />
                    Open ChatGPT
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  asChild
                >
                  <a href="https://claude.ai" target="_blank">
                    <Globe className="w-4 h-4 mr-2" />
                    Open Claude
                  </a>
                </Button>
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={fetchDashboardData}
                >
                  <Activity className="w-4 h-4 mr-2" />
                  Refresh Data
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>

      {/* API Key Management Dialog */}
      <Dialog open={apiKeyDialogOpen} onOpenChange={setApiKeyDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {editingProvider &&
              (
                data.apiKeys[
                  `${editingProvider}KeyInfo` as keyof typeof data.apiKeys
                ] as { exists: boolean } | null
              )?.exists
                ? `Edit ${
                    editingProvider === "openai" ? "OpenAI" : "Anthropic"
                  } API Key`
                : `Add ${
                    editingProvider === "openai" ? "OpenAI" : "Anthropic"
                  } API Key`}
            </DialogTitle>
            <DialogDescription>
              {editingProvider === "openai"
                ? 'Enter your OpenAI API key. You can find this in your OpenAI dashboard under "API Keys".'
                : 'Enter your Anthropic API key. You can find this in your Anthropic Console under "API Keys".'}
            </DialogDescription>
          </DialogHeader>

          <div className="grid gap-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="apikey">
                {editingProvider === "openai"
                  ? "OpenAI API Key"
                  : "Anthropic API Key"}
              </Label>
              <div className="relative">
                <Input
                  id="apikey"
                  type={showApiKey[editingProvider!] ? "text" : "password"}
                  value={editingProvider ? apiKeyForm[editingProvider] : ""}
                  onChange={(e) =>
                    editingProvider &&
                    setApiKeyForm((prev) => ({
                      ...prev,
                      [editingProvider]: e.target.value,
                    }))
                  }
                  placeholder={
                    editingProvider === "openai" ? "sk-..." : "sk-ant-..."
                  }
                  className="pr-10"
                />
                <button
                  type="button"
                  onClick={() =>
                    editingProvider &&
                    setShowApiKey((prev) => ({
                      ...prev,
                      [editingProvider]: !prev[editingProvider],
                    }))
                  }
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  {showApiKey[editingProvider!] ? (
                    <EyeOff className="w-4 h-4" />
                  ) : (
                    <Eye className="w-4 h-4" />
                  )}
                </button>
              </div>
              <p className="text-xs text-gray-500">
                {editingProvider === "openai"
                  ? "Format: sk-... (48+ characters)"
                  : "Format: sk-ant-... (24+ characters)"}
              </p>
            </div>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <div className="flex items-start gap-2">
                <AlertCircle className="w-4 h-4 text-amber-600 mt-0.5 flex-shrink-0" />
                <div className="text-xs text-amber-700">
                  <p className="font-medium mb-1">Security Notice</p>
                  <p>
                    Your API key will be encrypted and stored securely. Only you
                    can access your keys.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setApiKeyDialogOpen(false);
                setEditingProvider(null);
                setApiKeyForm({ openai: "", anthropic: "" });
              }}
            >
              Cancel
            </Button>
            <Button
              onClick={saveApiKey}
              disabled={
                apiKeyLoading ||
                !editingProvider ||
                !apiKeyForm[editingProvider]?.trim()
              }
              className="bg-emerald-600 hover:bg-emerald-700"
            >
              {apiKeyLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Saving...
                </>
              ) : (
                "Save API Key"
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete API Key</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete your{" "}
              {deletingProvider === "openai" ? "OpenAI" : "Anthropic"} API key?
              This will remove the key from your account and you&apos;ll need to
              add it again to use personal API features.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={deleteApiKey}
              disabled={apiKeyLoading}
              className="bg-red-600 hover:bg-red-700"
            >
              {apiKeyLoading ? (
                <>
                  <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-2" />
                  Deleting...
                </>
              ) : (
                "Delete Key"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
