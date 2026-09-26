import {
  ArrowUpRight,
  Check,
  ChevronDown,
  Clock3,
  Filter,
  Forward,
  MapPin,
  MoreHorizontal,
  RefreshCw,
  Search,
  ShieldAlert,
  Timer,
  X,
  Map as MapIcon,
  Layers,
  Sparkles,
  Bot,
  Table as TableIcon,
} from "lucide-react";
import { useState } from "react";
import { useLocation } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Priority } from "@shared/types";
import InteractiveLeafletMap from "@/components/InteractiveLeafletMap";

const formatAge = (value: string) => {
  const hours = Math.max(0, Math.round((new Date(value).getTime() - Date.now()) / 3600000));
  return hours > 0 ? `${hours}h remaining` : "SLA due";
};

export default function Dashboard() {
  const [, navigate] = useLocation();
  const [department, setDepartment] = useState("MahaDBT");
  const [priority, setPriority] = useState<Priority | "All">("All");
  const [location, setLocation] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "map" | "clusters">("table");

  const dashboard = trpc.official.dashboard.useQuery(
    { department, priority, location },
    { refetchOnWindowFocus: false }
  );
  const catalog = trpc.catalog.bootstrap.useQuery();
  const action = trpc.official.action.useMutation({
    onSuccess: (res, variables) => {
      dashboard.refetch();
      if (variables.action === "Approve") {
        toast.success(`Request ${variables.trackingId} Accepted`, {
          description: `Approved by ${variables.department}. Status updated & notification sent to user.`,
        });
      } else if (variables.action === "Reject") {
        toast.error(`Request ${variables.trackingId} Rejected`, {
          description: `Rejected by ${variables.department}. Status updated & notification sent to user.`,
        });
      } else if (variables.action === "Forward") {
        toast.info(`Request ${variables.trackingId} Forwarded`, {
          description: `Forwarded to the next department queue.`,
        });
      }
    },
    onError: (err) => {
      toast.error("Action failed", { description: err.message });
    },
  });

  const rows = dashboard.data?.data.requests ?? [];
  const clusters = (dashboard.data?.data as any)?.clusters ?? [];
  const analytics = dashboard.data?.data.analytics ?? {
    totalRequests: 0,
    slaCompliance: 0,
    avgResolutionHours: 0,
  };

  const mapMarkers = rows.map((r) => ({
    id: r.trackingId,
    title: `${r.requestType} · ${r.citizenName}`,
    location: r.location,
    status: r.statusPerDepartment.find((s) => s.department === department)?.status ?? r.overallStatus,
    priority: r.priority,
  }));

  return (
    <div className="page-container dashboard-page">
      <div className="page-heading dashboard-heading">
        <div>
          <span className="section-label">Official workspace / Operations</span>
          <h1>Good morning, Rahul.</h1>
          <p>Review assigned requests, inspect geospatial incident clusters, and leverage NLP grouping.</p>
        </div>
        <div className="dashboard-date">
          <span className="live-indicator">
            <span /> LIVE QUEUE
          </span>
          <small>
            {new Date().toLocaleDateString([], { weekday: "long", month: "short", day: "numeric" })}
          </small>
        </div>
      </div>

      <div className="analytics-grid">
        <div className="analytics-card">
          <div className="analytics-icon blue">
            <Filter size={18} />
          </div>
          <span>Total requests</span>
          <strong>{analytics.totalRequests}</strong>
          <small>
            <ArrowUpRight size={13} /> 18% vs. last month
          </small>
        </div>
        <div className="analytics-card">
          <div className="analytics-icon teal">
            <Check size={18} />
          </div>
          <span>SLA compliance</span>
          <strong>{analytics.slaCompliance}%</strong>
          <small>
            <ArrowUpRight size={13} /> 4.2 pts this week
          </small>
        </div>
        <div className="analytics-card">
          <div className="analytics-icon amber">
            <Clock3 size={18} />
          </div>
          <span>Avg. resolution time</span>
          <strong>{analytics.avgResolutionHours}h</strong>
          <small>Across completed requests</small>
        </div>
        <div className="analytics-card alert-card">
          <div className="analytics-icon red">
            <ShieldAlert size={18} />
          </div>
          <span>Semantic Clusters</span>
          <strong>{clusters.length || rows.length}</strong>
          <small>NLP Similarity Groups</small>
        </div>
      </div>

      <div className="toolbar">
        <div className="toolbar-title">
          <span className="section-label">Assigned requests</span>
          <h2>Department queue</h2>
        </div>
        <div className="filter-row">
          <div className="flex bg-slate-100 p-1 rounded-lg border border-slate-200 gap-1 mr-2">
            <button
              type="button"
              onClick={() => setViewMode("table")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-all ${
                viewMode === "table" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <TableIcon size={13} /> Queue
            </button>
            <button
              type="button"
              onClick={() => setViewMode("map")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-all ${
                viewMode === "map" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <MapIcon size={13} /> Geo Map
            </button>
            <button
              type="button"
              onClick={() => setViewMode("clusters")}
              className={`flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-md cursor-pointer transition-all ${
                viewMode === "clusters" ? "bg-white text-blue-700 shadow-xs" : "text-slate-600 hover:text-slate-900"
              }`}
            >
              <Bot size={13} /> NLP Clusters
            </button>
          </div>

          <label className="select-wrap">
            <span>Department</span>
            <select value={department} onChange={(event) => setDepartment(event.target.value)}>
              {(catalog.data?.data.departments ?? []).map((item) => (
                <option key={item.id}>{item.name}</option>
              ))}
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="select-wrap">
            <span>Priority</span>
            <select
              value={priority}
              onChange={(event) => setPriority(event.target.value as Priority | "All")}
            >
              <option>All</option>
              <option>High</option>
              <option>Medium</option>
              <option>Low</option>
            </select>
            <ChevronDown size={14} />
          </label>
          <label className="search-wrap">
            <Search size={15} />
            <input
              value={location}
              onChange={(event) => setLocation(event.target.value)}
              placeholder="Filter location"
            />
          </label>
          <button
            className="icon-button bordered"
            onClick={() => dashboard.refetch()}
            aria-label="Refresh"
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {viewMode === "map" ? (
        <div className="table-card p-4">
          <div className="flex items-center justify-between mb-3">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                <MapPin size={16} className="text-blue-600" />
                Geospatial Incident Map ({rows.length} Active Points)
              </h3>
              <p className="text-xs text-slate-500">
                Visualizing geo-tagged requests across Maharashtra. Click any pin to view details.
              </p>
            </div>
          </div>
          <InteractiveLeafletMap
            location={{ lat: 19.076, lng: 72.8777, address: "Maharashtra" }}
            onChange={() => {}}
            height="460px"
            readonly={true}
            markers={mapMarkers}
          />
        </div>
      ) : viewMode === "clusters" ? (
        <div className="table-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="font-semibold text-slate-800 flex items-center gap-1.5 text-sm">
                <Sparkles size={16} className="text-amber-500" />
                NLP Semantic Clusters (Indic Sentence Embeddings + Cosine Similarity)
              </h3>
              <p className="text-xs text-slate-500">
                Similar citizen grievances grouped by semantic meaning rather than exact keywords.
              </p>
            </div>
            <span className="text-xs font-medium px-2 py-1 bg-amber-50 text-amber-800 rounded border border-amber-200">
              Cosine Similarity Threshold: ≥ 0.55
            </span>
          </div>

          <div className="grid gap-3">
            {clusters.length === 0 ? (
              <p className="text-xs text-slate-500 py-6 text-center">No clusters formed yet.</p>
            ) : (
              clusters.map((c: any) => (
                <div
                  key={c.clusterId}
                  className="border border-slate-200 rounded-xl p-3 bg-slate-50/50 hover:bg-white transition-all"
                >
                  <div className="flex items-start justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="text-xs font-bold text-slate-900 bg-white px-2 py-0.5 rounded border border-slate-200">
                          {c.requestType}
                        </span>
                        <strong className="text-sm text-slate-800">{c.topic}</strong>
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {c.count} related report(s) · Avg Semantic Similarity: {Math.round(c.averageSimilarity * 100)}%
                      </p>
                    </div>
                    <span className="text-xs font-semibold px-2 py-0.5 bg-blue-100 text-blue-800 rounded-full">
                      {c.count} items
                    </span>
                  </div>

                  <div className="mt-2.5 pt-2.5 border-t border-slate-200/70 space-y-1.5">
                    {c.requests.map((req: any) => (
                      <div
                        key={req.trackingId}
                        className="flex items-center justify-between text-xs bg-white p-2 rounded border border-slate-100"
                      >
                        <div className="flex items-center gap-2 truncate max-w-[70%]">
                          <span className="font-mono text-blue-600 font-semibold">{req.trackingId}</span>
                          <span className="text-slate-600 truncate">{req.description}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-slate-500 text-[11px] flex items-center gap-1">
                            <MapPin size={11} /> {req.location?.address?.split(",")[0] || "Maharashtra"}
                          </span>
                          <button
                            type="button"
                            onClick={() => navigate(`/track/${req.trackingId}`)}
                            className="text-blue-600 hover:underline text-[11px] font-medium"
                          >
                            Inspect
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      ) : (
        <div className="table-card">
          {rows.length === 0 ? (
            <div className="empty-state">
              <div className="empty-icon">
                <Filter size={22} />
              </div>
              <h3>No requests assigned yet.</h3>
              <p>Try another department or clear the filters.</p>
            </div>
          ) : (
            <div className="data-table-wrap">
              <table className="data-table">
                <thead>
                  <tr>
                    <th>Request</th>
                    <th>Citizen</th>
                    <th>Location</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>SLA</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((request) => {
                    const status = request.statusPerDepartment.find((item) => item.department === department);
                    return (
                      <tr key={request.trackingId}>
                        <td>
                          <div className="table-primary">
                            <strong>{request.requestType}</strong>
                            <span>{request.trackingId}</span>
                          </div>
                        </td>
                        <td>{request.citizenName}</td>
                        <td>
                          <span className="table-location">
                            <MapPin size={13} /> {request.location.address.split(",")[0]}
                          </span>
                        </td>
                        <td>
                          <span className={`priority-pill ${request.priority.toLowerCase()}`}>
                            <span />
                            {request.priority}
                          </span>
                        </td>
                        <td>
                          <span className={`status-badge status-${status?.status ?? "pending"}`}>
                            {status?.status ?? "pending"}
                          </span>
                        </td>
                        <td>
                          <span className={new Date(request.slaDueAt) < new Date() ? "sla-badge overdue" : "sla-badge"}>
                            <Timer size={13} /> {formatAge(request.slaDueAt)}
                          </span>
                        </td>
                        <td>
                          <div className="row-actions">
                            <button
                              title="Approve / Accept"
                              className="row-action approve"
                              disabled={action.isPending}
                              onClick={() =>
                                action.mutate({
                                  trackingId: request.trackingId,
                                  department,
                                  action: "Approve",
                                })
                              }
                            >
                              <Check size={15} />
                            </button>
                            <button
                              title="Reject"
                              className="row-action reject"
                              disabled={action.isPending}
                              onClick={() =>
                                action.mutate({
                                  trackingId: request.trackingId,
                                  department,
                                  action: "Reject",
                                })
                              }
                            >
                              <X size={15} />
                            </button>
                            <button
                              title="Forward"
                              className="row-action forward"
                              disabled={action.isPending}
                              onClick={() =>
                                action.mutate({
                                  trackingId: request.trackingId,
                                  department,
                                  action: "Forward",
                                })
                              }
                            >
                              <Forward size={15} />
                            </button>
                            <button
                              title="Open tracking"
                              className="row-action more"
                              onClick={() => navigate(`/track/${request.trackingId}`)}
                            >
                              <MoreHorizontal size={15} />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      <div className="dashboard-footnote">
        <ShieldAlert size={15} />
        <span>
          Every action is appended to the audit log. Approving or rejecting updates only your department’s status.
        </span>
      </div>
    </div>
  );
}
