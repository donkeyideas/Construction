import Link from "next/link";

export const metadata = {
  title: "Maintenance - Buildwrk",
};

export default function MaintenancePage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--bg, #0f1117)",
        color: "var(--text, #e5e7eb)",
        padding: "2rem",
      }}
    >
      <div style={{ maxWidth: 520, textAlign: "center" }}>
        {/* Wrench icon */}
        <div
          style={{
            width: 80,
            height: 80,
            borderRadius: "50%",
            background: "rgba(245, 158, 11, 0.12)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 1.5rem",
          }}
        >
          <svg
            width="36"
            height="36"
            viewBox="0 0 24 24"
            fill="none"
            stroke="#f59e0b"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z" />
          </svg>
        </div>

        <h1
          style={{
            fontSize: "1.75rem",
            fontWeight: 700,
            marginBottom: "0.75rem",
          }}
        >
          We&apos;ll Be Right Back
        </h1>

        <p
          style={{
            fontSize: "1.05rem",
            color: "var(--muted, #9ca3af)",
            lineHeight: 1.6,
            marginBottom: "2rem",
          }}
        >
          Buildwrk is currently undergoing scheduled maintenance. We&apos;re
          working hard to improve your experience. Please check back shortly.
        </p>

        <div
          style={{
            padding: "1rem 1.5rem",
            background: "rgba(245, 158, 11, 0.08)",
            border: "1px solid rgba(245, 158, 11, 0.2)",
            borderRadius: 10,
            fontSize: "0.88rem",
            color: "#f59e0b",
            marginBottom: "2rem",
          }}
        >
          If you are a platform administrator,{" "}
          <Link
            href="/login"
            style={{ color: "#f59e0b", textDecoration: "underline" }}
          >
            sign in here
          </Link>{" "}
          to access the dashboard.
        </div>

        <p
          style={{
            fontSize: "0.82rem",
            color: "var(--muted, #6b7280)",
          }}
        >
          Questions? Contact us at{" "}
          <a
            href="mailto:info@donkeyideas.com"
            style={{ color: "var(--primary, #3b82f6)" }}
          >
            info@donkeyideas.com
          </a>
        </p>
      </div>
    </div>
  );
}
