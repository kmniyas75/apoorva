"use client";

import React, { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { Sparkles, X, Send, Loader2 } from "lucide-react";
import {
  initFirebaseAnalytics,
  trackApoorvaEvent
} from "@/lib/firebase/client";

interface ChatTurn {
  role: "user" | "model";
  text: string;
}

const QUICK_PROMPTS = [
  "Style A vs Style B cup fit?",
  "Set 01 Coir vs Set 02 Jute?",
  "How fast is delivery?"
];

export default function FirebaseAnalytics() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [messages, setMessages] = useState<ChatTurn[]>([
    {
      role: "model",
      text: "Namaskaram! I’m your APOORVA AI Coastal Stylist (powered by Gemini). Ask me about Style A vs Style B coconut cup contours, Coir vs Jute skirts, or sizing!"
    }
  ]);

  useEffect(() => {
    void initFirebaseAnalytics().then(() => {
      void trackApoorvaEvent("page_view", {
        page_path: pathname || "/"
      });
    });
  }, [pathname]);

  // Hide floating AI stylist bubble on /admin so admin controls stay unobstructed
  if (pathname?.startsWith("/admin")) {
    return null;
  }

  const sendPrompt = async (promptText: string) => {
    const trimmed = promptText.trim();
    if (!trimmed || loading) return;

    const nextHistory: ChatTurn[] = [
      ...messages,
      { role: "user", text: trimmed }
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
          history: messages
        })
      });
      const data = await res.json();
      setMessages([
        ...nextHistory,
        {
          role: "model",
          text:
            data.reply ||
            "Our Aluva atelier team recommends Set 01 (Coir Fringe) for beach bonfire parties and Set 02 (Jute Wrap) for resort poolside lounging."
        }
      ]);
    } catch {
      setMessages([
        ...nextHistory,
        {
          role: "model",
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
        <div className="w-[calc(100vw-1.5rem)] max-w-[350px] bg-white border border-black/15 rounded-2xl shadow-2xl overflow-hidden flex flex-col">
          <div className="bg-[#141414] text-white px-4 py-3 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="w-6 h-6 rounded-full bg-amber-400 text-black flex items-center justify-center">
                <Sparkles className="w-3.5 h-3.5" />
              </span>
              <div>
                <p className="text-xs font-bold tracking-wider uppercase">
                  APOORVA AI Stylist
                </p>
                <p className="text-[10px] text-white/65 font-mono">
                  Gemini Flash • Kerala Atelier
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

          <div className="p-3 space-y-2.5 max-h-[260px] overflow-y-auto bg-[#FAF8F5] text-xs leading-relaxed">
            {messages.map((m, idx) => (
              <div
                key={idx}
                className={`p-2.5 rounded-xl ${
                  m.role === "user"
                    ? "bg-[#141414] text-white ml-6"
                    : "bg-white border border-black/10 text-[#141414] mr-4 shadow-xs"
                }`}
              >
                {m.text}
              </div>
            ))}
            {loading && (
              <div className="flex items-center gap-2 text-[11px] text-neutral-500 px-2 py-1">
                <Loader2 className="w-3.5 h-3.5 animate-spin text-amber-600" />
                Consulting Aluva Atelier...
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
              placeholder="Ask about cup style, sizing, or sets..."
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
          <span>AI Stylist</span>
        </button>
      )}
    </div>
  );
}
