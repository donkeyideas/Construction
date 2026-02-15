"use client";

import { useState, FormEvent, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";

const INDUSTRY_TYPES = [
  "General Contracting",
  "Residential Construction",
  "Commercial Construction",
  "Heavy / Civil Engineering",
  "Specialty Trade",
  "Real Estate Development",
  "Property Management",
  "Architecture / Engineering",
  "Renovation / Remodeling",
  "Other",
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

  // Step 1 fields
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");

  // Step 2 fields
  const [companyName, setCompanyName] = useState("");
  const [companySlug, setCompanySlug] = useState("");
  const [slugManuallyEdited, setSlugManuallyEdited] = useState(false);
  const [industryType, setIndustryType] = useState("");
  const [phone, setPhone] = useState("");

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

  function handleSlugChange(value: string) {
    setSlugManuallyEdited(true);
    setCompanySlug(generateSlug(value));
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
    return true;
  }

  function handleStep1Next(e: FormEvent) {
    e.preventDefault();
    setError("");
    if (validateStep1()) {
      setStep(2);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");

    if (!companyName.trim()) {
      setError("Please enter your company name.");
      return;
    }
    if (!companySlug.trim()) {
      setError("Company slug is required.");
      return;
    }
    if (!industryType) {
      setError("Please select an industry type.");
      return;
    }

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
          phone: phone || null,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || "Registration failed. Please try again.");
        setLoading(false);
        return;
      }

      // Redirect to login with success message
      router.push("/login?registered=true");
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Create your account</h1>
      <p className="auth-subtitle">
        Get started with Buildwrk in two quick steps.
      </p>

      {/* Step Indicator */}
      <div className="auth-steps">
        <div
          className={`auth-step ${step === 1 ? "auth-step-active" : ""} ${step > 1 ? "auth-step-done" : ""}`}
        >
          <span className="auth-step-number">
            {step > 1 ? (
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
            ) : (
              "1"
            )}
          </span>
          <span className="auth-step-label">Account</span>
        </div>
        <div
          className={`auth-step ${step === 2 ? "auth-step-active" : ""}`}
        >
          <span className="auth-step-number">2</span>
          <span className="auth-step-label">Company</span>
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

      {/* Step 1: Account Info */}
      {step === 1 && (
        <form onSubmit={handleStep1Next}>
          <div className="auth-field">
            <label htmlFor="fullName" className="auth-label">
              Full name
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
              Email address
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
              Confirm password
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

          <button type="submit" className="auth-btn">
            Continue
          </button>
        </form>
      )}

      {/* Step 2: Company Setup */}
      {step === 2 && (
        <form onSubmit={handleSubmit}>
          <div className="auth-field">
            <label htmlFor="companyName" className="auth-label">
              Company name
            </label>
            <input
              id="companyName"
              type="text"
              className="auth-input"
              placeholder="Acme Construction LLC"
              value={companyName}
              onChange={(e) => handleCompanyNameChange(e.target.value)}
              required
              disabled={loading}
            />
          </div>

          <div className="auth-field">
            <label htmlFor="companySlug" className="auth-label">
              Company URL slug
            </label>
            <input
              id="companySlug"
              type="text"
              className="auth-input"
              placeholder="acme-construction-llc"
              value={companySlug}
              onChange={(e) => handleSlugChange(e.target.value)}
              required
              disabled={loading}
            />
            {companySlug && (
              <div className="auth-slug-preview">
                Your workspace: <code>app.Buildwrk.com/{companySlug}</code>
              </div>
            )}
          </div>

          <div className="auth-field">
            <label htmlFor="industryType" className="auth-label">
              Industry type
            </label>
            <select
              id="industryType"
              className="auth-select"
              value={industryType}
              onChange={(e) => setIndustryType(e.target.value)}
              required
              disabled={loading}
            >
              <option value="">Select an industry...</option>
              {INDUSTRY_TYPES.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>

          <div className="auth-field">
            <label htmlFor="phone" className="auth-label">
              Phone number{" "}
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
              disabled={loading}
            />
          </div>

          <div style={{ display: "flex", gap: "12px" }}>
            <button
              type="button"
              className="auth-btn-secondary"
              onClick={() => {
                setError("");
                setStep(1);
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
