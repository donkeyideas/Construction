"use client";

import { useState, FormEvent } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/client";

export default function ForgotPasswordPage() {
  const [email, setEmail] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  const [loading, setLoading] = useState(false);

  const supabase = createClient();

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError("");
    setLoading(true);

    try {
      const { error: resetError } = await supabase.auth.resetPasswordForEmail(
        email,
        {
          redirectTo: `${window.location.origin}/api/auth/callback?next=/dashboard`,
        }
      );

      if (resetError) {
        setError(resetError.message);
        setLoading(false);
        return;
      }

      setSuccess(true);
      setLoading(false);
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  if (success) {
    return (
      <div className="auth-card">
        <h1 className="auth-title">Check your email</h1>
        <p className="auth-subtitle">
          We sent a password reset link to <strong>{email}</strong>. Click the
          link in the email to reset your password.
        </p>
        <p
          style={{
            fontSize: "0.85rem",
            color: "var(--muted)",
            lineHeight: 1.6,
            marginBottom: 24,
          }}
        >
          Didn&apos;t receive it? Check your spam folder or try again.
        </p>
        <button
          type="button"
          className="auth-btn-secondary"
          onClick={() => {
            setSuccess(false);
            setEmail("");
          }}
        >
          Try another email
        </button>
        <div className="auth-footer">
          <Link href="/login">Back to sign in</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-card">
      <h1 className="auth-title">Reset password</h1>
      <p className="auth-subtitle">
        Enter the email address associated with your account and we&apos;ll send
        you a link to reset your password.
      </p>

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

      <form onSubmit={handleSubmit}>
        <div className="auth-field">
          <label htmlFor="email" className="auth-label">
            Email address
          </label>
          <input
            id="email"
            type="email"
            className="auth-input"
            placeholder="you@company.com"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
            disabled={loading}
          />
        </div>

        <button
          type="submit"
          className="auth-btn"
          disabled={loading}
          style={{ marginTop: 8 }}
        >
          {loading ? <span className="auth-spinner" /> : "Send Reset Link"}
        </button>
      </form>

      <div className="auth-footer">
        Remember your password? <Link href="/login">Sign in</Link>
      </div>
    </div>
  );
}
