"use client";

import React, { useState, useEffect } from "react";
import {
  X,
  Mail,
  Send,
  CheckCircle2,
  AlertTriangle,
  Smartphone,
  Monitor,
  Copy,
  Check,
  RefreshCw,
  Sparkles,
  ExternalLink,
  Shield,
  Truck,
  FileText
} from "lucide-react";
import { EmailNotificationLog } from "@/lib/types/checkout";

interface NotificationCenterModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationCenterModal({
  isOpen,
  onClose
}: NotificationCenterModalProps) {
  const [logs, setLogs] = useState<EmailNotificationLog[]>([]);
  const [selectedLog, setSelectedLog] = useState<EmailNotificationLog | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isSendingTest, setIsSendingTest] = useState(false);
  const [activeTab, setActiveTab] = useState<"logs" | "preview" | "config">("logs");
  const [previewDevice, setPreviewDevice] = useState<"desktop" | "mobile">("desktop");
  const [copiedRawHtml, setCopiedRawHtml] = useState(false);
  const [testRecipient, setTestRecipient] = useState("client@apoorva.luxury");
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [configInfo, setConfigInfo] = useState<{
    resendConfigured: boolean;
    fromEmail: string;
    adminEmail: string;
  }>({
    resendConfigured: false,
    fromEmail: "APOORVA Atelier <onboarding@resend.dev>",
    adminEmail: "concierge@apoorva.luxury"
  });

  const fetchLogs = async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications/history");
      if (res.ok) {
        const data = await res.json();
        setLogs(data.logs || []);
        setConfigInfo({
          resendConfigured: data.resendConfigured,
          fromEmail: data.fromEmail,
          adminEmail: data.adminEmail
        });
        if (data.logs?.length > 0 && !selectedLog) {
          setSelectedLog(data.logs[0]);
        }
      }
    } catch (err) {
      console.error("Failed to fetch notification history", err);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchLogs();
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const handleTriggerTestEmail = async (
    type: "order_confirmation" | "admin_alert" | "shipping_dispatch" | "payment_failed"
  ) => {
    setIsSendingTest(true);
    setStatusMessage(null);
    try {
      const res = await fetch("/api/notifications/history", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, recipientEmail: testRecipient })
      });

      if (res.ok) {
        const data = await res.json();
        setStatusMessage(`✓ Triggered ${type.replace("_", " ")} notification successfully.`);
        await fetchLogs();
        setActiveTab("preview");
      } else {
        setStatusMessage("Error sending notification test.");
      }
    } catch (err) {
      setStatusMessage("Failed to communicate with notification service.");
    } finally {
      setIsSendingTest(false);
    }
  };

  const handleCopyRawHtml = () => {
    if (selectedLog?.htmlContent) {
      navigator.clipboard.writeText(selectedLog.htmlContent);
      setCopiedRawHtml(true);
      setTimeout(() => setCopiedRawHtml(false), 2000);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="notification-center-title"
      className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-6 bg-black/80 backdrop-blur-md animate-fadeIn"
    >
      <div className="relative w-full max-w-4xl h-[90vh] bg-white text-[#141414] rounded-3xl shadow-2xl border border-black/15 flex flex-col overflow-hidden">
        
        {/* Header */}
        <div className="px-6 py-4 bg-neutral-50 border-b border-black/10 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-2xl bg-black text-[#faf8f5] flex items-center justify-center font-mono">
              <Mail className="w-5 h-5 text-amber-200" />
            </div>
            <div>
              <h2 id="notification-center-title" className="font-mono font-bold text-sm uppercase tracking-wider text-black">
                EMAIL NOTIFICATION CENTER & DISPATCH DESK
              </h2>
              <div className="flex items-center gap-2 text-[10px] font-mono text-black/60">
                <span className="flex items-center gap-1 font-semibold text-emerald-800">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Resend API + Live Fallback Simulator
                </span>
                <span>•</span>
                <span>4 Triggers Configured</span>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchLogs}
              disabled={isLoading}
              className="p-2 rounded-full hover:bg-black/10 text-black/60 hover:text-black transition-colors"
              title="Refresh Logs"
            >
              <RefreshCw className={`w-4 h-4 ${isLoading ? "animate-spin" : ""}`} />
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-full hover:bg-black/10 text-black/60 hover:text-black transition-colors"
              title="Close modal"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* Navigation Tabs */}
        <div className="px-6 py-2.5 bg-neutral-100 border-b border-black/10 flex items-center justify-between font-mono text-xs">
          <div className="flex items-center gap-2">
            <button
              onClick={() => setActiveTab("logs")}
              className={`px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider text-[11px] transition-all ${
                activeTab === "logs"
                  ? "bg-black text-white"
                  : "bg-white/60 text-black/70 hover:bg-white hover:text-black"
              }`}
            >
              Sent Activity Logs ({logs.length})
            </button>

            <button
              onClick={() => setActiveTab("preview")}
              className={`px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider text-[11px] transition-all flex items-center gap-1.5 ${
                activeTab === "preview"
                  ? "bg-black text-white"
                  : "bg-white/60 text-black/70 hover:bg-white hover:text-black"
              }`}
            >
              <span>Email HTML Preview</span>
              {selectedLog && (
                <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              )}
            </button>

            <button
              onClick={() => setActiveTab("config")}
              className={`px-3.5 py-1.5 rounded-full font-bold uppercase tracking-wider text-[11px] transition-all ${
                activeTab === "config"
                  ? "bg-black text-white"
                  : "bg-white/60 text-black/70 hover:bg-white hover:text-black"
              }`}
            >
              API Credentials & Setup
            </button>
          </div>

          {activeTab === "preview" && (
            <div className="flex items-center gap-2">
              <div className="flex items-center bg-white/80 p-0.5 rounded-full border border-black/10">
                <button
                  onClick={() => setPreviewDevice("desktop")}
                  className={`p-1 rounded-full ${
                    previewDevice === "desktop" ? "bg-black text-white" : "text-black/60"
                  }`}
                  title="Desktop View"
                >
                  <Monitor className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => setPreviewDevice("mobile")}
                  className={`p-1 rounded-full ${
                    previewDevice === "mobile" ? "bg-black text-white" : "text-black/60"
                  }`}
                  title="Mobile View"
                >
                  <Smartphone className="w-3.5 h-3.5" />
                </button>
              </div>

              <button
                onClick={handleCopyRawHtml}
                className="px-2.5 py-1 bg-white border border-black/15 rounded-full text-[10px] font-bold uppercase tracking-wider flex items-center gap-1 hover:border-black transition-colors"
                title="Copy Raw HTML"
              >
                {copiedRawHtml ? <Check className="w-3 h-3 text-emerald-700" /> : <Copy className="w-3 h-3" />}
                <span>{copiedRawHtml ? "Copied" : "Copy HTML"}</span>
              </button>
            </div>
          )}
        </div>

        {/* Tab 1: Sent Activity Logs & Triggers */}
        {activeTab === "logs" && (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col font-mono text-xs">
            {/* Quick Trigger Suite */}
            <div className="p-4 bg-white/80 rounded-2xl border border-black/10 mb-6 space-y-3">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <div className="font-bold uppercase tracking-wider text-black text-[12px] flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-amber-700" />
                    <span>Test Notification Dispatch Suite</span>
                  </div>
                  <div className="text-[11px] text-black/60">
                    Send test emails to verify templates & real deliverability
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="email"
                    value={testRecipient}
                    onChange={(e) => setTestRecipient(e.target.value)}
                    placeholder="recipient@example.com"
                    className="bg-neutral-50 border border-black/15 rounded-xl px-3 py-1.5 text-xs text-black font-mono focus:outline-none focus:border-black"
                  />
                </div>
              </div>

              {/* 4 Triggers Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 pt-1">
                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={() => handleTriggerTestEmail("order_confirmation")}
                  className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-black/10 text-left transition-all hover:border-black active:scale-95 disabled:opacity-50"
                >
                  <div className="font-bold text-[11px] text-black flex items-center gap-1.5 mb-1">
                    <FileText className="w-3.5 h-3.5 text-emerald-800" />
                    <span>1. Customer Invoice</span>
                  </div>
                  <div className="text-[10px] text-black/60 leading-tight">
                    Order confirmation & tax breakdown
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={() => handleTriggerTestEmail("admin_alert")}
                  className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-black/10 text-left transition-all hover:border-black active:scale-95 disabled:opacity-50"
                >
                  <div className="font-bold text-[11px] text-black flex items-center gap-1.5 mb-1">
                    <Shield className="w-3.5 h-3.5 text-purple-700" />
                    <span>2. Admin Alert</span>
                  </div>
                  <div className="text-[10px] text-black/60 leading-tight">
                    Atelier acquisition & fulfillment notice
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={() => handleTriggerTestEmail("shipping_dispatch")}
                  className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-black/10 text-left transition-all hover:border-black active:scale-95 disabled:opacity-50"
                >
                  <div className="font-bold text-[11px] text-black flex items-center gap-1.5 mb-1">
                    <Truck className="w-3.5 h-3.5 text-blue-700" />
                    <span>3. Courier Dispatch</span>
                  </div>
                  <div className="text-[10px] text-black/60 leading-tight">
                    Blue Dart tracking & AWB number
                  </div>
                </button>

                <button
                  type="button"
                  disabled={isSendingTest}
                  onClick={() => handleTriggerTestEmail("payment_failed")}
                  className="p-3 bg-neutral-50 hover:bg-neutral-100 rounded-xl border border-black/10 text-left transition-all hover:border-black active:scale-95 disabled:opacity-50"
                >
                  <div className="font-bold text-[11px] text-black flex items-center gap-1.5 mb-1">
                    <AlertTriangle className="w-3.5 h-3.5 text-red-700" />
                    <span>4. Payment Recovery</span>
                  </div>
                  <div className="text-[10px] text-black/60 leading-tight">
                    Reservation held & 1-click retry
                  </div>
                </button>
              </div>

              {statusMessage && (
                <div className="text-[11px] font-semibold text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-lg border border-emerald-200">
                  {statusMessage}
                </div>
              )}
            </div>

            {/* Logs List */}
            <div className="flex-1 space-y-2">
              <div className="flex items-center justify-between text-[11px] text-black/60 uppercase tracking-wider font-bold px-1">
                <span>Recent Dispatches ({logs.length})</span>
                <span>Status & Timestamp</span>
              </div>

              {logs.length === 0 ? (
                <div className="p-12 text-center bg-white/50 rounded-2xl border border-black/10 text-black/50">
                  <Mail className="w-8 h-8 mx-auto mb-2 opacity-30" />
                  <p className="font-bold uppercase tracking-wider text-xs">No email notifications dispatched yet</p>
                  <p className="text-[11px] mt-1 max-w-sm mx-auto">
                    Complete a checkout or click any of the 4 test triggers above to test and view live emails.
                  </p>
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    onClick={() => {
                      setSelectedLog(log);
                      setActiveTab("preview");
                    }}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${
                      selectedLog?.id === log.id
                        ? "bg-white border-black shadow-md ring-1 ring-black"
                        : "bg-white/70 border-black/10 hover:bg-white hover:border-black/30"
                    }`}
                  >
                    <div className="flex items-start gap-3">
                      <div className={`p-2 rounded-xl flex-shrink-0 ${
                        log.type === "order_confirmation"
                          ? "bg-emerald-100 text-emerald-800"
                          : log.type === "admin_alert"
                          ? "bg-purple-100 text-purple-800"
                          : log.type === "shipping_dispatch"
                          ? "bg-blue-100 text-blue-800"
                          : "bg-red-100 text-red-800"
                      }`}>
                        {log.type === "order_confirmation" && <CheckCircle2 className="w-4 h-4" />}
                        {log.type === "admin_alert" && <Shield className="w-4 h-4" />}
                        {log.type === "shipping_dispatch" && <Truck className="w-4 h-4" />}
                        {log.type === "payment_failed" && <AlertTriangle className="w-4 h-4" />}
                      </div>

                      <div>
                        <div className="font-bold text-black text-xs">
                          {log.subject}
                        </div>
                        <div className="text-[11px] text-black/60 mt-0.5">
                          To: <strong className="text-black">{log.recipient}</strong> • Ref: #{log.orderId}
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 sm:self-center">
                      <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                        log.status === "delivered"
                          ? "bg-emerald-100 text-emerald-800"
                          : "bg-amber-100 text-amber-900"
                      }`}>
                        {log.status === "delivered" ? "✓ Delivered" : "⚡ Simulated Live"}
                      </span>

                      <span className="text-[10px] text-black/40">
                        {new Date(log.sentAt).toLocaleTimeString("en-IN", {
                          hour: "2-digit",
                          minute: "2-digit",
                          second: "2-digit"
                        })}
                      </span>

                      <button
                        className="p-1 rounded-full hover:bg-black/10 text-black/60"
                        title="View Preview"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* Tab 2: HTML Email Preview */}
        {activeTab === "preview" && (
          <div className="flex-1 bg-[#222222] p-4 flex flex-col overflow-hidden">
            {selectedLog ? (
              <div className="flex-1 flex flex-col h-full">
                {/* Email Metadata Bar */}
                <div className="px-4 py-2 bg-[#2d2d2d] rounded-t-xl border border-white/10 text-white font-mono text-xs flex flex-wrap items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <span className="text-[#888888]">Subject:</span>
                    <span className="font-bold text-white">{selectedLog.subject}</span>
                  </div>
                  <div className="flex items-center gap-3 text-[11px] text-[#aaaaaa]">
                    <span>To: <strong className="text-white">{selectedLog.recipient}</strong></span>
                    <span>Status: <strong className="text-emerald-400 uppercase">{selectedLog.status}</strong></span>
                  </div>
                </div>

                {/* Email Iframe Canvas */}
                <div className="flex-1 bg-[#1a1a1a] p-4 flex items-center justify-center overflow-auto rounded-b-xl border-x border-b border-white/10">
                  <div
                    className={`h-full transition-all duration-300 shadow-2xl bg-white rounded-lg overflow-hidden flex flex-col ${
                      previewDevice === "mobile" ? "w-[390px] border-8 border-black rounded-[36px]" : "w-full max-w-[700px]"
                    }`}
                  >
                    <iframe
                      srcDoc={selectedLog.htmlContent}
                      title="HTML Email Preview"
                      className="w-full flex-1 border-0"
                    />
                  </div>
                </div>
              </div>
            ) : (
              <div className="flex-1 flex items-center justify-center text-white/50 font-mono text-xs">
                Select an email from the Activity Logs tab to preview.
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Configuration & Keys Setup */}
        {activeTab === "config" && (
          <div className="flex-1 overflow-y-auto p-6 font-mono text-xs space-y-6">
            <div>
              <h3 className="text-sm font-bold uppercase tracking-wider text-black mb-1">
                ENVIRONMENT CONFIGURATION STATUS
              </h3>
              <p className="text-xs text-black/60">
                Check credentials status for Razorpay and Resend Email Service.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {/* Razorpay card */}
              <div className="p-4 bg-white/80 rounded-2xl border border-black/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold uppercase tracking-wider text-black">
                    Razorpay Gateway
                  </div>
                  <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900">
                    Active (Sandbox / Live Ready)
                  </span>
                </div>
                <p className="text-[11px] text-black/70">
                  Allows UPI (GPay, PhonePe, Paytm, QR), Cards, and NetBanking with HMAC-SHA256 signature verification.
                </p>
                <div className="p-2.5 bg-neutral-50 rounded-xl text-[10px] text-black/80 space-y-1">
                  <div><strong>Key ID:</strong> RAZORPAY_KEY_ID</div>
                  <div><strong>Key Secret:</strong> RAZORPAY_KEY_SECRET</div>
                  <div><strong>Public Key:</strong> NEXT_PUBLIC_RAZORPAY_KEY_ID</div>
                </div>
              </div>

              {/* Resend card */}
              <div className="p-4 bg-white/80 rounded-2xl border border-black/10 space-y-3">
                <div className="flex items-center justify-between">
                  <div className="font-bold uppercase tracking-wider text-black">
                    Resend Email System
                  </div>
                  <span className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold ${
                    configInfo.resendConfigured
                      ? "bg-emerald-100 text-emerald-800"
                      : "bg-amber-100 text-amber-900"
                  }`}>
                    {configInfo.resendConfigured ? "Live Connected" : "Sandbox Simulator"}
                  </span>
                </div>
                <p className="text-[11px] text-black/70">
                  Sends responsive, artisanal HTML invoices, admin alerts, courier tracking, and payment recovery notices.
                </p>
                <div className="p-2.5 bg-neutral-50 rounded-xl text-[10px] text-black/80 space-y-1">
                  <div><strong>Sender:</strong> {configInfo.fromEmail}</div>
                  <div><strong>Admin Desk:</strong> {configInfo.adminEmail}</div>
                  <div><strong>API Key:</strong> RESEND_API_KEY</div>
                </div>
              </div>
            </div>

            {/* Setup Guide */}
            <div className="p-4 bg-neutral-50 rounded-2xl border border-black/10 space-y-2">
              <div className="font-bold uppercase text-black">
                How to connect live production API keys:
              </div>
              <ol className="list-decimal list-inside space-y-1.5 text-black/80 text-[11px] leading-relaxed">
                <li>
                  Open <code className="bg-white px-1.5 py-0.5 rounded font-bold">.env.local</code> in your repository root.
                </li>
                <li>
                  Sign up for <a href="https://razorpay.com" target="_blank" rel="noreferrer" className="underline font-bold">Razorpay</a>, generate your API Key ID & Secret under <em>Dashboard &gt; Settings &gt; API Keys</em>.
                </li>
                <li>
                  Sign up for <a href="https://resend.com" target="_blank" rel="noreferrer" className="underline font-bold">Resend</a>, generate your API Key under <em>resend.com/api-keys</em>, and set <code className="bg-white px-1 py-0.5 rounded">RESEND_API_KEY</code>.
                </li>
                <li>
                  Restart your Next.js dev server with <code className="bg-white px-1 py-0.5 rounded">npm run dev</code>.
                </li>
              </ol>
            </div>
          </div>
        )}

      </div>
    </div>
  );
}
