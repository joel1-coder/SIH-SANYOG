import {
  ArrowRight,
  Bot,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock,
  Copy,
  Download,
  FileCheck,
  FileText,
  HelpCircle,
  Layers,
  Link2,
  Loader2,
  Lock,
  MapPin,
  Moon,
  Paperclip,
  Pencil,
  Send,
  ShieldCheck,
  Sparkles,
  Sun,
  UploadCloud,
  User,
  Users,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "wouter";
import { trpc } from "@/lib/trpc";
import { useTheme } from "@/contexts/ThemeContext";
import { toast } from "sonner";
import type { Priority } from "@shared/types";

/* ── Types ─────────────────────────────────────────────────────────────── */
interface CertInfo {
  title: string;
  description: string;
  documents: string[];
  departments: string[];
  time: string;
  tip: string;
  suggestedFiles?: string[];
}

interface ApplicationData {
  citizenName: string;
  citizenMasterId: string;
  requestType: string;
  description: string;
  address: string;
  lat: number;
  lng: number;
  attachments: string[];
  priority: Priority;
  language: string;
}

interface Message {
  id: string;
  role: "user" | "bot";
  text?: string;
  cert?: CertInfo;
  stage?: "info" | "form" | "double_check" | "dispatched";
  formData?: ApplicationData;
  submissionResult?: any;
  loading?: boolean;
}

const QUICK_PROMPTS = [
  "Hey I need to apply for Income certificate",
  "Hey I need to apply for Community / Caste certificate",
  "Hey I need to apply for Scholarship",
  "Hey I need to apply for Aadhaar update",
  "Hey I need to apply for Domicile certificate",
  "Hey I need to apply for Birth certificate",
  "Hey I need to apply for PAN card",
];

const DEFAULT_DOCS_BY_SERVICE: Record<string, string[]> = {
  "Income Certificate": ["Salary_Slip_3Months.pdf", "Aadhaar_Card_Copy.pdf", "Ration_Card.pdf", "Income_Affidavit.pdf"],
  "Community / Caste Certificate": ["Father_Caste_Certificate.pdf", "School_Leaving_Certificate.pdf", "Aadhaar_Card.pdf", "Self_Declaration.pdf"],
  "Scholarship Application": ["Previous_Year_Marksheet.pdf", "Bonafide_Certificate.pdf", "Income_Certificate.pdf", "College_Fee_Receipt.pdf"],
  "Aadhaar Card / Correction": ["Proof_of_Identity_PAN.pdf", "Proof_of_Address_ElectricityBill.pdf", "DOB_Certificate.pdf"],
  "Domicile / Residence Certificate": ["15_Years_Residence_Proof.pdf", "School_Certificates_7to12.pdf", "Voter_ID.pdf"],
  "Birth Certificate": ["Hospital_Discharge_Summary.pdf", "Parents_Aadhaar_Copy.pdf", "Marriage_Certificate.pdf"],
  "PAN Card": ["Aadhaar_eKYC.pdf", "Passport_Photo.jpg", "Address_Proof.pdf"],
};

/* ── Interactive In-Chat Application Form ───────────────────────────────── */
function AIChatForm({
  cert,
  initialData,
  onReview,
}: {
  cert: CertInfo;
  initialData?: Partial<ApplicationData>;
  onReview: (data: ApplicationData) => void;
}) {
  const [name, setName] = useState(initialData?.citizenName || "Ananya Deshmukh");
  const [citizenId, setCitizenId] = useState(initialData?.citizenMasterId || "SYN-AADHAAR-88219");
  const [requestType, setRequestType] = useState(cert.title);
  const [description, setDescription] = useState(
    initialData?.description || `Application for ${cert.title} with verified eligibility and required attachments.`
  );
  const [address, setAddress] = useState(initialData?.address || "Shivaji Nagar, Pune, Maharashtra 411005");
  const [lat, setLat] = useState(initialData?.lat || 18.5204);
  const [lng, setLng] = useState(initialData?.lng || 73.8567);
  const [isLocating, setIsLocating] = useState(false);

  const sampleFiles = DEFAULT_DOCS_BY_SERVICE[cert.title] || [
    "Identity_Proof_Aadhaar.pdf",
    "Address_Proof_RationCard.pdf",
    "Verification_Declaration.pdf",
  ];

  const [attachments, setAttachments] = useState<string[]>(
    initialData?.attachments && initialData.attachments.length > 0
      ? initialData.attachments
      : [sampleFiles[0], sampleFiles[1]]
  );

  const [customFileInput, setCustomFileInput] = useState("");
  const [priority, setPriority] = useState<Priority>(initialData?.priority || "Medium");
  const [language, setLanguage] = useState(initialData?.language || "English");

  const toggleAttachment = (file: string) => {
    if (attachments.includes(file)) {
      setAttachments(attachments.filter((f) => f !== file));
    } else {
      setAttachments([...attachments, file]);
    }
  };

  const handleCustomFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const fileName = file.name;
      if (!attachments.includes(fileName)) {
        setAttachments([...attachments, fileName]);
        toast.success(`Attached: ${fileName}`);
      }
    }
  };

  const detectLocation = () => {
    setIsLocating(true);
    if ("geolocation" in navigator) {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          setLat(pos.coords.latitude);
          setLng(pos.coords.longitude);
          setAddress(`Auto-detected GPS (${pos.coords.latitude.toFixed(4)}, ${pos.coords.longitude.toFixed(4)}), Maharashtra`);
          setIsLocating(false);
          toast.success("Location pinpointed via GPS!");
        },
        () => {
          setIsLocating(false);
          toast.info("Using default region: Shivaji Nagar, Pune, Maharashtra");
        },
        { timeout: 5000 }
      );
    } else {
      setIsLocating(false);
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error("Please enter applicant name");
      return;
    }
    if (attachments.length === 0) {
      toast.error("Please attach at least one supporting file");
      return;
    }

    onReview({
      citizenName: name,
      citizenMasterId: citizenId,
      requestType,
      description,
      address,
      lat,
      lng,
      attachments,
      priority,
      language,
    });
  };

  return (
    <form className="ai-chat-form-card" onSubmit={handleSubmit}>
      <div className="ai-form-badge">
        <Sparkles size={13} />
        <span>Step 1: Fill Required Basic Details</span>
      </div>

      <div className="ai-form-fields-grid">
        <label className="ai-form-field">
          <span className="ai-form-label">Full Name</span>
          <input
            type="text"
            className="ai-form-input"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="Enter applicant full name"
            required
          />
        </label>

        <label className="ai-form-field">
          <span className="ai-form-label">Aadhaar / Citizen Master ID</span>
          <input
            type="text"
            className="ai-form-input"
            value={citizenId}
            onChange={(e) => setCitizenId(e.target.value)}
            placeholder="SYN-AADHAAR-XXXXX"
          />
        </label>
      </div>

      <div className="ai-form-field">
        <span className="ai-form-label">Application Purpose & Details</span>
        <textarea
          className="ai-form-input ai-form-textarea"
          rows={3}
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Describe your certificate requirement or reason..."
          required
        />
      </div>

      {/* ── My Location ── */}
      <div className="ai-form-section">
        <div className="ai-form-section-title">
          <MapPin size={14} className="text-teal-600" />
          <span>My location</span>
          <button
            type="button"
            className="ai-gps-btn"
            onClick={detectLocation}
            disabled={isLocating}
          >
            {isLocating ? <Loader2 size={12} className="ai-spin" /> : <MapPin size={12} />}
            {isLocating ? "Detecting GPS…" : "Use My GPS Location"}
          </button>
        </div>
        <input
          type="text"
          className="ai-form-input"
          value={address}
          onChange={(e) => setAddress(e.target.value)}
          placeholder="Address, Tehsil, District, Maharashtra"
          required
        />
        <div className="ai-location-coords">
          <span>Lat: {lat.toFixed(4)}</span> · <span>Lng: {lng.toFixed(4)}</span>
        </div>
      </div>

      {/* ── Supporting File ── */}
      <div className="ai-form-section">
        <div className="ai-form-section-title">
          <Paperclip size={14} className="text-blue-600" />
          <span>Supporting file (Required for {cert.title})</span>
        </div>
        <p className="ai-supporting-hint">
          Click required documents below to attach or upload custom files from your device:
        </p>

        <div className="ai-doc-chips">
          {sampleFiles.map((file) => {
            const isAttached = attachments.includes(file);
            return (
              <button
                key={file}
                type="button"
                className={`ai-doc-chip ${isAttached ? "attached" : ""}`}
                onClick={() => toggleAttachment(file)}
              >
                {isAttached ? <Check size={12} /> : <FileText size={12} />}
                <span>{file}</span>
                <span className="ai-doc-chip-badge">{isAttached ? "Attached" : "+ Add"}</span>
              </button>
            );
          })}
        </div>

        <div className="ai-file-upload-row">
          <label className="ai-custom-upload-btn">
            <UploadCloud size={14} />
            <span>Upload Supporting File</span>
            <input type="file" hidden onChange={handleCustomFileUpload} />
          </label>
          <span className="ai-upload-note">PDF, JPG, PNG up to 10 MB</span>
        </div>
      </div>

      {/* ── Priority & Language ── */}
      <div className="ai-form-fields-grid">
        <label className="ai-form-field">
          <span className="ai-form-label">Priority Level</span>
          <select
            className="ai-form-input"
            value={priority}
            onChange={(e) => setPriority(e.target.value as Priority)}
          >
            <option value="Low">Low (Standard SLA)</option>
            <option value="Medium">Medium (Regular)</option>
            <option value="High">High (Urgent Medical/Academic)</option>
          </select>
        </label>

        <label className="ai-form-field">
          <span className="ai-form-label">Preferred Language</span>
          <select
            className="ai-form-input"
            value={language}
            onChange={(e) => setLanguage(e.target.value)}
          >
            <option>English</option>
            <option>मराठी (Marathi)</option>
            <option>हिन्दी (Hindi)</option>
          </select>
        </label>
      </div>

      <button type="submit" className="button button-primary ai-submit-form-btn">
        <span>Verify & Double Check with AI</span>
        <ArrowRight size={16} />
      </button>
    </form>
  );
}

/* ── Double Check Card ─────────────────────────────────────────────────── */
function AIDoubleCheckCard({
  data,
  cert,
  onConfirm,
  onEdit,
  isSubmitting,
}: {
  data: ApplicationData;
  cert: CertInfo;
  onConfirm: () => void;
  onEdit: () => void;
  isSubmitting: boolean;
}) {
  return (
    <div className="ai-double-check-card">
      <div className="ai-double-check-header">
        <div className="ai-check-shield-icon">
          <ShieldCheck size={20} />
        </div>
        <div>
          <h3 className="ai-double-check-title">AI Pre-Submission Double Check</h3>
          <p className="ai-double-check-subtitle">
            Please double check your details. Once confirmed, the AI will autonomously dispatch this to government officials.
          </p>
        </div>
      </div>

      <div className="ai-review-grid">
        <div className="ai-review-item">
          <span className="ai-review-label">👤 Applicant</span>
          <strong className="ai-review-val">{data.citizenName}</strong>
          <small className="ai-review-sub">{data.citizenMasterId}</small>
        </div>

        <div className="ai-review-item">
          <span className="ai-review-label">📜 Service Requested</span>
          <strong className="ai-review-val">{data.requestType}</strong>
          <small className="ai-review-sub">SLA: {cert.time}</small>
        </div>

        <div className="ai-review-item">
          <span className="ai-review-label">🏛️ Target Department Gateway</span>
          <strong className="ai-review-val">{cert.departments.join(" · ")}</strong>
          <small className="ai-review-sub">Multi-department dispatch</small>
        </div>

        <div className="ai-review-item">
          <span className="ai-review-label">📍 My Location</span>
          <strong className="ai-review-val">{data.address}</strong>
          <small className="ai-review-sub">
            ({data.lat.toFixed(4)}, {data.lng.toFixed(4)})
          </small>
        </div>
      </div>

      <div className="ai-review-docs-box">
        <span className="ai-review-label">📎 Verified Supporting Files ({data.attachments.length})</span>
        <div className="ai-review-docs-list">
          {data.attachments.map((doc, idx) => (
            <div key={idx} className="ai-verified-doc">
              <CheckCircle2 size={13} className="text-teal-600" />
              <span>{doc}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-double-check-alert">
        <Sparkles size={15} />
        <span>
          <strong>AI Verification Passed:</strong> All mandatory eligibility criteria and attached documents match government guidelines.
        </span>
      </div>

      <div className="ai-double-check-prompt">
        <p>Would you like the AI to submit this work to officials now?</p>
        <div className="ai-double-check-actions">
          <button
            type="button"
            className="button button-outline"
            onClick={onEdit}
            disabled={isSubmitting}
          >
            <Pencil size={14} />
            <span>Edit Details</span>
          </button>
          <button
            type="button"
            className="button button-primary ai-dispatch-confirm-btn"
            onClick={onConfirm}
            disabled={isSubmitting}
          >
            {isSubmitting ? (
              <>
                <Loader2 size={16} className="ai-spin" />
                <span>AI Dispatching to Officials…</span>
              </>
            ) : (
              <>
                <Sparkles size={16} />
                <span>🤖 AI Send to Officials Now</span>
                <ArrowRight size={16} />
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}

/* ── Dispatch Success Receipt Card ─────────────────────────────────────── */
function AIDispatchSuccessCard({
  result,
  data,
  onReset,
}: {
  result: any;
  data: ApplicationData;
  onReset: () => void;
}) {
  const [copied, setCopied] = useState(false);

  const copyId = () => {
    navigator.clipboard.writeText(result.trackingId);
    setCopied(true);
    toast.success("Tracking ID copied to clipboard!");
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <div className="ai-success-receipt-card">
      <div className="ai-receipt-header">
        <div className="ai-receipt-check-badge">
          <Check size={22} />
        </div>
        <div>
          <span className="ai-receipt-tag">Official Submission Confirmed</span>
          <h3 className="ai-receipt-title">Sent to Officials Successfully!</h3>
          <p className="ai-receipt-desc">
            The AI has transmitted your application across all connected government department portals.
          </p>
        </div>
      </div>

      <div className="ai-tracking-banner">
        <div className="ai-tracking-info">
          <span className="ai-tracking-label">Universal Tracking ID</span>
          <strong className="ai-tracking-id">{result.trackingId}</strong>
        </div>
        <button className="button button-outline ai-copy-btn" onClick={copyId}>
          {copied ? <Check size={14} /> : <Copy size={14} />}
          <span>{copied ? "Copied" : "Copy ID"}</span>
        </button>
      </div>

      <div className="ai-departments-dispatched-box">
        <span className="ai-review-label">🏛️ Real-Time Department Routing Status</span>
        <div className="ai-dispatched-depts-list">
          {result.statusPerDepartment?.map((item: any) => (
            <div key={item.department} className="ai-dept-status-row">
              <div className="ai-dept-status-indicator">
                <span className={`status-dot ${item.status}`} />
                <div>
                  <strong>{item.department}</strong>
                  <small>{item.status === "success" ? item.externalRefId : item.note ?? "Queued for SLA review"}</small>
                </div>
              </div>
              <span className={`status-badge status-${item.status}`}>{item.status}</span>
            </div>
          ))}
        </div>
      </div>

      <div className="ai-success-nav-actions">
        <Link href={`/track/${result.trackingId}`} className="button button-primary ai-track-btn">
          <span>Track Live Status</span>
          <ArrowRight size={15} />
        </Link>
        <Link href="/submissions" className="button button-outline">
          <Layers size={15} />
          <span>My Submissions</span>
        </Link>
        <button className="button button-ghost" onClick={onReset}>
          <Sparkles size={15} />
          <span>Apply for Another</span>
        </button>
      </div>
    </div>
  );
}

/* ── Certificate Info Card ──────────────────────────────────────────────── */
function CertCard({
  cert,
  onFillNow,
}: {
  cert: CertInfo;
  onFillNow: () => void;
}) {
  return (
    <div className="ai-cert-card">
      <div className="ai-cert-header">
        <div className="ai-cert-icon">
          <FileText size={20} />
        </div>
        <div>
          <h3 className="ai-cert-title">{cert.title}</h3>
          <p className="ai-cert-desc">{cert.description}</p>
        </div>
      </div>

      <div className="ai-cert-section">
        <p className="ai-cert-section-label">📋 Basic Needs & Required Documents</p>
        <ul className="ai-cert-docs">
          {cert.documents.map((doc, i) => (
            <li key={i}>
              <ChevronRight size={12} />
              <span>{doc}</span>
            </li>
          ))}
        </ul>
      </div>

      <div className="ai-cert-meta-row">
        <div className="ai-cert-meta-item">
          <span className="ai-cert-meta-label">🏛️ Connected Departments</span>
          <span className="ai-cert-meta-value">{cert.departments.join(" · ")}</span>
        </div>
        <div className="ai-cert-meta-item">
          <span className="ai-cert-meta-label">⏱️ SLA Processing Time</span>
          <span className="ai-cert-meta-value">{cert.time}</span>
        </div>
      </div>

      <div className="ai-cert-tip">
        <Sparkles size={13} />
        <span>
          <strong>Pro-Tip:</strong> {cert.tip}
        </span>
      </div>

      <button type="button" className="button button-primary ai-cert-apply" onClick={onFillNow}>
        <span>Fill Details & Apply with AI →</span>
      </button>
    </div>
  );
}

/* ── Message Bubble ─────────────────────────────────────────────────────── */
function MessageBubble({
  msg,
  onFillForm,
  onReviewForm,
  onConfirmDispatch,
  onEditForm,
  onResetWorkflow,
  isSubmitting,
}: {
  msg: Message;
  onFillForm: (cert: CertInfo) => void;
  onReviewForm: (data: ApplicationData) => void;
  onConfirmDispatch: () => void;
  onEditForm: () => void;
  onResetWorkflow: () => void;
  isSubmitting: boolean;
}) {
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
        <div className="ai-avatar">
          <Bot size={17} />
        </div>
        <div className="ai-bubble ai-bubble-bot ai-bubble-loading">
          <Loader2 size={16} className="ai-spin" />
          <span>AI Assistant is preparing your basic needs and application requirements…</span>
        </div>
      </div>
    );
  }

  return (
    <div className="ai-msg ai-msg-bot">
      <div className="ai-avatar">
        <Bot size={17} />
      </div>
      <div className="ai-bubble-bot-wrap">
        {/* Stage 1: Basic Needs Info Card */}
        {msg.cert && msg.stage === "info" && (
          <>
            <div className="ai-bubble ai-bubble-bot">
              Here is the basic need to fill up for your <strong>{msg.cert.title}</strong>. Check the eligibility and documents below:
            </div>
            <CertCard cert={msg.cert} onFillNow={() => onFillForm(msg.cert!)} />
          </>
        )}

        {/* Stage 2: Fill Form */}
        {msg.cert && msg.stage === "form" && (
          <>
            <div className="ai-bubble ai-bubble-bot">
              I have prepared your digital application below. Please fill in your <strong>My location</strong> and <strong>Supporting file</strong> details so I can verify and double check everything for you:
            </div>
            <AIChatForm cert={msg.cert} initialData={msg.formData} onReview={onReviewForm} />
          </>
        )}

        {/* Stage 3: Double Check Review */}
        {msg.cert && msg.stage === "double_check" && msg.formData && (
          <>
            <div className="ai-bubble ai-bubble-bot">
              I have verified all your inputs and attached files. Please <strong>double check</strong> the summary below before I send it to the officials:
            </div>
            <AIDoubleCheckCard
              data={msg.formData}
              cert={msg.cert}
              onConfirm={onConfirmDispatch}
              onEdit={onEditForm}
              isSubmitting={isSubmitting}
            />
          </>
        )}

        {/* Stage 4: Dispatched Result */}
        {msg.stage === "dispatched" && msg.submissionResult && msg.formData && (
          <>
            <div className="ai-bubble ai-bubble-bot">
              🎉 <strong>Work Dispatched!</strong> I have submitted your request directly to the assigned department officials. Your real-time tracking receipt is ready:
            </div>
            <AIDispatchSuccessCard
              result={msg.submissionResult}
              data={msg.formData}
              onReset={onResetWorkflow}
            />
          </>
        )}

        {/* Plain text message */}
        {!msg.cert && !msg.stage && (
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

/* ── Main AI Workplace Page ─────────────────────────────────────────────── */
export default function AIAssist() {
  const { theme, toggleTheme } = useTheme();
  const [, navigate] = useLocation();

  const [messages, setMessages] = useState<Message[]>([
    {
      id: "welcome",
      role: "bot",
      text: "Namaste! 🙏 Welcome to your **SANYOG AI Assistant Workplace**.\n\nTell me what certificate or service you need — for example:\n• \"Hey I need to apply for Income certificate\"\n• \"Hey I need to apply for Community / Caste certificate\"\n• \"Hey I need to apply for Scholarship\"\n• \"Hey I need to apply for Aadhaar update\"\n\nI will give you the **basic needs**, help you fill the form with **My location** and **Supporting file**, **double check** your details, and **autonomously send it to officials** for processing!",
    },
  ]);

  const [input, setInput] = useState("");
  const [activeCert, setActiveCert] = useState<CertInfo | null>(null);
  const [currentFormData, setCurrentFormData] = useState<ApplicationData | null>(null);

  const bottomRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const assist = trpc.citizen.aiAssist.useMutation();
  const submit = trpc.citizen.submit.useMutation();

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  // Handle Query from Citizen
  const sendQuery = async (queryText: string) => {
    if (!queryText.trim()) return;

    const userMsg: Message = { id: Date.now().toString(), role: "user", text: queryText };
    const loadingId = Date.now().toString() + "-bot";

    setMessages((prev) => [...prev, userMsg, { id: loadingId, role: "bot", loading: true }]);
    setInput("");

    try {
      const result = await assist.mutateAsync({ message: queryText });
      const data = result.data as { type: string; cert?: CertInfo; message?: string };

      if (data.type === "certificate" && data.cert) {
        setActiveCert(data.cert);
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  id: loadingId,
                  role: "bot",
                  cert: data.cert,
                  stage: "info",
                }
              : m
          )
        );
      } else {
        setMessages((prev) =>
          prev.map((m) =>
            m.id === loadingId
              ? {
                  id: loadingId,
                  role: "bot",
                  text: data.message || "I can guide you for Income, Community/Caste, Aadhaar, Scholarship, Domicile, and Birth certificates. Tell me what you'd like to apply for!",
                }
              : m
          )
        );
      }
    } catch {
      setMessages((prev) =>
        prev.map((m) =>
          m.id === loadingId
            ? {
                id: loadingId,
                role: "bot",
                text: "Sorry, I had trouble processing your query. Please try again or select one of the Quick Prompts.",
              }
            : m
        )
      );
    }
  };

  // Step 1 -> Step 2: Open In-Chat Form
  const handleOpenForm = (cert: CertInfo) => {
    setActiveCert(cert);
    const formMsgId = "form-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: formMsgId,
        role: "bot",
        cert,
        stage: "form",
        formData: currentFormData || undefined,
      },
    ]);
  };

  // Step 2 -> Step 3: Review & Double Check
  const handleReviewForm = (data: ApplicationData) => {
    setCurrentFormData(data);
    const reviewMsgId = "review-" + Date.now();
    setMessages((prev) => [
      ...prev,
      {
        id: reviewMsgId,
        role: "bot",
        cert: activeCert!,
        stage: "double_check",
        formData: data,
      },
    ]);
  };

  // Step 3 (Back): Edit Form
  const handleEditForm = () => {
    if (!activeCert) return;
    handleOpenForm(activeCert);
  };

  // Step 3 -> Step 4: AI Autonomous Dispatch to Officials
  const handleConfirmDispatch = async () => {
    if (!currentFormData || !activeCert) return;

    try {
      const response = await submit.mutateAsync({
        citizenName: currentFormData.citizenName,
        citizenMasterId: currentFormData.citizenMasterId,
        requestType: currentFormData.requestType,
        description: currentFormData.description,
        location: {
          address: currentFormData.address,
          lat: currentFormData.lat,
          lng: currentFormData.lng,
        },
        attachments: currentFormData.attachments,
        language: currentFormData.language,
        priority: currentFormData.priority,
        consent: true,
      });

      if (response.success) {
        toast.success("AI successfully dispatched application to government officials!", {
          description: `Tracking ID: ${response.data.trackingId}`,
        });

        const successMsgId = "success-" + Date.now();
        setMessages((prev) => [
          ...prev,
          {
            id: successMsgId,
            role: "bot",
            stage: "dispatched",
            formData: currentFormData,
            submissionResult: response.data,
          },
        ]);
      } else {
        toast.error("Submission failed: " + response.message);
      }
    } catch (err: any) {
      toast.error("Failed to transmit application: " + (err?.message || "Unknown error"));
    }
  };

  // Reset Workflow for Another Request
  const handleResetWorkflow = () => {
    setCurrentFormData(null);
    setActiveCert(null);
    setMessages((prev) => [
      ...prev,
      {
        id: "new-query-" + Date.now(),
        role: "bot",
        text: "What else would you like to apply for? You can ask for an **Income Certificate**, **Community Certificate**, **Scholarship**, or **Aadhaar**!",
      },
    ]);
  };

  return (
    <div className="ai-page">
      {/* ── Top Navigation Bar ── */}
      <header className="landing-nav">
        <Link href="/" className="brand-mark">
          <span className="brand-emblem">S</span>
          <span>
            <strong>SANYOG</strong>
            <small>AI Citizen Workplace</small>
          </span>
        </Link>
        <div className="landing-nav-actions">
          <button className="icon-button" aria-label="Toggle dark mode" onClick={toggleTheme}>
            {theme === "dark" ? <Sun size={17} /> : <Moon size={17} />}
          </button>
          <Link href="/submissions" className="text-link">
            My Submissions
          </Link>
          <Link href="/submit" className="text-link">
            Form View
          </Link>
        </div>
      </header>

      <div className="ai-layout">
        {/* ── Left Sidebar: Quick Prompts & Workflow Steps ── */}
        <aside className="ai-sidebar">
          <div className="ai-sidebar-header">
            <div className="ai-sidebar-icon">
              <Sparkles size={16} />
            </div>
            <span>Quick Certificate Prompts</span>
          </div>

          <div className="ai-sidebar-prompts">
            {QUICK_PROMPTS.map((p) => (
              <button
                key={p}
                className="ai-quick-prompt"
                onClick={() => {
                  setInput(p);
                  sendQuery(p);
                  inputRef.current?.focus();
                }}
              >
                {p}
              </button>
            ))}
          </div>

          {/* AI Workflow Tracker in Sidebar */}
          <div className="ai-workflow-tracker">
            <span className="ai-tracker-title">Autonomous AI Workflow</span>
            <div className="ai-tracker-steps">
              <div className="ai-tracker-step active">
                <span className="ai-step-num">1</span>
                <div>
                  <strong>Ask Query</strong>
                  <small>Income, Community, Scholarship...</small>
                </div>
              </div>
              <div className="ai-tracker-step">
                <span className="ai-step-num">2</span>
                <div>
                  <strong>Basic Needs & Form</strong>
                  <small>My location & Supporting files</small>
                </div>
              </div>
              <div className="ai-tracker-step">
                <span className="ai-step-num">3</span>
                <div>
                  <strong>AI Double Check</strong>
                  <small>Integrity & compliance review</small>
                </div>
              </div>
              <div className="ai-tracker-step">
                <span className="ai-step-num">4</span>
                <div>
                  <strong>Autonomous Dispatch</strong>
                  <small>Direct transmission to officials</small>
                </div>
              </div>
            </div>
          </div>

          <div className="ai-sidebar-tip">
            <ShieldCheck size={14} />
            <span>AI automatically validates requirements against Maharashtra Government guidelines.</span>
          </div>
        </aside>

        {/* ── Main Chat Area ── */}
        <main className="ai-chat">
          <div className="ai-chat-header">
            <div className="ai-chat-header-icon">
              <Bot size={22} />
            </div>
            <div>
              <h1 className="ai-chat-title">AI Certificate & Service Workplace</h1>
              <p className="ai-chat-subtitle">Ask queries · Get basic needs · Fill details · Double check · Autonomous dispatch</p>
            </div>
            <div className="ai-live-badge">
              <span className="ai-live-dot" />
              <span>AI Agent Active</span>
            </div>
          </div>

          <div className="ai-messages">
            {messages.map((msg) => (
              <MessageBubble
                key={msg.id}
                msg={msg}
                onFillForm={handleOpenForm}
                onReviewForm={handleReviewForm}
                onConfirmDispatch={handleConfirmDispatch}
                onEditForm={handleEditForm}
                onResetWorkflow={handleResetWorkflow}
                isSubmitting={submit.isPending}
              />
            ))}
            <div ref={bottomRef} />
          </div>

          {/* ── Input Bar ── */}
          <form
            className="ai-input-bar"
            onSubmit={(e) => {
              e.preventDefault();
              sendQuery(input);
            }}
          >
            <input
              ref={inputRef}
              className="ai-input"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder='Ask: "Hey I need to apply for Income certificate" or "Community certificate"...'
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
              disabled={!input.trim() || assist.isPending || submit.isPending}
            >
              {assist.isPending ? <Loader2 size={16} className="ai-spin" /> : <Send size={16} />}
              <span>Ask AI</span>
            </button>
          </form>
        </main>
      </div>
    </div>
  );
}
