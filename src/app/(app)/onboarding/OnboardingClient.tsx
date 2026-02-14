"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  Building2,
  Users,
  Upload,
  Sparkles,
  CheckCircle2,
  ArrowRight,
  ArrowLeft,
  SkipForward,
  Loader2,
  HardHat,
  BarChart3,
  Shield,
  DollarSign,
} from "lucide-react";

interface OnboardingClientProps {
  companyId: string;
  companyName: string;
  industryType: string;
  memberCount: number;
  userRole: string;
}

const MODULES = [
  { key: "projects", label: "Project Management", icon: HardHat, desc: "Track projects, daily logs, RFIs, submittals" },
  { key: "financial", label: "Financial Management", icon: DollarSign, desc: "Invoices, AP/AR, general ledger, job costing" },
  { key: "properties", label: "Property Management", icon: Building2, desc: "Leases, maintenance, tenant portal" },
  { key: "safety", label: "Safety & Compliance", icon: Shield, desc: "Incidents, inspections, toolbox talks" },
  { key: "reports", label: "Reports & Analytics", icon: BarChart3, desc: "Financial reports, KPIs, portfolio analysis" },
  { key: "crm", label: "CRM & Bids", icon: Sparkles, desc: "Pipeline management, bid tracking" },
];

const STEPS = [
  { title: "Company Profile", icon: Building2 },
  { title: "Invite Team", icon: Users },
  { title: "Import Data", icon: Upload },
  { title: "Choose Modules", icon: Sparkles },
  { title: "All Set!", icon: CheckCircle2 },
];

export default function OnboardingClient({
  companyId,
  companyName,
  industryType,
  memberCount,
  userRole,
}: OnboardingClientProps) {
  const router = useRouter();
  const [step, setStep] = useState(0);
  const [saving, setSaving] = useState(false);

  // Step 1: Company profile
  const [editName, setEditName] = useState(companyName);
  const [editIndustry, setEditIndustry] = useState(industryType);

  // Step 2: Invite team
  const [inviteEmails, setInviteEmails] = useState("");

  // Step 4: Modules
  const [selectedModules, setSelectedModules] = useState<string[]>(
    MODULES.map((m) => m.key)
  );

  function toggleModule(key: string) {
    setSelectedModules((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  }

  async function handleSaveProfile() {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: editName.trim() || companyName,
          industry: editIndustry || null,
        }),
      });
    } catch { /* ignore */ }
    setSaving(false);
    nextStep();
  }

  async function handleInvite() {
    const emails = inviteEmails
      .split(/[,;\n]+/)
      .map((e) => e.trim())
      .filter((e) => e.includes("@"));

    if (emails.length > 0) {
      setSaving(true);
      try {
        await fetch("/api/admin/users/invite", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ emails }),
        });
      } catch { /* ignore */ }
      setSaving(false);
    }
    nextStep();
  }

  async function handleComplete() {
    setSaving(true);
    try {
      await fetch("/api/admin/settings", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          settings: {
            onboarding_modules: selectedModules,
          },
        }),
      });
      // Mark onboarding complete
      await fetch("/api/onboarding/complete", { method: "POST" });
    } catch { /* ignore */ }
    setSaving(false);
    router.push("/dashboard");
    router.refresh();
  }

  function nextStep() {
    setStep((s) => Math.min(s + 1, STEPS.length - 1));
  }

  function prevStep() {
    setStep((s) => Math.max(s - 1, 0));
  }

  return (
    <div style={{
      maxWidth: "700px",
      margin: "40px auto",
      padding: "0 20px",
    }}>
      {/* Progress */}
      <div style={{ display: "flex", alignItems: "center", gap: "4px", marginBottom: "32px" }}>
        {STEPS.map((s, i) => (
          <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: "6px" }}>
            <div
              style={{
                width: "36px",
                height: "36px",
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                background: i <= step ? "var(--color-blue)" : "var(--surface)",
                color: i <= step ? "#fff" : "var(--muted)",
                border: `2px solid ${i <= step ? "var(--color-blue)" : "var(--border)"}`,
                fontSize: "0",
                transition: "all 0.2s",
              }}
            >
              {i < step ? <CheckCircle2 size={18} /> : <s.icon size={16} />}
            </div>
            <span style={{ fontSize: "0.68rem", color: i <= step ? "var(--foreground)" : "var(--muted)", textAlign: "center" }}>
              {s.title}
            </span>
          </div>
        ))}
      </div>

      {/* Step Content */}
      <div style={{
        background: "var(--surface)",
        border: "1px solid var(--border)",
        borderRadius: "16px",
        padding: "32px",
      }}>
        {/* Step 0: Company Profile */}
        {step === 0 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>Welcome to Buildwrk!</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              Let&apos;s get your company set up. You can always change these later in Settings.
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="settings-field-label">Company Name</label>
                <input
                  type="text"
                  className="settings-field-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="settings-field-label">Industry</label>
                <select
                  className="settings-field-select"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                >
                  <option value="">Select industry...</option>
                  <option value="General Contracting">General Contracting</option>
                  <option value="Residential Construction">Residential Construction</option>
                  <option value="Commercial Construction">Commercial Construction</option>
                  <option value="Heavy Civil">Heavy Civil</option>
                  <option value="Specialty Trade">Specialty Trade</option>
                  <option value="Real Estate Development">Real Estate Development</option>
                  <option value="Engineering">Engineering</option>
                  <option value="Architecture">Architecture</option>
                  <option value="Other">Other</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button onClick={nextStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <SkipForward size={14} /> Skip
              </button>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                {saving ? <Loader2 size={14} className="spin-icon" /> : <ArrowRight size={14} />}
                Save &amp; Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Invite Team */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>Invite Your Team</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "8px" }}>
              You currently have {memberCount} team member{memberCount !== 1 ? "s" : ""}.
              Add email addresses below to invite more.
            </p>
            <textarea
              className="ticket-form-textarea"
              placeholder="Enter email addresses, separated by commas or new lines..."
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={4}
              style={{ width: "100%", marginBottom: "8px" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              Team members will receive an invitation email to join {editName || companyName}.
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={nextStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  <SkipForward size={14} /> Skip
                </button>
                <button onClick={handleInvite} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  {saving ? <Loader2 size={14} className="spin-icon" /> : <ArrowRight size={14} />}
                  {inviteEmails.trim() ? "Invite & Continue" : "Continue"}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Import Data */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>Import Existing Data</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              If you have existing data, you can import it via CSV/XLSX on any page using the Import button.
              You can also do this later from the individual module pages.
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}>
              {[
                { label: "Projects", href: "/projects" },
                { label: "Properties", href: "/properties" },
                { label: "Contacts", href: "/people" },
                { label: "Financial Data", href: "/financial" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="btn-secondary"
                  style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}
                >
                  <Upload size={20} />
                  Import {item.label}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={nextStep} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowRight size={14} /> Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Modules */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>Choose Your Modules</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              Select the modules you plan to use. All modules are included in your plan.
              You can enable or disable them at any time.
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "10px" }}>
              {MODULES.map((m) => {
                const selected = selectedModules.includes(m.key);
                return (
                  <button
                    key={m.key}
                    type="button"
                    onClick={() => toggleModule(m.key)}
                    style={{
                      padding: "14px",
                      borderRadius: "10px",
                      border: `2px solid ${selected ? "var(--color-blue)" : "var(--border)"}`,
                      background: selected ? "rgba(59, 130, 246, 0.05)" : "transparent",
                      cursor: "pointer",
                      textAlign: "left",
                      display: "flex",
                      alignItems: "flex-start",
                      gap: "10px",
                      color: "var(--foreground)",
                    }}
                  >
                    <m.icon size={20} style={{ flexShrink: 0, color: selected ? "var(--color-blue)" : "var(--muted)", marginTop: "2px" }} />
                    <div>
                      <div style={{ fontWeight: 600, fontSize: "0.85rem" }}>{m.label}</div>
                      <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>{m.desc}</div>
                    </div>
                    {selected && (
                      <CheckCircle2 size={18} style={{ flexShrink: 0, color: "var(--color-blue)", marginLeft: "auto" }} />
                    )}
                  </button>
                );
              })}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={nextStep} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowRight size={14} /> Continue
              </button>
            </div>
          </div>
        )}

        {/* Step 4: All Set */}
        {step === 4 && (
          <div style={{ textAlign: "center" }}>
            <div style={{
              width: "64px",
              height: "64px",
              borderRadius: "50%",
              background: "var(--color-green)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              margin: "0 auto 16px",
              color: "#fff",
            }}>
              <CheckCircle2 size={32} />
            </div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>You&apos;re All Set!</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
              Your company is configured and ready to go. Head to the dashboard to start managing your projects, properties, and finances.
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> Back
              </button>
              <button onClick={handleComplete} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", padding: "10px 24px" }}>
                {saving ? <Loader2 size={16} className="spin-icon" /> : <Sparkles size={16} />}
                Go to Dashboard
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
