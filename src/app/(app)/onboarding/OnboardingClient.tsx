"use client";

import { useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useTranslations, useLocale } from "next-intl";
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

// Module and step keys are defined outside the component; labels are translated inside via useMemo
const MODULE_KEYS = [
  { key: "projects", icon: HardHat },
  { key: "financial", icon: DollarSign },
  { key: "properties", icon: Building2 },
  { key: "safety", icon: Shield },
  { key: "reports", icon: BarChart3 },
  { key: "crm", icon: Sparkles },
] as const;

const STEP_KEYS = [
  { key: "companyProfile", icon: Building2 },
  { key: "inviteTeam", icon: Users },
  { key: "importData", icon: Upload },
  { key: "chooseModules", icon: Sparkles },
  { key: "allSet", icon: CheckCircle2 },
] as const;

export default function OnboardingClient({
  companyId,
  companyName,
  industryType,
  memberCount,
  userRole,
}: OnboardingClientProps) {
  const t = useTranslations("app");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  const MODULES = useMemo(() => MODULE_KEYS.map((m) => ({
    ...m,
    label: t(`onboardingModule_${m.key}_label`),
    desc: t(`onboardingModule_${m.key}_desc`),
  })), [t]);

  const STEPS = useMemo(() => STEP_KEYS.map((s) => ({
    ...s,
    title: t(`onboardingStep_${s.key}`),
  })), [t]);

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
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>{t("onboardingWelcome")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              {t("onboardingWelcomeDesc")}
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: "16px" }}>
              <div>
                <label className="settings-field-label">{t("onboardingCompanyName")}</label>
                <input
                  type="text"
                  className="settings-field-input"
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                />
              </div>
              <div>
                <label className="settings-field-label">{t("onboardingIndustry")}</label>
                <select
                  className="settings-field-select"
                  value={editIndustry}
                  onChange={(e) => setEditIndustry(e.target.value)}
                >
                  <option value="">{t("onboardingSelectIndustry")}</option>
                  <option value="General Contracting">{t("onboardingIndustryGeneralContracting")}</option>
                  <option value="Residential Construction">{t("onboardingIndustryResidential")}</option>
                  <option value="Commercial Construction">{t("onboardingIndustryCommercial")}</option>
                  <option value="Heavy Civil">{t("onboardingIndustryHeavyCivil")}</option>
                  <option value="Specialty Trade">{t("onboardingIndustrySpecialtyTrade")}</option>
                  <option value="Real Estate Development">{t("onboardingIndustryRealEstate")}</option>
                  <option value="Engineering">{t("onboardingIndustryEngineering")}</option>
                  <option value="Architecture">{t("onboardingIndustryArchitecture")}</option>
                  <option value="Other">{t("onboardingIndustryOther")}</option>
                </select>
              </div>
            </div>
            <div style={{ display: "flex", justifyContent: "flex-end", gap: "10px", marginTop: "24px" }}>
              <button onClick={nextStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <SkipForward size={14} /> {t("skip")}
              </button>
              <button onClick={handleSaveProfile} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                {saving ? <Loader2 size={14} className="spin-icon" /> : <ArrowRight size={14} />}
                {t("onboardingSaveAndContinue")}
              </button>
            </div>
          </div>
        )}

        {/* Step 1: Invite Team */}
        {step === 1 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>{t("onboardingInviteTeam")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "8px" }}>
              {t("onboardingInviteTeamDesc", { count: memberCount })}
            </p>
            <textarea
              className="ticket-form-textarea"
              placeholder={t("onboardingInvitePlaceholder")}
              value={inviteEmails}
              onChange={(e) => setInviteEmails(e.target.value)}
              rows={4}
              style={{ width: "100%", marginBottom: "8px" }}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--muted)" }}>
              {t("onboardingInviteNote", { company: editName || companyName })}
            </p>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> {t("back")}
              </button>
              <div style={{ display: "flex", gap: "10px" }}>
                <button onClick={nextStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  <SkipForward size={14} /> {t("skip")}
                </button>
                <button onClick={handleInvite} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                  {saving ? <Loader2 size={14} className="spin-icon" /> : <ArrowRight size={14} />}
                  {inviteEmails.trim() ? t("onboardingInviteAndContinue") : t("continue")}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Step 2: Import Data */}
        {step === 2 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>{t("onboardingImportData")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              {t("onboardingImportDataDesc")}
            </p>
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
            }}>
              {[
                { label: t("onboardingImportProjects"), href: "/projects" },
                { label: t("onboardingImportProperties"), href: "/properties" },
                { label: t("onboardingImportContacts"), href: "/people" },
                { label: t("onboardingImportFinancial"), href: "/financial" },
              ].map((item) => (
                <button
                  key={item.label}
                  onClick={() => router.push(item.href)}
                  className="btn-secondary"
                  style={{ padding: "16px", display: "flex", flexDirection: "column", alignItems: "center", gap: "8px", fontSize: "0.85rem" }}
                >
                  <Upload size={20} />
                  {t("onboardingImportLabel", { name: item.label })}
                </button>
              ))}
            </div>
            <div style={{ display: "flex", justifyContent: "space-between", marginTop: "24px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> {t("back")}
              </button>
              <button onClick={nextStep} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowRight size={14} /> {t("continue")}
              </button>
            </div>
          </div>
        )}

        {/* Step 3: Choose Modules */}
        {step === 3 && (
          <div>
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>{t("onboardingChooseModules")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
              {t("onboardingChooseModulesDesc")}
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
                <ArrowLeft size={14} /> {t("back")}
              </button>
              <button onClick={nextStep} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowRight size={14} /> {t("continue")}
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
            <h2 style={{ fontSize: "1.3rem", marginBottom: "8px" }}>{t("onboardingAllSet")}</h2>
            <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginBottom: "24px", maxWidth: "400px", margin: "0 auto 24px" }}>
              {t("onboardingAllSetDesc")}
            </p>
            <div style={{ display: "flex", justifyContent: "center", gap: "10px" }}>
              <button onClick={prevStep} className="btn-secondary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.85rem" }}>
                <ArrowLeft size={14} /> {t("back")}
              </button>
              <button onClick={handleComplete} disabled={saving} className="btn-primary" style={{ display: "flex", alignItems: "center", gap: "6px", fontSize: "0.9rem", padding: "10px 24px" }}>
                {saving ? <Loader2 size={16} className="spin-icon" /> : <Sparkles size={16} />}
                {t("onboardingGoToDashboard")}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
