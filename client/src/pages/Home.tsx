import { ArrowRight, CheckCircle2, ChevronRight, Clock3, FileCheck2, Fingerprint, Network, Play, ShieldCheck, Sparkles, UserRound, UsersRound, Zap, Moon, Sun } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";

const DEMO_STEPS = [
  { id: 1, title: "Citizen submits once", description: "Ananya submits a scholarship request. SANYOG normalizes it into one common data format — no duplicate forms.", icon: FileCheck2, color: "#2156c9", bg: "#e2ebfb" },
  { id: 2, title: "SANYOG routes automatically", description: "Connectors dispatch the normalized request to MahaDBT and Aaple Sarkar simultaneously. No manual copy-paste.", icon: Network, color: "#0d9488", bg: "#d9f1eb" },
  { id: 3, title: "Departments receive & act", description: "Each department portal receives the request in its own format. Officials approve, reject, or forward independently.", icon: CheckCircle2, color: "#ad6e12", bg: "#fff0d6" },
  { id: 4, title: "One tracking ID — full visibility", description: "The citizen tracks all department outcomes from a single SYN- ID. One connector failing doesn't hide others.", icon: ShieldCheck, color: "#6750b4", bg: "#e8e3fa" },
];

function GuidedDemoOverlay({ onClose }: { onClose: () => void }) {
  const [step, setStep] = useState(0);
  const [, navigate] = useLocation();
  const login = trpc.auth.demoLogin.useMutation({ onSuccess: () => { onClose(); navigate("/ai-assist"); } });
  const current = DEMO_STEPS[step];
  const Icon = current.icon;
  return (
    <div className="demo-overlay" onClick={onClose}>
      <div className="demo-modal" onClick={(e) => e.stopPropagation()}>
        <button className="demo-close" onClick={onClose} aria-label="Close">✕</button>
        <div className="demo-progress">{DEMO_STEPS.map((_, i) => <div key={i} className={`demo-progress-dot ${i === step ? "active" : i < step ? "done" : ""}`} />)}</div>
        <div className="demo-step-badge">Step {step + 1} of {DEMO_STEPS.length}</div>
        <div className="demo-flow-vis">
          <div className="dfv-node dfv-citizen"><UserRound size={14} /><span>Citizen</span></div>
          <div className={`dfv-pipe ${step >= 1 ? "dfv-pipe-active" : ""}`} />
          <div className={`dfv-node dfv-sanyog ${step >= 1 ? "dfv-active" : ""}`}><span className="brand-emblem" style={{ width: 22, height: 22, fontSize: 11, boxShadow: "none" }}>S</span><span>SANYOG</span></div>
          <div className={`dfv-pipe ${step >= 2 ? "dfv-pipe-active" : ""}`} />
          <div className="dfv-depts">
            {["MahaDBT", "Aaple Sarkar"].map((d, i) => (
              <div key={d} className={`dfv-dept ${step >= 2 ? (i === 0 ? "dfv-dept-success" : "dfv-dept-retry") : ""}`}>{d.replace("Aaple Sarkar", "Aaple Srk.")}<span className={`status-badge ${step >= 2 ? (i === 0 ? "status-success" : "status-retrying") : "status-pending"}`} style={{ fontSize: 7, padding: "2px 5px" }}>{step >= 2 ? (i === 0 ? "OK" : "↺") : "…"}</span></div>
            ))}
          </div>
        </div>
        <div className="demo-content">
          <div className="demo-icon" style={{ background: current.bg, color: current.color }}><Icon size={22} /></div>
          <h2 className="demo-title">{current.title}</h2>
          <p className="demo-desc">{current.description}</p>
        </div>
        <div className="demo-actions">
          {step > 0 && <button className="button button-ghost" onClick={() => setStep(s => s - 1)}>← Back</button>}
          <button className="button button-primary demo-next" onClick={() => step < DEMO_STEPS.length - 1 ? setStep(s => s + 1) : login.mutate({ role: "citizen" })} disabled={login.isPending}>
            {login.isPending ? "Launching…" : step < DEMO_STEPS.length - 1 ? "Next →" : "🚀 Try it live →"}
          </button>
        </div>
      </div>
    </div>
  );
}

function KpiCounter({ value, suffix = "", label }: { value: number; suffix?: string; label: string }) {
  const [displayed, setDisplayed] = useState(0);
  const ref = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const observer = new IntersectionObserver(([entry]) => {
      if (entry.isIntersecting) {
        let start = 0;
        const step = Math.ceil(value / 45);
        const timer = setInterval(() => { start += step; if (start >= value) { setDisplayed(value); clearInterval(timer); } else setDisplayed(start); }, 28);
        observer.disconnect();
      }
    }, { threshold: 0.4 });
    observer.observe(el);
    return () => observer.disconnect();
  }, [value]);
  return (
    <div ref={ref} className="kpi-card">
      <strong className="kpi-value">{displayed}{suffix}</strong>
      <span className="kpi-label">{label}</span>
    </div>
  );
}

const steps = [
  { number: "01", title: "Submit once", copy: "One citizen-friendly form captures the request, location, and supporting files.", icon: FileCheck2 },
  { number: "02", title: "Common format", copy: "SANYOG normalizes information into one consent-aware request schema.", icon: Network },
  { number: "03", title: "Auto-routed", copy: "Reusable connectors deliver only to the departments selected and allowed by rules.", icon: Zap },
  { number: "04", title: "Single tracking ID", copy: "Follow every department outcome from one timeline—even when a connector is down.", icon: ShieldCheck },
];

export default function Home() {
  const [showDemo, setShowDemo] = useState(false);
  const { theme, toggleTheme } = useTheme();
  return (
    <div className="landing-page">
      {showDemo && <GuidedDemoOverlay onClose={() => setShowDemo(false)} />}
      <header className="landing-nav">
        <Link href="/" className="brand-mark"><span className="brand-emblem">S</span><span><strong>SANYOG</strong><small>Unified government service layer</small></span></Link>
        <div className="landing-nav-actions">
          <button className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/track/SYN-7K2P4Q" className="text-link">Track a request</Link>
          <Link href="/judge" className="text-link" style={{ color: "#0d9488" }}><Sparkles size={13} /> Judge view</Link>
          <Link href="/login" className="button button-outline">Sign in <ArrowRight size={16} /></Link>
        </div>
      </header>
      <main>
        <section className="hero-section page-container">
          <div className="hero-copy">
            <div className="eyebrow"><span className="eyebrow-dot" /> SIH 2026 · Team S.A.K.E · Problem SIH26129</div>
            <h1>One submission.<br /><span>Every department.</span></h1>
            <p className="hero-lede">SANYOG is the middleware that lets a citizen submit once — and have the right government portals receive it automatically. No rebuilding. No repetition.</p>
            <div className="hero-actions">
              <button className="button button-primary" onClick={() => setShowDemo(true)}><Play size={15} fill="white" /> See how it works</button>
              <Link href="/login" className="button button-ghost">Official / Admin <ChevronRight size={17} /></Link>
            </div>
            <div className="hero-trust">
              <span><ShieldCheck size={16} /> Consent-gated sharing</span>
              <span><Fingerprint size={16} /> Hashed identity only</span>
              <span><Clock3 size={16} /> Live status visibility</span>
            </div>
          </div>
          <div className="hero-panel">
            <div className="panel-header"><span className="live-indicator"><span /> CONNECTOR MONITOR</span><span className="small-label">LIVE</span></div>
            <div className="hero-request">
              <div className="request-kicker"><span className="status-badge status-partial">PARTIAL SUCCESS</span><span>2 departments</span></div>
              <h3>Post-matric scholarship</h3>
              <p>Submitted by Ananya Deshmukh</p>
              <div className="request-id"><span>Tracking ID</span><strong>SYN-7K2P4Q</strong><Link href="/track/SYN-7K2P4Q">View <ArrowRight size={14} /></Link></div>
            </div>
            <div className="connector-list">
              <div className="connector-row"><span className="connector-avatar teal">DB</span><div><strong>MahaDBT</strong><small>External ref. DBT-2026-8812</small></div><span className="status-badge status-success">SUCCESS</span></div>
              <div className="connector-row"><span className="connector-avatar blue">AS</span><div><strong>Aaple Sarkar</strong><small>Attempt 1 of 3 · retrying</small></div><span className="status-badge status-retrying">RETRYING</span></div>
            </div>
            <div className="hero-panel-footer">
              <button className="button button-outline small-button" onClick={() => setShowDemo(true)}><Play size={11} fill="currentColor" /> Step-by-step demo</button>
              <Link href="/judge" className="button button-ghost small-button"><Sparkles size={11} /> Judge view</Link>
            </div>
          </div>
        </section>

        <section className="kpi-strip page-container">
          <KpiCounter value={50} suffix="%" label="Fewer cross-dept. follow-ups" />
          <KpiCounter value={24} suffix="h → 8h" label="Time-to-assignment target" />
          <KpiCounter value={3} label="Live department connectors" />
          <KpiCounter value={100} suffix="%" label="Audit log coverage" />
        </section>

        <section className="steps-section page-container">
          <div className="section-heading">
            <div><span className="section-label">How SANYOG works</span><h2>A simpler front door to public services.</h2></div>
            <p>Departments keep their own systems. SANYOG makes the handoff safer, clearer, and easier to follow.</p>
          </div>
          <div className="steps-grid">{steps.map(({ number, title, copy, icon: Icon }) => <div className="step-card" key={number}><div className="step-number">{number}</div><div className="step-icon"><Icon size={19} /></div><h3>{title}</h3><p>{copy}</p></div>)}</div>
        </section>

        <section className="access-section page-container">
          <div className="access-card citizen-card"><div className="access-icon"><UserRound size={21} /></div><div><span className="section-label">For citizens</span><h3>Submit and track without repeating yourself.</h3><p>Use a single form for scholarships, certificates, subsidies, and grievances.</p></div><Link href="/login" className="round-arrow"><ArrowRight size={18} /></Link></div>
          <div className="access-card official-card"><div className="access-icon"><UsersRound size={21} /></div><div><span className="section-label">For officials</span><h3>See the whole request, not just one portal.</h3><p>Act on assigned requests with SLA context and a complete audit trail.</p></div><Link href="/login" className="round-arrow"><ArrowRight size={18} /></Link></div>
        </section>

        <section className="privacy-strip"><div className="page-container privacy-inner"><ShieldCheck size={22} /><div><strong>Designed for responsible interoperability</strong><span>Only the normalized request travels. Aadhaar-linked identifiers are hashed and never forwarded to a connector.</span></div><Link href="/login" className="text-link">Explore the platform <ArrowRight size={15} /></Link></div></section>
      </main>
      <footer className="landing-footer page-container"><span><strong>SANYOG</strong> · Unified government service layer · SIH 2026</span><span>Connected, citizen-first governance</span></footer>
    </div>
  );
}
