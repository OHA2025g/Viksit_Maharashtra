import React, { useEffect, useRef, useState } from "react";
import { api } from "@/lib/api";
import { PageHeader, SectionCard } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Bot, Send, Sparkles, User as UserIcon } from "lucide-react";
import { toast } from "sonner";
import { useI18n } from "@/contexts/I18nContext";

const SUGGESTED = [
  "Which themes are delayed?",
  "Show all red milestones under Urban Development.",
  "Prepare CM review note for this month.",
  "Which departments have not updated evidence?",
  "What are the top risks in Energy and Water?",
  "Which 2029 targets are at risk?",
  "Show district-wise lag in welfare outcomes.",
  "Generate executive summary for the Chief Secretary.",
  "Prepare a department-wise delay report.",
  "Show milestones where budget utilization is low.",
  // Agriculture-specific prompts
  "Which Agriculture milestones are delayed?",
  "Show all delayed Agriculture tasks under MSAMB.",
  "Which Agriculture departments have the highest delay?",
  "Prepare CM review note for Agriculture Initiative 1.1.",
  "Which Agriculture dependencies are creating cascading delays?",
  "Summarize Agriculture risks by department.",
];

export default function AICopilot() {
  const { t } = useI18n();
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef(null);

  useEffect(() => {
    setMessages([{ role: "assistant", content: t("copilot.welcome") }]);
  }, [t]);

  useEffect(() => {
    if (scrollRef.current) scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
  }, [messages, loading]);

  const send = async (prompt) => {
    const text = (prompt || input).trim();
    if (!text || loading) return;
    setMessages((m) => [...m, { role: "user", content: text }]);
    setInput("");
    setLoading(true);
    try {
      const { data } = await api.post("/copilot/chat", { prompt: text, session_id: "main" });
      setMessages((m) => [...m, { role: "assistant", content: data.response }]);
    } catch (e) {
      const msg = e.response?.data?.response || e.response?.data?.detail || t("copilot.unavailable");
      setMessages((m) => [...m, { role: "assistant", content: msg, error: true }]);
      toast.error(t("copilot.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <PageHeader eyebrowKey="page.copilot.eyebrow" titleKey="page.copilot.title" subtitleKey="page.copilot.subtitle" />

      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        <SectionCard titleKey="copilot.suggestedPrompts" className="lg:col-span-1">
          <div className="space-y-2">
            {SUGGESTED.map((p) => (
              <button
                key={p}
                onClick={() => send(p)}
                disabled={loading}
                data-testid={`suggested-prompt-${SUGGESTED.indexOf(p)}`}
                className="w-full text-left text-xs px-3 py-2.5 border border-slate-200 rounded-md hover:border-orange-300 hover:bg-orange-50/40 transition-colors text-slate-700"
              >
                {p}
              </button>
            ))}
          </div>
        </SectionCard>

        <SectionCard className="lg:col-span-3 p-0 overflow-hidden" title={null}>
          <div className="flex items-center gap-3 px-6 py-4 border-b border-slate-200 bg-slate-50">
            <div className="w-9 h-9 rounded-md bg-gradient-to-br from-[#F97316] to-[#0F172A] flex items-center justify-center">
              <Sparkles className="h-5 w-5 text-white" />
            </div>
            <div>
              <div className="text-sm font-semibold text-slate-900" style={{ fontFamily: "Manrope" }}>VM-2047 AI Copilot</div>
              <div className="text-[11px] text-slate-500">{t("copilot.poweredBy")}</div>
            </div>
            <span className="ml-auto inline-flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-green-700 bg-green-100 px-2 py-1 rounded-full font-semibold">
              <span className="w-1.5 h-1.5 rounded-full bg-green-500 animate-pulse" /> {t("copilot.online")}
            </span>
          </div>

          <div ref={scrollRef} className="h-[500px] overflow-y-auto px-6 py-6 space-y-4 bg-white">
            {messages.map((m, i) => (
              <div key={i} data-testid={`message-${i}`} className={`flex gap-3 ${m.role === "user" ? "justify-end" : ""}`}>
                {m.role === "assistant" && (
                  <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                    <Bot className="h-4 w-4" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-lg px-4 py-3 text-sm leading-relaxed ${
                  m.role === "user"
                    ? "bg-[#0F172A] text-white"
                    : m.error
                      ? "bg-red-50 border border-red-200 text-red-700"
                      : "bg-slate-100 text-slate-800"
                }`}>
                  <div className="whitespace-pre-wrap">{m.content}</div>
                </div>
                {m.role === "user" && (
                  <div className="w-8 h-8 rounded-md bg-orange-500 text-white flex items-center justify-center flex-shrink-0">
                    <UserIcon className="h-4 w-4" />
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex gap-3">
                <div className="w-8 h-8 rounded-md bg-slate-900 text-white flex items-center justify-center flex-shrink-0">
                  <Bot className="h-4 w-4" />
                </div>
                <div className="bg-slate-100 rounded-lg px-4 py-3">
                  <div className="flex gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.15s" }} />
                    <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce" style={{ animationDelay: "0.3s" }} />
                  </div>
                </div>
              </div>
            )}
          </div>

          <form
            onSubmit={(e) => { e.preventDefault(); send(); }}
            className="border-t border-slate-200 px-6 py-4 bg-slate-50 flex gap-2"
          >
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder={t("copilot.placeholder")}
              disabled={loading}
              data-testid="copilot-input"
              className="bg-white"
            />
            <Button type="submit" disabled={loading || !input.trim()} data-testid="copilot-send" className="bg-[#0F172A]">
              <Send className="h-4 w-4" />
            </Button>
          </form>
        </SectionCard>
      </div>
    </div>
  );
}
