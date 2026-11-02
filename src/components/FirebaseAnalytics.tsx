"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Loader2, CreditCard } from "lucide-react";
import {
  initFirebaseAnalytics,
  trackApoorvaEvent
} from "@/lib/firebase/client";

interface ChatTurn {
  id?: string;
  sender: "customer" | "ai" | "admin";
  text: string;
  paymentLink?: string;
  orderId?: string;
}

const QUICK_PROMPTS = [
  "Buy BOTH sets (15% OFF)",
  "Style A vs Style B cup fit?",
  "Book Set 01 — send payment link"
];

export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string>("");
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      sender: "ai",
      text: "Namaskaram! 🌴 I’m your APOORVA SHELLS AI Sales Concierge (Aluva, Kerala). Tell me which beachwear set you love (Set 01 Coir ₹4,200, Set 02 Jute ₹4,500, or Both at ₹7,395 with 15% OFF) and share your delivery address + PIN code to get your instant 1-Click Razorpay payment link right here!"
    }
  ]);

  useEffect(() => {
    void initFirebaseAnalytics().then(() => {
      void trackApoorvaEvent("page_view", {
        page_path: pathname || "/"
      });
    });

    if (typeof window !== "undefined") {
      let storedId = window.localStorage.getItem("apoorva_web_chat_session_id");
      if (!storedId) {
        storedId = `chat-website-${Math.floor(100000 + Math.random() * 900000)}`;
        window.localStorage.setItem("apoorva_web_chat_session_id", storedId);
      }
      setSessionId(storedId);
    }
  }, [pathname]);

  // Poll for live Admin replies when chat window is open
  useEffect(() => {
    if (!open || !sessionId) return;
    const loadSession = async () => {
      try {
        const res = await fetch(
          `/api/ai/concierge?sessionId=${encodeURIComponent(sessionId)}`,
          { cache: "no-store" }
        );
        const data = await res.json();
        if (
          data?.session?.messages &&
          Array.isArray(data.session.messages) &&
          data.session.messages.length > 0
        ) {
          setMessages(data.session.messages);
        }
      } catch {
        // ignore background poll errors
      }
    };
    void loadSession();
    const interval = setInterval(() => {
      void loadSession();
    }, 5000);
    return () => clearInterval(interval);
  }, [open, sessionId]);

  // Hide floating AI stylist bubble on /admin so admin controls stay unobstructed
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const nextHistory: ChatTurn[] = [
      ...messages,
      { sender: "customer", text: trimmed }
    ];
    setMessages(nextHistory);
    setInput("");
    setLoading(true);
    void trackApoorvaEvent("ai_concierge_query", { query: trimmed });

    try {
      const res = await fetch("/api/ai/concierge", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: trimmed,
          sessionId,
          visitorHandle: sessionId,
          visitorName: `Website Visitor #${sessionId.slice(-4)}`
        })
      });
      const data = await res.json();
      if (
        data?.session?.messages &&
        Array.isArray(data.session.messages) &&
        data.session.messages.length > 0
      ) {
        setMessages(data.session.messages);
      } else {
        setMessages([
          ...nextHistory,
          {
            sender: "ai",
            text:
              data.reply ||
              "Share your preferred set (Set 01, Set 02, or Both) and your delivery address + 6-digit PIN code for an instant Razorpay payment link!",
            paymentLink: data.paymentLink,
            orderId: data.order?.orderId
          }
        ]);
      }
    } catch {
      setMessages([
        ...nextHistory,
        {
          sender: "ai",
          text: "Both Set 01 (₹4,200) and Set 02 (₹4,500) include cotton-lined coconut cups and adjustable XS–XL waist ties with Free Express Delivery."
        }
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed right-3 sm:right-5 z-40"
      style={{ bottom: "max(0.85rem, env(safe-area-inset-bottom))" }}
    >
      {open ? (
        <div className="w-[calc(100vw-1.5rem)] max-w-[365px] bg-white border border-black/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wider uppercase">
                  APOORVA SHELLS AI Sales Agent
                </p>
                <p className="text-[10px] text-white/65 font-mono">
                  Order & Pay in Chat • Live Concierge
                </p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="p-1 rounded-lg text-white/70 hover:text-white hover:bg-white/10 transition"
              aria-label="Close AI Stylist"
            >
              <X className="w-4 h-4" />
            </button>
          </div>

          <div className="p-3 space-y-2.5 max-h-[290px] overflow-y-auto bg-[#FAF8F5] text-xs leading-relaxed">
            {messages.map((m, idx) => (
              <div
                key={m.id || idx}
                className={`p-2.5 rounded-xl whitespace-pre-wrap ${
                  m.sender === "customer"
                    ? "bg-[#141414] text-white ml-6"
                    : m.sender === "admin"
                      ? "bg-emerald-950 text-white border border-emerald-500/40 mr-4 shadow-xs"
                      : "bg-white border border-black/10 text-[#141414] mr-4 shadow-xs"
                }`}
              >
                {m.sender === "admin" && (
                  <div className="text-[9px] font-mono uppercase tracking-wider text-emerald-300 mb-1">
                    ● Apoorva Atelier Team (Live)
                  </div>
                )}
                <div>{m.text}</div>
                {m.paymentLink && (
                  <a
                    href={m.paymentLink}
                    className="mt-2.5 w-full inline-flex items-center justify-center gap-1.5 px-3 py-2 rounded-lg bg-amber-400 hover:bg-amber-300 text-black font-bold text-[11px] uppercase tracking-wider transition shadow-sm"
                  >
                    <CreditCard className="w-3.5 h-3.5" />
                    Pay Now via Razorpay {m.orderId ? `(#${m.orderId})` : ""}
                  </a>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 px-2 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                Preparing your beachwear recommendation...
              </div>
            )}
          </div>

          <div className="px-3 py-2 bg-white border-t border-black/5 flex gap-1.5 overflow-x-auto no-scrollbar">
            {QUICK_PROMPTS.map((q) => (
              <button
                key={q}
                type="button"
                onClick={() => void sendPrompt(q)}
                className="shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full bg-amber-50 hover:bg-amber-100 text-amber-950 border border-amber-300/70 transition"
              >
                {q}
              </button>
            ))}
          </div>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              void sendPrompt(input);
            }}
            className="p-2.5 bg-white border-t border-black/10 flex items-center gap-2"
          >
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Reply with set, address & PIN code..."
              className="flex-1 text-xs px-3 py-2 rounded-xl border border-black/15 focus:outline-none focus:border-black"
            />
            <button
              type="submit"
              disabled={loading || !input.trim()}
              className="p-2 rounded-xl bg-[#141414] text-white disabled:opacity-40 hover:bg-neutral-800 transition"
              aria-label="Send message"
            >
              <Send className="w-3.5 h-3.5" />
            </button>
          </form>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => {
            setOpen(true);
            void trackApoorvaEvent("ai_concierge_opened");
          }}
          className="flex items-center gap-2 px-3.5 py-2.5 rounded-full bg-[#141414] text-white border border-white/15 shadow-xl hover:bg-neutral-800 transition text-xs font-mono tracking-wider uppercase"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-400" />
          <span>AI Sales Chat</span>
        </button>
      )}
    </div>
  );
}
