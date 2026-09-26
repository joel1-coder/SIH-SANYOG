import { ArrowRight, CalendarDays, CheckCircle2, Clock3, FileText, RefreshCw, Search, XCircle } from "lucide-react";
import { Link } from "wouter";
import { trpc } from "@/lib/trpc";

const formatTime = (value: string) => new Date(value).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
const statusLabel = (status: string) => status === "manual-review" ? "Manual review" : status === "completed" ? "Accepted & Completed" : status.replace("-", " ");
const deptStatusLabel = (status: string) => status === "success" ? "Accepted" : status === "failed" ? "Rejected" : status === "retrying" ? "Forwarded" : "Pending";

export default function Submissions() {
  const auth = trpc.auth.me.useQuery();
  const query = trpc.citizen.myRequests.useQuery(auth.data?.name ? { citizenName: auth.data.name } : undefined);
  const records = query.data?.success ? query.data.data : [];

  return <div className="page-container submissions-page">
    <div className="page-heading compact-heading" data-reveal><div><span className="section-label">Citizen workspace / History</span><h1>My submissions.</h1><p>Keep every certificate request in one place and jump back into its live status whenever you need.</p></div><Link href="/submit" className="button button-primary">New submission <ArrowRight size={16} /></Link></div>
    {query.isLoading && <div className="loading-state"><RefreshCw className="spin" size={22} /> Loading your submissions…</div>}
    {!query.isLoading && records.length === 0 && <div className="empty-state large-empty" data-reveal><div className="empty-icon"><Search size={23} /></div><h2>No submissions yet.</h2><p>Your submitted certificates will appear here with their recipient and current status.</p><Link href="/submit" className="button button-primary">Submit a certificate <ArrowRight size={16} /></Link></div>}
    {records.length > 0 && <div className="submission-history-grid">{records.map((record) => <article className="submission-history-card" data-reveal key={record.trackingId}><div className="submission-card-top"><div className="submission-type-icon"><FileText size={19} /></div><span className={`status-badge status-${record.overallStatus === "manual-review" ? "failed" : record.overallStatus === "partial" ? "partial" : record.overallStatus}`}>{statusLabel(record.overallStatus)}</span></div><span className="section-label">{record.trackingId}</span><h2>{record.requestType}</h2><p>{record.description}</p><div className="submission-meta"><span><CalendarDays size={14} /> {formatTime(record.timestamp)}</span><span><CheckCircle2 size={14} /> {record.statusPerDepartment.filter((item) => item.status === "success").length}/{record.statusPerDepartment.length} recipients acknowledged</span></div><div className="submission-recipients">{record.statusPerDepartment.map((item) => <span key={item.department} className={`status-badge status-${item.status}`}><span />{item.department}: {deptStatusLabel(item.status)}</span>)}</div><Link href={`/track/${record.trackingId}`} className="history-track-link">View live status <ArrowRight size={15} /></Link></article>)}</div>}
  </div>;
}

