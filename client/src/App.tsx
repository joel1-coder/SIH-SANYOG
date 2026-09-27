import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { Link, Route, Switch, useLocation } from "wouter";
import { Bell, ChevronRight, ClipboardList, LayoutDashboard, LogOut, Menu, Moon, Settings2, Sparkles, Sun, X } from "lucide-react";
import { useState } from "react";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import { useTheme } from "./contexts/ThemeContext";
import { trpc } from "./lib/trpc";
import Home from "./pages/Home";
import Login from "./pages/Login";
import Submit from "./pages/Submit";
import Track from "./pages/Track";
import Submissions from "./pages/Submissions";
import Dashboard from "./pages/Dashboard";
import Admin from "./pages/Admin";
import Judge from "./pages/Judge";
import AIAssist from "./pages/AIAssist";
import NotFound from "./pages/NotFound";

function Brand() {
  return <Link href="/" className="brand-mark"><span className="brand-emblem">S</span><span><strong>SANYOG</strong><small>Unified government service layer</small></span></Link>;
}

function AppShell({ children }: { children: React.ReactNode }) {
  const { user, logout } = useSession();
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const overviewQuery = trpc.admin.overview.useQuery(undefined, { refetchInterval: 5000 });
  const auditLog = overviewQuery.data?.data.auditLog ?? [];

  // Role-based nav: submissions only for citizens, AI assistant only for citizens
  const links = user?.role === "citizen"
    ? [
        { href: "/submit", label: "New submission", icon: ClipboardList },
        { href: "/submissions", label: "My submissions", icon: LayoutDashboard },
        { href: "/ai-assist", label: "AI Assistant", icon: Sparkles },
      ]
    : user?.role === "admin"
      ? [
          { href: "/dashboard", label: "Operations", icon: LayoutDashboard },
          { href: "/admin", label: "Admin controls", icon: Settings2 },
        ]
      : [
          // official
          { href: "/dashboard", label: "Assigned queue", icon: LayoutDashboard },
        ];

  const signOut = async () => { await logout(); navigate("/"); };

  return (
    <div className="app-shell">
      <header className="topbar">
        <div className="topbar-inner"><Brand />
          <button className="mobile-menu" onClick={() => setMobileOpen(!mobileOpen)} aria-label="Toggle navigation">{mobileOpen ? <X size={20} /> : <Menu size={20} />}</button>
          <nav className={mobileOpen ? "main-nav open" : "main-nav"}>
            {links.map(({ href, label, icon: Icon }) => (
              <Link key={href} href={href} onClick={() => setMobileOpen(false)} className="nav-link">
                <Icon size={16} />{label}
              </Link>
            ))}
            <Link href="/" className="nav-link muted"><ChevronRight size={15} />Public home</Link>
          </nav>
          <div className="topbar-actions" style={{ position: "relative" }}>
            <button className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme}>
              {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
            </button>
            <button className="icon-button" aria-label="Notifications" onClick={() => setNotifOpen(!notifOpen)}>
              <Bell size={17} />
              <span className="notification-dot" />
            </button>
            {notifOpen && (
              <div className="notification-popover" style={{ position: "absolute", top: "48px", right: "80px", width: "320px", background: "var(--card, #fff)", border: "1px solid var(--line)", borderRadius: "10px", boxShadow: "0 10px 30px rgba(0,0,0,0.12)", zIndex: 100, padding: "12px" }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: "8px", borderBottom: "1px solid var(--line)", paddingBottom: "8px" }}>
                  <strong style={{ fontSize: "12px" }}>Notifications &amp; Updates</strong>
                  <button style={{ border: 0, background: "transparent", cursor: "pointer" }} onClick={() => setNotifOpen(false)}><X size={14} /></button>
                </div>
                <div style={{ maxHeight: "260px", overflowY: "auto", display: "flex", flexDirection: "column", gap: "8px" }}>
                  {auditLog.length === 0 ? (
                    <span style={{ fontSize: "11px", color: "var(--muted)", textAlign: "center", padding: "12px" }}>No recent notifications</span>
                  ) : (
                    auditLog.slice(0, 8).map((entry) => {
                      const match = entry.metadata?.match(/(SYN-[A-Z0-9]+)/);
                      const trackingId = match ? match[1] : "SYN-7K2P4Q";
                      return (
                        <div
                          key={entry.id}
                          onClick={() => { setNotifOpen(false); navigate(`/track/${trackingId}`); }}
                          style={{ padding: "8px 10px", borderRadius: "6px", background: "var(--card, #f8faf9)", cursor: "pointer", display: "flex", flexDirection: "column", gap: "2px", borderLeft: entry.action.includes("APPROVE") ? "3px solid var(--teal)" : entry.action.includes("REJECT") ? "3px solid #ef4444" : "3px solid var(--blue)" }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: "11px", fontWeight: "600" }}>
                            <span>{entry.action.replace("OFFICIAL_", "").replace("_", " ")}</span>
                            <small style={{ fontSize: "9px", color: "var(--muted)" }}>{new Date(entry.timestamp).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}</small>
                          </div>
                          <span style={{ fontSize: "10px", color: "var(--muted)" }}>{entry.metadata}</span>
                        </div>
                      );
                    })
                  )}
                </div>
              </div>
            )}
            <div className="user-chip"><span className="avatar">{user?.name?.slice(0, 1) ?? "S"}</span><span className="user-chip-copy"><strong>{user?.name ?? "Demo visitor"}</strong><small>{user?.role ?? "preview"}</small></span></div>
            <button className="icon-button" onClick={signOut} aria-label="Sign out"><LogOut size={17} /></button>
          </div>
        </div>
      </header>
      <main className="app-main">{children}</main>
      <footer className="app-footer"><span>© 2026 SANYOG platform</span><span>Consent-gated · Connector-safe · Audit-ready</span></footer>
    </div>
  );
}

function useSession() {
  const meQuery = trpc.auth.me.useQuery(undefined, { retry: false, refetchOnWindowFocus: false });
  const logoutMutation = trpc.auth.logout.useMutation({ onSuccess: () => meQuery.refetch() });
  return { user: meQuery.data, loading: meQuery.isLoading, logout: () => logoutMutation.mutateAsync() };
}

function Router() {
  return <Switch>
    <Route path="/" component={Home} />
    <Route path="/login" component={Login} />
    <Route path="/submit"><AppShell><Submit /></AppShell></Route>
    <Route path="/track/:id"><AppShell><Track /></AppShell></Route>
    <Route path="/track"><AppShell><Track /></AppShell></Route>
    <Route path="/submissions"><AppShell><Submissions /></AppShell></Route>
    <Route path="/dashboard"><AppShell><Dashboard /></AppShell></Route>
    <Route path="/admin"><AppShell><Admin /></AppShell></Route>
    <Route path="/judge" component={Judge} />
    <Route path="/ai-assist"><AppShell><AIAssist /></AppShell></Route>
    <Route path="/404" component={NotFound} />
    <Route component={NotFound} />
  </Switch>;
}

export default function App() {
  return <ErrorBoundary><ThemeProvider defaultTheme="light" switchable><TooltipProvider><Toaster /><Router /></TooltipProvider></ThemeProvider></ErrorBoundary>;
}
