import { Bot, ChevronRight, FileText, Loader2, Send, Sparkles, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { Moon, Sun } from "lucide-react";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface CertInfo {
  title: string;
  description: string;
  documents: string[];
  departments: string[];
  time: string;
  tip: string;
}

interface Message {
  id: string;
  role: "user" | "bot";
  text?: string;
  cert?: CertInfo;
  loading?: boolean;
}

const QUICK_PROMPTS = [
  "I need an Income Certificate",
  "How to apply for Community/Caste Certificate?",
  "What documents for Scholarship?",
  "Help me with Aadhaar correction",
  "I need a Domicile Certificate",
  "How to get a Birth Certificate?",
  "I need a PAN Card",
];

/* ── Certificate card ───────────────────────────────────────────────────── */
function CertCard({ cert }: { cert: CertInfo }) {
  return (
    <div className="ai-cert-card">
      <div className="ai-cert-header">
        <div className="ai-cert-icon"><FileText size={18} /></div>
        <div>
          <h3 className="ai-cert-title">{cert.title}</h3>
          <p className="ai-cert-desc">{cert.description}</p>
        </div>
      </div>
      <div className="ai-cert-section">
        <p className="ai-cert-section-label">📋 Documents Required</p>
        <ul className="ai-cert-docs">
          {cert.documents.map((doc, i) => (
            <li key={i}><ChevronRight size={11} />{doc}</li>
          ))}
        </ul>
      </div>
      <div className="ai-cert-meta-row">
        <div className="ai-cert-meta-item">
          <span className="ai-cert-meta-label">🏛️ Departments</span>
          <span className="ai-cert-meta-value">{cert.departments.join(", ")}</span>
        </div>
        <div className="ai-cert-meta-item">
          <span className="ai-cert-meta-label">⏱️ Processing Time</span>
          <span className="ai-cert-meta-value">{cert.time}</span>
        </div>
      </div>
      <div className="ai-cert-tip">
        <Sparkles size={12} /> <span>{cert.tip}</span>
      </div>
      <Link href="/submit" className="button button-primary ai-cert-apply">
        Apply via SANYOG → 
      </Link>
    </div>
  );
}

/* ── Message bubble ─────────────────────────────────────────────────────── */
function MessageBubble({ msg }: { msg: Message }) {
  if (msg.role === "user") {
    return (
      <div className="ai-msg ai-msg-user">
        <div className="ai-bubble ai-bubble-user">{msg.text}</div>
      </div>
    );
  }

  if (msg.loading) {
    return (
      <div className="ai-msg ai-msg-bot">
        <div className="ai-avatar"><Bot size={16} /></div>
        <div className="ai-bubble ai-bubble-bot ai-bubble-loading">
          <Loader2 size={16} className="ai-spin" />
          <span>Thinking…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-msg ai-msg-bot">
      <div className="ai-avatar"><Bot size={16} /></div>
      <div className="ai-bubble-bot-wrap">
        {msg.cert ? (
          <CertCard cert={msg.cert} />
        ) : (
          <div className="ai-bubble ai-bubble-bot">
            {msg.text?.split("\n").map((line, i) => (
              <span key={i}>
                {line.split(/\*\*(.*?)\*\*/g).map((part, j) =>
                  j % 2 === 1 ? <strong key={j}>{part}</strong> : part
                )}
                {i < (msg.text?.split("\n").length ?? 0) - 1 && <br />}
              </span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

/* ── Main Page ───────────────────────────────────────────────────────────── */
export default function AIAssist() {
  const { theme, toggleTheme } = useTheme();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Namaste! 🙏 I'm your SANYOG AI Assistant.\n\nI can help you understand **what documents you need** for government certificates and services. Just tell me what you need — I'll walk you through everything!\n\nTry asking:\n• \"I need an Income Certificate\"\n• \"What documents for Scholarship?\"\n• \"Help me with Aadhaar\"",
    },
  ]);
  const [input, setInput] = useState("");
  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const assist = trpc.citizen.aiAssist.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  const send = async (text: string) => {
    if (!text.trim()) return;
    const userMsg: Message = { id: Date.now().toString(), role: "user", text };
    const loadingId = Date.now().toString() + "-bot";
    setMessages((prev) => [...prev, userMsg, { id: loadingId, role: "bot", loading: true }]);
    setInput("");

    try {
      const result = await assist.mutateAsync({ message: text });
      const data = result.data as { type: string; cert?: CertInfo; message?: string };
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                id: loadingId,
                role: "bot",
                cert: data.type === "certificate" ? data.cert : undefined,
                text: data.type !== "certificate" ? data.message : undefined,
              }
            : m
        )
      );
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? { id: loadingId, role: "bot", text: "Sorry, something went wrong. Please try again." }
            : m
        )
      );
    }
  };

  return (
    <div className="ai-page">
      {/* ── Top nav ── */}
      <header className="landing-nav">
        <Link href="/" className="brand-mark">
          <span className="brand-emblem">S</span>
          <span><strong>SANYOG</strong><small>AI Certificate Assistant</small></span>
        </Link>
        <div className="landing-nav-actions">
          <button className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/submit" className="text-link">New Submission</Link>
          <Link href="/submissions" className="text-link">My Submissions</Link>
        </div>
      </header>

      <div className="ai-layout">
        {/* ── Sidebar ── */}
        <aside className="ai-sidebar">
          <div className="ai-sidebar-header">
            <div className="ai-sidebar-icon"><Sparkles size={16} /></div>
            <span>Quick Prompts</span>
          </div>
          <div className="ai-sidebar-prompts">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                className="ai-quick-prompt"
                onClick={() => { setInput(p); send(p); inputRef.current?.focus(); }}
              >
                {p}
              </button>
            ))}
          </div>
          <div className="ai-sidebar-tip">
            <Sparkles size={12} />
            <span>All certificate info is based on Maharashtra government guidelines.</span>
          </div>
        </aside>

        {/* ── Chat area ── */}
        <main className="ai-chat">
          <div className="ai-chat-header">
            <div className="ai-chat-header-icon"><Bot size={20} /></div>
            <div>
              <h1 className="ai-chat-title">Certificate Assistant</h1>
              <p className="ai-chat-subtitle">Ask me about any government certificate or scheme</p>
            </div>
            <div className="ai-live-badge"><span className="ai-live-dot" />Live</div>
          </div>

          <div className="ai-messages">
            {messages.map((msg) => (
              <MessageBubble key={msg.id} msg={msg} />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Input bar ── */}
          <form
            className="ai-input-bar"
            onSubmit={(e) => { e.preventDefault(); send(input); }}
          >
            <input
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Try: "I need to apply for an Income Certificate"'
              autoFocus
            />
            {input && (
              <button type="button" className="ai-clear-btn" onClick={() => setInput("")}>
                <X size={14} />
              </button>
            )}
            <button
              type="submit"
              className="ai-send-btn button button-primary"
              disabled={!input.trim() || assist.isPending}
            >
              {assist.isPending ? <Loader2 size={16} className="ai-spin" /> : <Send size={16} />}
              <span>Ask</span>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
