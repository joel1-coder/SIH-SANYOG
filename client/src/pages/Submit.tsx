import {
  ArrowLeft,
  ArrowRight,
  Check,
  CircleHelp,
  Download,
  FileText,
  Languages,
  Link2,
  Loader2,
  Paperclip,
  Pencil,
  RotateCcw,
  Save,
  ShieldCheck,
  Sparkles,
  UploadCloud,
  X,
  MapPin,
  Bot,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Link } from "wouter";
import { toast } from "sonner";
import { trpc } from "@/lib/trpc";
import type { Location, Priority, RoutingRule } from "@shared/types";
import InteractiveLeafletMap from "@/components/InteractiveLeafletMap";
import VoiceInputButton from "@/components/VoiceInputButton";

const requestTypes = ["Scholarship", "Income Certificate", "Grievance", "Subsidy"];
const languages = ["English", "मराठी (Marathi)", "हिन्दी (Hindi)"];
const EMPTY_ROUTING_RULES: RoutingRule[] = [];
const DEFAULT_LOCATION: Location = { lat: 19.076, lng: 72.8777, address: "Mumbai, Maharashtra, India" };
const DRAFT_KEY = "sanyog.submit.draft.v1";

const recipientDetails: Record<
  string,
  { recipient: string; title: string; eta: string; reference: string; next: string; support: string }
> = {
  Scholarship: {
    recipient: "MahaDBT",
    title: "Post-matric scholarship desk",
    eta: "Typically reviewed within 7–10 working days",
    reference: "DBT application reference",
    next: "Keep your income certificate and college details ready if the desk requests verification.",
    support: "MahaDBT scholarship support",
  },
  "Income Certificate": {
    recipient: "Aaple Sarkar",
    title: "Income certificate services",
    eta: "Typically reviewed within 3–5 working days",
    reference: "Aaple Sarkar service reference",
    next: "Watch for a verification request and keep proof of income available.",
    support: "Aaple Sarkar citizen services",
  },
  Grievance: {
    recipient: "Aaple Sarkar",
    title: "Citizen grievance desk",
    eta: "Acknowledgement is usually issued within 48 hours",
    reference: "Grievance acknowledgement number",
    next: "Use the tracking ID when following up with the grievance desk.",
    support: "Aaple Sarkar grievance services",
  },
  Subsidy: {
    recipient: "MahaDBT",
    title: "Subsidy and benefits desk",
    eta: "Typically reviewed within 5–8 working days",
    reference: "Benefit application reference",
    next: "Keep your bank and eligibility documents available for verification.",
    support: "MahaDBT benefits support",
  },
};

function createReceiptPdf(request: any, trackingId: string) {
  const escapePdf = (value: string) =>
    value.replace(/\\/g, "\\\\").replace(/[()]/g, "\\$&").replace(/\r?\n/g, " ");
  const detailLines = [
    "SANYOG SUBMISSION CONFIRMATION",
    "",
    `Tracking ID: ${trackingId}`,
    `Certificate / service: ${request.requestType}`,
    `Citizen: ${request.citizenName}`,
    `Submitted: ${new Date(request.timestamp).toLocaleString()}`,
    `Location: ${request.location?.address || "Maharashtra, India"}`,
    "",
    "AUTOMATIC DELIVERY",
    `Recipients: ${request.departments.join(", ")}`,
    `Status: ${request.overallStatus}`,
    "",
    "REQUEST DESCRIPTION",
    request.description,
    "",
    "This receipt confirms that SANYOG accepted the request and created a live tracking record.",
  ];
  const commands = [
    "BT",
    "/F1 16 Tf",
    "50 760 Td",
    ...detailLines.flatMap((line, index) => [
      `(${escapePdf(line)}) Tj`,
      ...(index < detailLines.length - 1 ? ["0 -24 Td"] : []),
    ]),
    "ET",
  ].join("\n");
  const objects = [
    "<< /Type /Catalog /Pages 2 0 R >>",
    "<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
    "<< /Type /Page /Parent 2 0 R /MediaBox [0 0 612 792] /Resources << /Font << /F1 4 0 R >> >> /Contents 5 0 R >>",
    "<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>",
    `<< /Length ${commands.length} >>\nstream\n${commands}\nendstream`,
  ];
  let pdf = "%PDF-1.4\n";
  const offsets = [0];
  objects.forEach((object, index) => {
    offsets[index + 1] = pdf.length;
    pdf += `${index + 1} 0 obj\n${object}\nendobj\n`;
  });
  const xref = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  for (let index = 1; index <= objects.length; index += 1)
    pdf += `${String(offsets[index]).padStart(10, "0")} 00000 n \n`;
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xref}\n%%EOF`;
  return new Blob([pdf], { type: "application/pdf" });
}

export default function Submit() {
  const catalog = trpc.catalog.bootstrap.useQuery();
  const submit = trpc.citizen.submit.useMutation({
    onSuccess: (response) => {
      if (response.success) {
        toast.success("Request submitted successfully", {
          description: `${response.data.trackingId} is now tracking your department updates.`,
        });
        localStorage.removeItem(DRAFT_KEY);
        setResult(response.data);
      }
    },
  });

  const [name, setName] = useState("Ananya Deshmukh");
  const [requestType, setRequestType] = useState("Scholarship");
  const [description, setDescription] = useState(
    "I need help with my post-matric scholarship application for the 2026 academic year."
  );
  const [attachments, setAttachments] = useState<string[]>([]);
  const [driveLink, setDriveLink] = useState("");
  const [language, setLanguage] = useState("English");
  const [priority, setPriority] = useState<Priority>("Medium");
  const [location, setLocation] = useState<Location>(DEFAULT_LOCATION);
  const [consent, setConsent] = useState(false);
  const [showPreview, setShowPreview] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [copied, setCopied] = useState(false);
  const [draftReady, setDraftReady] = useState(false);
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [previewEdit, setPreviewEdit] = useState<
    "name" | "requestType" | "description" | "priority" | "language" | "address" | null
  >(null);

  const routingRules = catalog.data?.data.routingRules ?? EMPTY_ROUTING_RULES;

  // Real-time Semantic duplicate query using sentence embeddings
  const semanticCheck = trpc.citizen.semanticCheck.useQuery(
    { description, requestType },
    { enabled: description.length >= 15, refetchOnWindowFocus: false }
  );

  useEffect(() => {
    const nodes = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (!nodes.length || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) =>
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        }),
      { threshold: 0.12, rootMargin: "0px 0px -8% 0px" }
    );
    nodes.forEach((node) => observer.observe(node));
    return () => observer.disconnect();
  }, [showPreview, result]);

  const allowed = useMemo(
    () => routingRules.find((rule) => rule.requestType === requestType)?.departments ?? [],
    [routingRules, requestType]
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    try {
      const raw = window.localStorage.getItem(DRAFT_KEY);
      if (raw) {
        const draft = JSON.parse(raw);
        if (typeof draft.name === "string") setName(draft.name);
        if (typeof draft.requestType === "string") setRequestType(draft.requestType);
        if (typeof draft.description === "string") setDescription(draft.description);
        if (Array.isArray(draft.attachments)) setAttachments(draft.attachments);
        if (typeof draft.language === "string") setLanguage(draft.language);
        if (["Low", "Medium", "High"].includes(draft.priority)) setPriority(draft.priority);
        if (draft.location) setLocation(draft.location);
        if (typeof draft.consent === "boolean") setConsent(draft.consent);
        setDraftSavedAt(new Date());
      }
    } catch {
      window.localStorage.removeItem(DRAFT_KEY);
    } finally {
      setDraftReady(true);
    }
  }, []);

  useEffect(() => {
    if (!draftReady || typeof window === "undefined") return;
    const timeout = window.setTimeout(() => {
      window.localStorage.setItem(
        DRAFT_KEY,
        JSON.stringify({ name, requestType, description, attachments, language, priority, location, consent })
      );
      setDraftSavedAt(new Date());
    }, 300);
    return () => window.clearTimeout(timeout);
  }, [draftReady, name, requestType, description, attachments, language, priority, location, consent]);

  const addFile = (file?: File) => {
    if (file) setAttachments((current) => [...current, file.name]);
  };
  const addDriveLink = () => {
    if (driveLink.trim()) {
      setAttachments((current) => [...current, `Drive · ${driveLink.trim()}`]);
      setDriveLink("");
    }
  };
  const clearDraft = () => {
    if (typeof window !== "undefined") window.localStorage.removeItem(DRAFT_KEY);
    setName("Ananya Deshmukh");
    setRequestType("Scholarship");
    setDescription("I need help with my post-matric scholarship application for the 2026 academic year.");
    setAttachments([]);
    setLanguage("English");
    setPriority("Medium");
    setLocation(DEFAULT_LOCATION);
    setConsent(false);
    setDraftSavedAt(null);
    toast.message("Draft cleared", { description: "The form has been reset to its starting values." });
  };

  const handleVoiceTranscript = (transcript: string) => {
    setDescription((prev) => (prev ? `${prev} ${transcript}` : transcript));
    toast.success("Voice transcript appended!");
  };

  const submitPayload = {
    citizenName: name,
    requestType,
    description,
    location,
    attachments,
    language,
    consent: true as true,
    priority,
  };

  const openPreview = (event: React.FormEvent) => {
    event.preventDefault();
    setShowPreview(true);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const confirmSubmit = () => submit.mutate(submitPayload);

  const copyId = async () => {
    if (!result?.trackingId) return;
    await navigator.clipboard?.writeText(result.trackingId);
    setCopied(true);
    setTimeout(() => setCopied(false), 1400);
  };

  const downloadReceipt = () => {
    if (!result?.request) return;
    const url = URL.createObjectURL(createReceiptPdf(result.request, result.trackingId));
    const link = document.createElement("a");
    link.href = url;
    link.download = `sanyog-${result.trackingId}-receipt.pdf`;
    link.click();
    URL.revokeObjectURL(url);
    toast.success("Receipt downloaded", { description: "Your confirmation PDF is ready." });
  };

  if (result)
    return (
      <div className="page-container narrow-page">
        <div className="page-back">
          <Link href="/submit" onClick={() => setResult(null)}>
            <ArrowLeft size={15} /> New submission
          </Link>
        </div>
        <div className="success-panel animate-in">
          <div className="success-symbol success-pop">
            <Check size={27} />
          </div>
          <span className="section-label">Submission accepted</span>
          <h1>Your request is moving.</h1>
          <p>
            SANYOG delivered your request to the configured service recipient. One connector can retry
            or fail without stopping the others.
          </p>
          <div className="recipient-confirmation" data-reveal>
            <div className="recipient-confirmation-header">
              <div>
                <span className="eyebrow">Assigned recipient</span>
                <h2>{recipientDetails[result.request.requestType]?.title ?? "Government service desk"}</h2>
                <p>{recipientDetails[result.request.requestType]?.recipient ?? result.request.departments.join(", ")}</p>
              </div>
              <span className="recipient-live">
                <span /> Automatic delivery
              </span>
            </div>
            <div className="recipient-detail-grid">
              <div>
                <span>Expected response</span>
                <strong>
                  {recipientDetails[result.request.requestType]?.eta ?? "The recipient will review your request"}
                </strong>
              </div>
              <div>
                <span>Reference generated</span>
                <strong>
                  {recipientDetails[result.request.requestType]?.reference ?? "Service tracking reference"}
                </strong>
              </div>
              <div className="wide">
                <span>Location Tagged</span>
                <strong>{result.request.location?.address || "Maharashtra, India"}</strong>
              </div>
            </div>
          </div>
          <div className="tracking-hero" data-reveal>
            <span>Your tracking ID</span>
            <div>
              <strong>{result.trackingId}</strong>
              <button className="copy-button" onClick={copyId}>
                {copied ? <Check size={14} /> : <Paperclip size={14} />}
                {copied ? "Copied" : "Copy"}
              </button>
            </div>
          </div>
          <div className="mini-status-grid" data-reveal>
            {result.request.statusPerDepartment.map((item: any) => (
              <div className="mini-status" key={item.department}>
                <span className={`status-dot ${item.status}`} />
                <div>
                  <strong>{item.department}</strong>
                  <small>{item.status === "success" ? item.externalRefId : item.note ?? item.status}</small>
                </div>
                <span className={`status-badge status-${item.status}`}>{item.status}</span>
              </div>
            ))}
          </div>
          <div className="success-actions">
            <Link href={`/track/${result.trackingId}`} className="button button-primary">
              Open tracking view <ArrowRight size={16} />
            </Link>
            <button className="button button-outline" onClick={downloadReceipt}>
              <Download size={16} /> Download receipt
            </button>
            <button className="button button-outline" onClick={() => setResult(null)}>
              Submit another
            </button>
          </div>
          {result.duplicateFlag && (
            <div className="duplicate-note">
              <CircleHelp size={16} />
              <span>
                NLP Similarity Alert: This request resembles an existing report ({Math.round((result.semanticSimilarity || 0.8) * 100)}% match). It was still accepted and linked for official review.
              </span>
            </div>
          )}
        </div>
      </div>
    );

  if (showPreview)
    return (
      <div className="page-container narrow-page">
        <div className="page-back">
          <button className="back-link button-reset" onClick={() => setShowPreview(false)}>
            <ArrowLeft size={15} /> Back to edit
          </button>
        </div>
        <div className="page-heading compact-heading">
          <div>
            <span className="section-label">Final review / Before you submit</span>
            <h1>Check your details once.</h1>
            <p>
              Confirm what will be normalized and delivered to the configured recipient.
            </p>
          </div>
          <div className="privacy-badge">
            <ShieldCheck size={16} /> Ready for consented sharing
          </div>
        </div>
        <div className="preview-layout">
          <section className="preview-card" data-reveal>
            <div className="preview-card-heading">
              <span className="form-step">01</span>
              <div>
                <h2>Request details</h2>
                <button
                  className="edit-link"
                  onClick={() => setPreviewEdit(previewEdit ? null : "name")}
                >
                  <Pencil size={12} /> {previewEdit ? "Done" : "Edit fields"}
                </button>
              </div>
            </div>
            <div className="preview-grid">
              <div>
                <span>Name</span>
                {previewEdit === "name" ? (
                  <input
                    className="text-input preview-input"
                    value={name}
                    onChange={(event) => setName(event.target.value)}
                    onBlur={() => setPreviewEdit(null)}
                    autoFocus
                  />
                ) : (
                  <strong>{name}</strong>
                )}
              </div>
              <div>
                <span>Request type</span>
                {previewEdit === "requestType" ? (
                  <select
                    className="text-input preview-input"
                    value={requestType}
                    onChange={(event) => {
                      setRequestType(event.target.value);
                      setPreviewEdit(null);
                    }}
                  >
                    {requestTypes.map((item) => (
                      <option key={item}>{item}</option>
                    ))}
                  </select>
                ) : (
                  <button
                    className="preview-value-button"
                    onClick={() => setPreviewEdit("requestType")}
                  >
                    <strong>{requestType}</strong>
                    <Pencil size={12} />
                  </button>
                )}
              </div>
              <div className="full">
                <span>Description</span>
                {previewEdit === "description" ? (
                  <textarea
                    className="text-input preview-input"
                    rows={3}
                    value={description}
                    onChange={(event) => setDescription(event.target.value)}
                    onBlur={() => setPreviewEdit(null)}
                    autoFocus
                  />
                ) : (
                  <button
                    className="preview-value-button full-value"
                    onClick={() => setPreviewEdit("description")}
                  >
                    <strong>{description}</strong>
                    <Pencil size={12} />
                  </button>
                )}
              </div>
              <div>
                <span>Priority</span>
                <strong>
                  <span className={`priority-pill ${priority.toLowerCase()}`}>
                    <span />
                    {priority}
                  </span>
                </strong>
              </div>
              <div>
                <span>Language</span>
                <strong>{language}</strong>
              </div>
              <div className="full">
                <span>Geo-Tagged Location</span>
                <strong>{location.address} ({location.lat.toFixed(4)}, {location.lng.toFixed(4)})</strong>
              </div>
            </div>
          </section>
          <section className="preview-card" data-reveal>
            <div className="preview-card-heading">
              <span className="form-step">02</span>
              <div>
                <h2>Automatic delivery</h2>
              </div>
            </div>
            <div className="preview-block">
              <span>Selected service</span>
              <strong>{requestType}</strong>
            </div>
            <div className="preview-block">
              <span>Delivered automatically to</span>
              <div className="preview-chips">
                {allowed.map((department) => (
                  <span key={department}>
                    <Check size={12} />
                    {department}
                  </span>
                ))}
              </div>
            </div>
            <div className="preview-block">
              <span>Attachments</span>
              <strong>{attachments.length ? attachments.join(", ") : "No attachments"}</strong>
            </div>
          </section>
          <section className="preview-consent" data-reveal>
            <div className="consent-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>Consent is confirmed</strong>
              <p>
                Your normalized request, location, and service details will be delivered only to the
                configured recipient.
              </p>
            </div>
            <Check className="preview-confirmed" size={19} />
          </section>
        </div>
        <div className="preview-submit-row">
          <span>
            <Sparkles size={15} /> A tracking ID will be generated immediately.
          </span>
          <button
            className="button button-primary"
            onClick={confirmSubmit}
            disabled={submit.isPending}
          >
            {submit.isPending ? (
              <>
                <Loader2 size={17} className="spin" /> Finalizing…
              </>
            ) : (
              <>
                Confirm & submit <ArrowRight size={17} />
              </>
            )}
          </button>
        </div>
        {submit.data && !submit.data.success && (
          <div className="error-banner">{submit.data.message}</div>
        )}
      </div>
    );

  return (
    <div className="page-container narrow-page">
      <div className="page-heading compact-heading">
        <div>
          <span className="section-label">Citizen workspace / New request</span>
          <h1>Submit once. Stay informed.</h1>
          <p>Choose your service and pinpoint your location. Dictate in regional languages or type directly.</p>
        </div>
        <div className="page-heading-actions">
          <div className="privacy-badge">
            <ShieldCheck size={16} /> Consent-first flow
          </div>
          <div className="draft-actions">
            <span className="draft-status">
              <Save size={13} />{" "}
              {draftSavedAt
                ? `Draft saved ${draftSavedAt.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}`
                : "Draft autosave on"}
            </span>
            <button type="button" className="draft-clear" onClick={clearDraft}>
              <RotateCcw size={12} /> Reset draft
            </button>
          </div>
        </div>
      </div>
      <form className="form-layout" onSubmit={openPreview}>
        <section className="form-card" data-reveal>
          <div className="form-section-heading">
            <span className="form-step">01</span>
            <div>
              <h2>Request details</h2>
              <p>Your selected service determines the recipient automatically.</p>
            </div>
          </div>
          <label className="field-label">
            Your name
            <input
              className="text-input"
              value={name}
              onChange={(event) => setName(event.target.value)}
              placeholder="Full name"
              required
            />
          </label>
          <div className="field-grid">
            <label className="field-label">
              Certificate or service
              <select
                className="text-input"
                value={requestType}
                onChange={(event) => setRequestType(event.target.value)}
              >
                {requestTypes.map((item) => (
                  <option key={item}>{item}</option>
                ))}
              </select>
            </label>
            <label className="field-label">
              Priority
              <select
                className="text-input"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                <option>Low</option>
                <option>Medium</option>
                <option>High</option>
              </select>
            </label>
          </div>
          <div className="automatic-routing-note form-routing-note">
            <Check size={14} /> Automatically delivered to:{" "}
            <strong>{allowed.join(", ") || "configured service recipient"}</strong>
          </div>

          <div className="field-label">
            <div className="flex items-center justify-between mb-1">
              <span>What do you need help with?</span>
              {/* Voice Input Button */}
              <VoiceInputButton language={language} onTranscript={handleVoiceTranscript} />
            </div>
            <textarea
              className="text-input textarea"
              rows={5}
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="Describe your request or use the Voice Input button to speak in English, Marathi, or Hindi..."
              required
            />
            <div className="flex items-center justify-between mt-1">
              <span className="field-hint">
                {description.length}/500 characters · Dictation supports {language}.
              </span>
              {semanticCheck.data?.data?.isDuplicate && (
                <span className="inline-flex items-center gap-1 text-xs text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                  <Bot size={12} />
                  Similar report found ({Math.round(semanticCheck.data.data.similarity * 100)}% semantic match)
                </span>
              )}
            </div>
          </div>
        </section>

        {/* Interactive Leaflet Map Section */}
        <section className="form-card" data-reveal>
          <div className="form-section-heading">
            <span className="form-step">02</span>
            <div>
              <h2>Incident & Service Location</h2>
              <p>Click on the map or use your GPS to drop a precise pin.</p>
            </div>
          </div>
          <div className="my-2">
            <InteractiveLeafletMap
              location={location}
              onChange={(newLoc) => setLocation(newLoc)}
              height="260px"
            />
          </div>
        </section>

        <section className="form-card" data-reveal>
          <div className="form-section-heading">
            <span className="form-step">03</span>
            <div>
              <h2>Supporting information & Language</h2>
              <p>Configure language and upload files.</p>
            </div>
          </div>
          <div className="upload-zone">
            <UploadCloud size={22} />
            <strong>Drop files here or choose a file</strong>
            <span>PDF, JPG, PNG · up to 10 MB each</span>
            <label className="button button-outline small-button">
              Choose file
              <input type="file" hidden onChange={(event) => addFile(event.target.files?.[0])} />
            </label>
          </div>
          <div className="drive-row">
            <div className="drive-input">
              <Link2 size={16} />
              <input
                value={driveLink}
                onChange={(event) => setDriveLink(event.target.value)}
                placeholder="Paste a Google Drive link"
              />
            </div>
            <button type="button" className="button button-outline small-button" onClick={addDriveLink}>
              Add link
            </button>
          </div>
          {attachments.length > 0 && (
            <div className="attachment-list">
              {attachments.map((file) => (
                <span key={file}>
                  <FileText size={14} />
                  {file}
                  <button
                    type="button"
                    onClick={() => setAttachments((current) => current.filter((item) => item !== file))}
                  >
                    <X size={13} />
                  </button>
                </span>
              ))}
            </div>
          )}
          <label className="field-label language-field mt-3">
            <Languages size={15} /> Language preference for Voice & Processing
            <select
              className="text-input"
              value={language}
              onChange={(event) => setLanguage(event.target.value)}
            >
              {languages.map((item) => (
                <option key={item}>{item}</option>
              ))}
            </select>
          </label>
        </section>

        <section className="consent-card" data-reveal>
          <div className="consent-copy">
            <div className="consent-icon">
              <ShieldCheck size={20} />
            </div>
            <div>
              <strong>Consent to share this request</strong>
              <p>
                I allow SANYOG to share the normalized request, location pin, attachments, and service
                details with the configured recipient.
              </p>
            </div>
          </div>
          <label className="consent-toggle">
            <input
              type="checkbox"
              checked={consent}
              onChange={(event) => setConsent(event.target.checked)}
            />
            <span className="toggle-box">{consent && <Check size={14} />}</span>
            <span>I understand and consent</span>
          </label>
        </section>

        <div className="form-submit-row">
          <span>
            <Sparkles size={15} /> Review your details before finalizing.
          </span>
          <button className="button button-primary" type="submit" disabled={!consent}>
            Review submission <ArrowRight size={17} />
          </button>
        </div>
      </form>
    </div>
  );
}
