import { ArrowLeft, ArrowRight, Check, LockKeyhole, ShieldCheck, UserRound, UsersRound, Wrench, Moon, Sun } from "lucide-react";
import { useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import type { UserRole } from "@shared/types";
import { useTheme } from "@/contexts/ThemeContext";

const roles: { role: UserRole; title: string; copy: string; icon: typeof UserRound; next: string }[] = [
  { role: "citizen", title: "Citizen", copy: "Ask AI Assistant for certificates, fill basic details, and auto-submit to officials.", icon: UserRound, next: "/ai-assist" },
  { role: "official", title: "Official", copy: "Review assigned requests and act within SLA.", icon: UsersRound, next: "/dashboard" },
  { role: "admin", title: "Admin", copy: "Manage connectors, routing rules, and access.", icon: Wrench, next: "/admin" },
];

export default function Login() {
  const [, navigate] = useLocation();
  const [role, setRole] = useState<UserRole>("citizen");
  const { theme, toggleTheme } = useTheme();
  const login = trpc.auth.demoLogin.useMutation({ onSuccess: () => navigate(roles.find((item) => item.role === role)?.next ?? "/") });
  const selected = roles.find((item) => item.role === role)!;
  return (
    <div className="login-page">
      <div className="login-aside">
        <Link href="/" className="brand-mark light-brand">
          <span className="brand-emblem">S</span>
          <span>
            <strong>SANYOG</strong>
            <small>Unified government service layer</small>
          </span>
        </Link>
        <div className="login-aside-copy">
          <span className="eyebrow light-eyebrow">
            <span className="eyebrow-dot" /> Secure access
          </span>
          <h1>The public service layer, with one clear view.</h1>
          <p>Choose a role to explore the end-to-end SANYOG platform. Sessions use secure authentication.</p>
          <div className="aside-note">
            <ShieldCheck size={18} />
            <span>Consent is a hard requirement for every cross-department submission.</span>
          </div>
        </div>
        <div className="login-aside-footer">SANYOG / 2026</div>
      </div>
      <div className="login-main">
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "32px", width: "100%", maxWidth: "420px", marginLeft: "auto", marginRight: "auto" }}>
          <Link href="/" className="back-link" style={{ marginBottom: 0 }}>
            <ArrowLeft size={16} /> Back to public home
          </Link>
          <button className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme} style={{ border: "1px solid var(--line)", borderRadius: "8px", color: "var(--muted)", background: "transparent" }}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </div>
        <div className="login-card">
          <div className="login-card-heading">
            <span className="section-label">Welcome to SANYOG</span>
            <h2>Choose your workspace</h2>
            <p>Select your role to access the appropriate workspace.</p>
          </div>
          <div className="role-tabs">
            {roles.map(({ role: value, title, icon: Icon }) => (
              <button key={value} className={role === value ? "role-tab active" : "role-tab"} onClick={() => setRole(value)}>
                <Icon size={18} />
                <span>{title}</span>
                {role === value && <Check size={15} />}
              </button>
            ))}
          </div>
          <div className="selected-role">
            <div className="selected-role-icon">
              <selected.icon size={21} />
            </div>
            <div>
              <strong>{selected.title} workspace</strong>
              <p>{selected.copy}</p>
            </div>
          </div>
          <button className="button button-primary button-wide" onClick={() => login.mutate({ role })} disabled={login.isPending}>
            {login.isPending ? "Opening workspace…" : `Continue as ${selected.title}`}
            <ArrowRight size={17} />
          </button>
          <div className="login-security">
            <LockKeyhole size={15} />
            <span>Sessions are secure and encrypted. Your data is protected.</span>
          </div>
        </div>
      </div>
    </div>
  );
}
