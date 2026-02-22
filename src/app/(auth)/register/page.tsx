"use client";

import { useState, useEffect, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";
import { MODULES } from "@/lib/constants/modules";

interface PricingTier {
  id: string;
  name: string;
  monthly_price: number;
  annual_price: number;
  max_modules: number | null;
  max_users: number | null;
  max_projects: number | null;
}

const COMPANY_TYPES = [
  "General Contractor",
  "Developer",
  "Property Manager",
  "Owner-Builder",
  "Subcontractor",
  "Specialty Trade",
  "Architecture / Engineering",
  "Other",
] as const;

const COMPANY_SIZES = [
  "1-10 employees",
  "11-50 employees",
  "51-200 employees",
  "201-500 employees",
  "500+ employees",
] as const;

function generateSlug(name: string): string {
  return name
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 60);
}

function getPasswordStrength(pw: string): number {
  if (!pw) return 0;
  let score = 0;
  if (pw.length >= 8) score++;
  if (/[A-Z]/.test(pw) && /[a-z]/.test(pw)) score++;
  if (/[0-9]/.test(pw)) score++;
  if (/[^A-Za-z0-9]/.test(pw)) score++;
  return score;
}

export default function RegisterPage() {
  const router = useRouter();

  const [step, setStep] = useState(1);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  // Pricing tiers (fetched on mount)
  const [pricingTiers, setPricingTiers] = useState<PricingTier[]>([]);

  useEffect(() => {
    fetch("/api/pricing")
      .then((r) => r.json())
      .then((data) => {
        if (Array.isArray(data)) setPricingTiers(data);
      })
      .catch(() => {});
  }, []);

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  // Step 2 fields
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [industryType, setIndustryType] = useState("");
  const [companySize, setCompanySize] = useState("");
  const [phone, setPhone] = useState("");
  const [website, setWebsite] = useState("");
  const [promoCode, setPromoCode] = useState("");
  const [promoValidating, setPromoValidating] = useState(false);
  const [promoStatus, setPromoStatus] = useState<"idle" | "valid" | "invalid">("idle");

  // Step 3 fields (Plan selection)
  const [selectedPlan, setSelectedPlan] = useState("starter");

  // Step 4 fields (Modules)
  const [selectedModules, setSelectedModules] = useState<string[]>(
    MODULES.filter((m) => m.defaultChecked).map((m) => m.key)
  );

  // Derive module limit from selected plan (use API data, fall back to defaults)
  const FALLBACK_MAX_MODULES: Record<string, number | null> = {
    starter: 3,
    professional: 6,
    enterprise: null,
  };

  const maxModulesForPlan = (() => {
    const tier = pricingTiers.find(
      (t) => t.name.toLowerCase() === selectedPlan.toLowerCase()
    );
    if (tier) return tier.max_modules;
    return FALLBACK_MAX_MODULES[selectedPlan] ?? null;
  })();

  const passwordStrength = getPasswordStrength(password);

  const handleCompanyNameChange = useCallback(
    (value: string) => {
      setCompanyName(value);
      if (!slugManuallyEdited) {
        setCompanySlug(generateSlug(value));
      }
    },
    [slugManuallyEdited]
  );

  function toggleModule(key: string) {
    setSelectedModules((prev) => {
      if (prev.includes(key)) return prev.filter((k) => k !== key);
      // Enforce max_modules limit
      if (maxModulesForPlan !== null && prev.length >= maxModulesForPlan) return prev;
      return [...prev, key];
    });
  }

  function validateStep1(): boolean {
    if (!fullName.trim()) {
      setError("Please enter your full name.");
      return false;
    }
    if (!email.trim()) {
      setError("Please enter your email address.");
      return false;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters.");
      return false;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match.");
      return false;
    }
    if (!acceptedTerms) {
      setError("You must agree to the Terms of Service and Privacy Policy.");
      return false;
    }
    return true;
  }

  function validateStep2(): boolean {
    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return false;
    }
    if (!companySlug.trim()) {
      setError("Company slug is required.");
      return false;
    }
    if (!industryType) {
      setError("Please select a company type.");
      return false;
    }
    if (!companySize) {
      setError("Please select a company size.");
      return false;
    }
    return true;
  }

  function handleStep1Next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (validateStep1()) {
      setStep(2);
    }
  }

  function handleStep2Next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (validateStep2()) {
      setStep(3);
    }
  }

  function handleStep3Next() {
    setError("");
    // Always trim modules down to the plan limit when entering step 4
    if (maxModulesForPlan !== null && selectedModules.length > maxModulesForPlan) {
      setSelectedModules((prev) => prev.slice(0, maxModulesForPlan));
    }
    setStep(4);
  }

  // Also block submit if somehow over limit
  function validateStep4(): boolean {
    if (maxModulesForPlan !== null && selectedModules.length > maxModulesForPlan) {
      setError(`Your plan allows up to ${maxModulesForPlan} modules. Please deselect some.`);
      return false;
    }
    if (selectedModules.length === 0) {
      setError("Please select at least one module.");
      return false;
    }
    return true;
  }

  async function validatePromo() {
    if (!promoCode.trim()) return;
    setPromoValidating(true);
    setPromoStatus("idle");
    try {
      const res = await fetch("/api/promo-codes/validate", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: promoCode.trim() }),
      });
      setPromoStatus(res.ok ? "valid" : "invalid");
    } catch {
      setPromoStatus("invalid");
    } finally {
      setPromoValidating(false);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (!validateStep4()) return;
    setLoading(true);

    try {
      const res = await fetch("/api/auth/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email,
          password,
          full_name: fullName,
          company_name: companyName,
          company_slug: companySlug,
          industry_type: industryType,
          company_size: companySize,
          phone: phone || null,
          website: website || null,
          selected_modules: selectedModules,
          subscription_plan: selectedPlan,
          accepted_terms: true,
          promo_code: promoCode.trim() || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Auto sign-in after successful registration
      const supabase = createClient();
      const { error: signInError } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (signInError) {
        // Fallback: send to login if auto sign-in fails
        router.push("/login?registered=true");
        return;
      }

      router.push("/dashboard");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  const checkIcon = (
    <svg
      width="14"
      height="14"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth="3"
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );

  return (
    <div className="auth-card">
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle">
        Get started with Buildwrk in four quick steps.
      </p>

      {/* Step Indicator */}
      <div className="auth-steps">
        <div
          className={`auth-step ${step === 1 ? "auth-step-active" : ""} ${step > 1 ? "auth-step-done" : ""}`}
        >
          <span className="auth-step-number">
            {step > 1 ? checkIcon : "1"}
          </span>
          <span className="auth-step-label">Account</span>
        </div>
        <div
          className={`auth-step ${step === 2 ? "auth-step-active" : ""} ${step > 2 ? "auth-step-done" : ""}`}
        >
          <span className="auth-step-number">
            {step > 2 ? checkIcon : "2"}
          </span>
          <span className="auth-step-label">Company</span>
        </div>
        <div
          className={`auth-step ${step === 3 ? "auth-step-active" : ""} ${step > 3 ? "auth-step-done" : ""}`}
        >
          <span className="auth-step-number">
            {step > 3 ? checkIcon : "3"}
          </span>
          <span className="auth-step-label">Plan</span>
        </div>
        <div
          className={`auth-step ${step === 4 ? "auth-step-active" : ""}`}
        >
          <span className="auth-step-number">4</span>
          <span className="auth-step-label">Modules</span>
        </div>
      </div>

      {error && (
        <div className="auth-error">
          <span className="auth-error-icon">
            <svg
              width="16"
              height="16"
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <circle cx="12" cy="12" r="10" />
              <line x1="12" y1="8" x2="12" y2="12" />
              <line x1="12" y1="16" x2="12.01" y2="16" />
            </svg>
          </span>
          <span className="auth-error-text">{error}</span>
        </div>
      )}

      {/* Step 1: Account Details */}
      {step === 1 && (
        <form onSubmit={handleStep1Next}>
          <div className="auth-field">
            <label htmlFor="fullName" className="auth-label">
              Full Name
            </label>
            <input
              id="fullName"
              type="text"
              className="auth-input"
              placeholder="John Smith"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              required
              autoComplete="name"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="regEmail" className="auth-label">
              Email Address
            </label>
            <input
              id="regEmail"
              type="email"
              className="auth-input"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="regPassword" className="auth-label">
              Password
            </label>
            <input
              id="regPassword"
              type="password"
              className="auth-input"
              placeholder="Minimum 8 characters"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="new-password"
              minLength={8}
            />
            {password.length > 0 && (
              <>
                <div className="auth-password-strength">
                  {[1, 2, 3, 4].map((level) => (
                    <div
                      key={level}
                      className={`auth-password-bar ${
                        passwordStrength >= level
                          ? passwordStrength <= 1
                            ? "active-weak"
                            : passwordStrength <= 2
                              ? "active-medium"
                              : "active-strong"
                          : ""
                      }`}
                    />
                  ))}
                </div>
                <div className="auth-password-hint">
                  {passwordStrength <= 1
                    ? "Weak -- add uppercase, numbers, or symbols"
                    : passwordStrength <= 2
                      ? "Fair -- consider adding more variety"
                      : passwordStrength <= 3
                        ? "Good -- almost there"
                        : "Strong password"}
                </div>
              </>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="confirmPassword" className="auth-label">
              Confirm Password
            </label>
            <input
              id="confirmPassword"
              type="password"
              className="auth-input"
              placeholder="Re-enter your password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              autoComplete="new-password"
            />
          </div>

          <div className="auth-field">
            <label
              style={{
                display: "flex",
                alignItems: "flex-start",
                gap: "10px",
                fontSize: "0.82rem",
                color: "var(--text)",
                lineHeight: 1.5,
                cursor: "pointer",
              }}
            >
              <input
                type="checkbox"
                checked={acceptedTerms}
                onChange={(e) => setAcceptedTerms(e.target.checked)}
                style={{
                  marginTop: "3px",
                  accentColor: "var(--color-blue)",
                  width: "16px",
                  height: "16px",
                  flexShrink: 0,
                }}
              />
              <span>
                I agree to the{" "}
                <Link href="/terms" style={{ color: "var(--color-amber)", textDecoration: "none", fontWeight: 500 }}>
                  Terms of Service
                </Link>{" "}
                and{" "}
                <Link href="/privacy" style={{ color: "var(--color-amber)", textDecoration: "none", fontWeight: 500 }}>
                  Privacy Policy
                </Link>
              </span>
            </label>
          </div>

          <button type="submit" className="auth-btn">
            Continue
          </button>
        </form>
      )}

      {/* Step 2: Company Setup */}
      {step === 2 && (
        <form onSubmit={handleStep2Next}>
          <div className="auth-field">
            <label htmlFor="companyName" className="auth-label">
              Company Name
            </label>
            <input
              id="companyName"
              type="text"
              className="auth-input"
              placeholder="Acme Construction LLC"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              required
            />
            {companySlug && (
              <div className="auth-slug-preview">
                Your workspace: <code>app.Buildwrk.com/{companySlug}</code>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="industryType" className="auth-label">
              Company Type
            </label>
            <select
              id="industryType"
              className="auth-select"
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
              required
            >
              <option value="">Select a company type...</option>
              {COMPANY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label htmlFor="companySize" className="auth-label">
              Company Size
            </label>
            <select
              id="companySize"
              className="auth-select"
              value={companySize}
              onChange={(e) => setCompanySize(e.target.value)}
              required
            >
              <option value="">Select company size...</option>
              {COMPANY_SIZES.map((size) => (
                <option key={size} value={size}>
                  {size}
                </option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label htmlFor="phone" className="auth-label">
              Phone Number{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <input
              id="phone"
              type="tel"
              className="auth-input"
              placeholder="(555) 123-4567"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              autoComplete="tel"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="website" className="auth-label">
              Company Website{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <input
              id="website"
              type="text"
              className="auth-input"
              placeholder="www.example.com"
              value={website}
              onChange={(e) => setWebsite(e.target.value)}
              autoComplete="url"
            />
          </div>

          <div className="auth-field">
            <label htmlFor="promoCode" className="auth-label">
              Promo Code{" "}
              <span style={{ color: "var(--muted)", fontWeight: 400 }}>
                (optional)
              </span>
            </label>
            <div style={{ display: "flex", gap: "8px" }}>
              <input
                id="promoCode"
                type="text"
                className="auth-input"
                placeholder="Enter code"
                value={promoCode}
                onChange={(e) => {
                  setPromoCode(e.target.value.toUpperCase());
                  setPromoStatus("idle");
                }}
                style={{ flex: 1, textTransform: "uppercase", letterSpacing: "0.05em" }}
              />
              {promoCode.trim() && (
                <button
                  type="button"
                  className="auth-btn-secondary"
                  onClick={validatePromo}
                  disabled={promoValidating}
                  style={{ width: "auto", padding: "0 16px", flex: "0 0 auto" }}
                >
                  {promoValidating ? "..." : "Verify"}
                </button>
              )}
            </div>
            {promoStatus === "valid" && (
              <div style={{ color: "var(--color-green)", fontSize: "0.78rem", marginTop: "4px" }}>
                Promo code is valid and will be applied.
              </div>
            )}
            {promoStatus === "invalid" && (
              <div style={{ color: "var(--color-red)", fontSize: "0.78rem", marginTop: "4px" }}>
                Invalid or expired promo code.
              </div>
            )}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                setError("");
                setStep(1);
              }}
              style={{ flex: "0 0 auto", width: "auto", padding: "0 24px" }}
            >
              Back
            </button>
            <button
              type="submit"
              className="auth-btn"
              style={{ flex: 1 }}
            >
              Continue
            </button>
          </div>
        </form>
      )}

      {/* Step 3: Select Plan */}
      {step === 3 && (
        <div>
          <p style={{
            fontSize: "0.85rem",
            color: "var(--muted)",
            marginBottom: "20px",
            lineHeight: 1.5,
          }}>
            Choose a plan to get started. You can upgrade anytime.
          </p>

          <div style={{ display: "flex", flexDirection: "column", gap: "12px", marginBottom: "24px" }}>
            {(pricingTiers.length > 0
              ? pricingTiers
              : [
                  { id: "starter", name: "Starter", monthly_price: 99, annual_price: 79, max_modules: 3, max_users: 10, max_projects: 5 },
                  { id: "professional", name: "Professional", monthly_price: 299, annual_price: 249, max_modules: 6, max_users: 50, max_projects: 25 },
                  { id: "enterprise", name: "Enterprise", monthly_price: 599, annual_price: 499, max_modules: null, max_users: null, max_projects: null },
                ]
            ).map((tier) => {
              const isSelected = selectedPlan === tier.name.toLowerCase();
              return (
                <label
                  key={tier.id}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: "14px",
                    padding: "16px",
                    borderRadius: "10px",
                    border: `1.5px solid ${isSelected ? "var(--color-blue)" : "var(--border)"}`,
                    background: isSelected ? "rgba(37, 99, 235, 0.04)" : "var(--bg)",
                    cursor: "pointer",
                    transition: "border-color 0.15s, background 0.15s",
                  }}
                >
                  <input
                    type="radio"
                    name="plan"
                    checked={isSelected}
                    onChange={() => setSelectedPlan(tier.name.toLowerCase())}
                    style={{ position: "absolute", opacity: 0, width: 0, height: 0 }}
                  />
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "50%",
                      border: `2px solid ${isSelected ? "var(--color-blue)" : "var(--border)"}`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected && (
                      <div
                        style={{
                          width: "10px",
                          height: "10px",
                          borderRadius: "50%",
                          background: "var(--color-blue)",
                        }}
                      />
                    )}
                  </div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: "0.9rem", fontWeight: 600, color: "var(--text)" }}>
                      {tier.name}
                    </div>
                    <div style={{ fontSize: "0.75rem", color: "var(--muted)", marginTop: "2px" }}>
                      {tier.max_modules === null ? "Unlimited modules" : `Up to ${tier.max_modules} modules`}
                      {" · "}
                      {tier.max_users === null ? "Unlimited users" : `${tier.max_users} users`}
                      {" · "}
                      {tier.max_projects === null ? "Unlimited projects" : `${tier.max_projects} projects`}
                    </div>
                  </div>
                  <div style={{ textAlign: "right", flexShrink: 0 }}>
                    <div style={{ fontSize: "1.1rem", fontWeight: 700, color: "var(--text)" }}>
                      {tier.monthly_price === 0 ? "Free" : `$${tier.monthly_price}`}
                    </div>
                    {tier.monthly_price > 0 && (
                      <div style={{ fontSize: "0.7rem", color: "var(--muted)" }}>/month</div>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                setError("");
                setStep(2);
              }}
              style={{ flex: "0 0 auto", width: "auto", padding: "0 24px" }}
            >
              Back
            </button>
            <button
              type="button"
              className="auth-btn"
              onClick={handleStep3Next}
              style={{ flex: 1 }}
            >
              Continue
            </button>
          </div>
        </div>
      )}

      {/* Step 4: Select Modules */}
      {step === 4 && (
        <form onSubmit={handleSubmit}>
          <p style={{
            fontSize: "0.85rem",
            color: "var(--muted)",
            marginBottom: "8px",
            lineHeight: 1.5,
          }}>
            {maxModulesForPlan !== null
              ? `Your ${selectedPlan.charAt(0).toUpperCase() + selectedPlan.slice(1)} plan includes up to ${maxModulesForPlan} modules. Pick the ones that matter most — you can change these later.`
              : "Choose the modules you need. You can always change these later."
            }
          </p>
          {maxModulesForPlan !== null && (
            <p style={{
              fontSize: "0.85rem",
              color: selectedModules.length >= maxModulesForPlan ? "var(--color-amber)" : "var(--color-blue)",
              marginBottom: "20px",
              fontWeight: 600,
            }}>
              {selectedModules.length} / {maxModulesForPlan} modules selected
              {selectedModules.length >= maxModulesForPlan && " — limit reached"}
            </p>
          )}

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: "12px",
              marginBottom: "24px",
            }}
          >
            {MODULES.map((mod) => {
              const isSelected = selectedModules.includes(mod.key);
              const isDisabled = !isSelected && maxModulesForPlan !== null && selectedModules.length >= maxModulesForPlan;
              return (
                <label
                  key={mod.key}
                  style={{
                    display: "flex",
                    alignItems: "flex-start",
                    gap: "10px",
                    padding: "14px 12px",
                    borderRadius: "10px",
                    border: `1.5px solid ${isSelected ? "var(--color-blue)" : "var(--border)"}`,
                    background: isSelected ? "rgba(37, 99, 235, 0.04)" : "var(--bg)",
                    cursor: isDisabled ? "not-allowed" : "pointer",
                    opacity: isDisabled ? 0.5 : 1,
                    transition: "border-color 0.15s, background 0.15s, opacity 0.15s",
                  }}
                >
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleModule(mod.key)}
                    disabled={isDisabled}
                    style={{
                      position: "absolute",
                      opacity: 0,
                      width: 0,
                      height: 0,
                      pointerEvents: "none",
                    }}
                  />
                  <div
                    style={{
                      width: "34px",
                      height: "34px",
                      borderRadius: "8px",
                      background: `${mod.color}18`,
                      color: mod.color,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      fontSize: "0.7rem",
                      fontWeight: 700,
                      letterSpacing: "0.02em",
                      flexShrink: 0,
                    }}
                  >
                    {mod.icon}
                  </div>
                  <div style={{ minWidth: 0 }}>
                    <div
                      style={{
                        fontSize: "0.82rem",
                        fontWeight: 600,
                        color: "var(--text)",
                        lineHeight: 1.3,
                      }}
                    >
                      {mod.name}
                    </div>
                    <div
                      style={{
                        fontSize: "0.72rem",
                        color: "var(--muted)",
                        lineHeight: 1.4,
                        marginTop: "2px",
                      }}
                    >
                      {mod.description}
                    </div>
                  </div>
                  <div
                    style={{
                      width: "18px",
                      height: "18px",
                      borderRadius: "4px",
                      border: `1.5px solid ${isSelected ? "var(--color-blue)" : "var(--border)"}`,
                      background: isSelected ? "var(--color-blue)" : "transparent",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                      marginLeft: "auto",
                      marginTop: "2px",
                      transition: "all 0.15s",
                    }}
                  >
                    {isSelected && (
                      <svg
                        width="11"
                        height="11"
                        viewBox="0 0 24 24"
                        fill="none"
                        stroke="#fff"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      >
                        <polyline points="20 6 9 17 4 12" />
                      </svg>
                    )}
                  </div>
                </label>
              );
            })}
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                setError("");
                setStep(3);
              }}
              disabled={loading}
              style={{ flex: "0 0 auto", width: "auto", padding: "0 24px" }}
            >
              Back
            </button>
            <button
              type="submit"
              className="auth-btn"
              disabled={loading}
              style={{ flex: 1 }}
            >
              {loading ? (
                <span className="auth-spinner" />
              ) : (
                "Create Account"
              )}
            </button>
          </div>
        </form>
      )}

      <div className="auth-footer">
        Already have an account?{" "}
        <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
