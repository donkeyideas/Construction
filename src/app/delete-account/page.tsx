import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Delete Account | Buildwrk",
  description: "Request deletion of your Buildwrk account and associated data.",
};

export default function DeleteAccountPage() {
  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#0a0a1a",
        color: "#e2e8f0",
        fontFamily: "var(--font-sans), system-ui, sans-serif",
        display: "flex",
        justifyContent: "center",
        padding: "3rem 1rem",
      }}
    >
      <div style={{ maxWidth: "640px", width: "100%" }}>
        <div style={{ marginBottom: "2rem" }}>
          <a
            href="/"
            style={{
              color: "#3b82f6",
              textDecoration: "none",
              fontSize: "0.875rem",
            }}
          >
            &larr; Back to Buildwrk
          </a>
        </div>

        <h1
          style={{
            fontSize: "2rem",
            fontWeight: 700,
            marginBottom: "0.5rem",
            color: "#ffffff",
          }}
        >
          Delete Your Account
        </h1>

        <p style={{ color: "#94a3b8", marginBottom: "2rem", lineHeight: 1.6 }}>
          We&apos;re sorry to see you go. You can request complete deletion of
          your Buildwrk account and all associated data.
        </p>

        <div
          style={{
            backgroundColor: "#1e293b",
            borderRadius: "12px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#ffffff",
            }}
          >
            How to Delete Your Account
          </h2>

          <ol
            style={{
              paddingLeft: "1.25rem",
              lineHeight: 1.8,
              color: "#cbd5e1",
            }}
          >
            <li>
              Send an email to{" "}
              <a
                href="mailto:support@buildwrk.com?subject=Account%20Deletion%20Request"
                style={{ color: "#3b82f6", textDecoration: "underline" }}
              >
                support@buildwrk.com
              </a>{" "}
              with the subject line <strong>&quot;Account Deletion Request&quot;</strong>.
            </li>
            <li>
              Include the email address associated with your Buildwrk account.
            </li>
            <li>
              Our team will verify your identity and process your request within
              7 business days.
            </li>
            <li>
              You will receive a confirmation email once your account and data
              have been deleted.
            </li>
          </ol>
        </div>

        <div
          style={{
            backgroundColor: "#1e293b",
            borderRadius: "12px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#ffffff",
            }}
          >
            What Data Will Be Deleted
          </h2>

          <p style={{ color: "#cbd5e1", lineHeight: 1.6, marginBottom: "1rem" }}>
            When you request account deletion, the following data will be
            permanently removed:
          </p>

          <ul
            style={{
              paddingLeft: "1.25rem",
              lineHeight: 1.8,
              color: "#cbd5e1",
            }}
          >
            <li>Your user profile (name, email, phone number)</li>
            <li>Authentication credentials</li>
            <li>Company membership and role assignments</li>
            <li>Time entries and clock-in/clock-out records</li>
            <li>Daily log entries and uploaded photos</li>
            <li>Any other personally identifiable information</li>
          </ul>

          <p
            style={{
              color: "#94a3b8",
              lineHeight: 1.6,
              marginTop: "1rem",
              fontSize: "0.875rem",
            }}
          >
            Note: If you are the sole owner of a company account, deleting your
            account will also remove the company and all associated project data.
            Please transfer ownership before requesting deletion if you wish to
            preserve company data.
          </p>
        </div>

        <div
          style={{
            backgroundColor: "#1e293b",
            borderRadius: "12px",
            padding: "2rem",
            marginBottom: "2rem",
          }}
        >
          <h2
            style={{
              fontSize: "1.25rem",
              fontWeight: 600,
              marginBottom: "1rem",
              color: "#ffffff",
            }}
          >
            Data Retention
          </h2>

          <ul
            style={{
              paddingLeft: "1.25rem",
              lineHeight: 1.8,
              color: "#cbd5e1",
            }}
          >
            <li>
              Account data is deleted within 30 days of your confirmed request.
            </li>
            <li>
              Backups containing your data are purged within 90 days.
            </li>
            <li>
              We may retain anonymized, aggregated data that cannot identify you.
            </li>
            <li>
              Data required by law (e.g., financial records for tax compliance)
              may be retained as legally required.
            </li>
          </ul>
        </div>

        <div
          style={{
            textAlign: "center",
            marginTop: "2rem",
            paddingTop: "2rem",
            borderTop: "1px solid #334155",
          }}
        >
          <a
            href="mailto:support@buildwrk.com?subject=Account%20Deletion%20Request"
            style={{
              display: "inline-block",
              backgroundColor: "#dc2626",
              color: "#ffffff",
              padding: "0.75rem 2rem",
              borderRadius: "8px",
              textDecoration: "none",
              fontWeight: 600,
              fontSize: "1rem",
            }}
          >
            Request Account Deletion
          </a>

          <p
            style={{
              color: "#64748b",
              fontSize: "0.8rem",
              marginTop: "1.5rem",
            }}
          >
            &copy; {new Date().getFullYear()} Buildwrk. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
