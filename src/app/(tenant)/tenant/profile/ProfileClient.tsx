"use client";

import { useState, FormEvent } from "react";
import { useRouter } from "next/navigation";
import {
  User,
  Mail,
  Phone,
  Home,
  Calendar,
  DollarSign,
  Pencil,
  Check,
  X,
} from "lucide-react";
import type { TenantProfile } from "@/lib/queries/tenant-portal";
import { useTranslations, useLocale } from "next-intl";
import { formatDateLong } from "@/lib/utils/format";

export default function ProfileClient({
  profile,
}: {
  profile: TenantProfile;
}) {
  const t = useTranslations("tenant");
  const locale = useLocale();
  const dateLocale = locale === "es" ? "es" : "en-US";

  function formatDate(dateStr: string): string {
    return formatDateLong(dateStr);
  }

  function formatCurrency(amount: number): string {
    return new Intl.NumberFormat(dateLocale, {
      style: "currency",
      currency: "USD",
      minimumFractionDigits: 0,
    }).format(amount);
  }

  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [fullName, setFullName] = useState(profile.full_name ?? "");
  const [phone, setPhone] = useState(profile.phone ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  function startEdit() {
    setFullName(profile.full_name ?? "");
    setPhone(profile.phone ?? "");
    setEditing(true);
    setError("");
    setSuccess("");
  }

  function cancelEdit() {
    setEditing(false);
    setError("");
  }

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError("");

    try {
      const res = await fetch("/api/tenant/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ full_name: fullName, phone }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || t("failedUpdateProfile"));
      }

      setEditing(false);
      setSuccess(t("profileUpdated"));
      router.refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : t("somethingWentWrong"));
    } finally {
      setSaving(false);
    }
  }

  return (
    <div>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 24, flexWrap: "wrap", gap: 12 }}>
        <div>
          <h2 style={{ fontFamily: "var(--font-serif)", fontSize: "2rem", fontWeight: 700, margin: 0 }}>
            {t("profileTitle")}
          </h2>
          <p style={{ color: "var(--muted)", fontSize: "0.9rem", marginTop: 2 }}>
            {t("profileSubtitle")}
          </p>
        </div>
        {!editing && (
          <button
            className="ui-btn ui-btn-md ui-btn-outline"
            onClick={startEdit}
            style={{ display: "inline-flex", alignItems: "center", gap: 6 }}
          >
            <Pencil size={15} />
            {t("editProfile")}
          </button>
        )}
      </div>

      {success && (
        <div className="tenant-alert tenant-alert-success">{success}</div>
      )}

      {error && (
        <div className="tenant-alert tenant-alert-error">{error}</div>
      )}

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 1fr",
          gap: 20,
        }}
      >
        {/* Personal Information */}
        <div className="card" style={{ padding: 24 }}>
          <h3
            style={{
              margin: "0 0 20px 0",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <User size={18} style={{ color: "var(--color-amber)" }} />
            {t("personalInfo")}
          </h3>

          {editing ? (
            <form onSubmit={handleSave}>
              <div className="tenant-field">
                <label className="tenant-label">{t("fullName")}</label>
                <input
                  type="text"
                  className="tenant-form-input"
                  value={fullName}
                  onChange={(e) => setFullName(e.target.value)}
                  placeholder={t("enterFullName")}
                  disabled={saving}
                />
              </div>

              <div className="tenant-field">
                <label className="tenant-label">{t("email")}</label>
                <input
                  type="email"
                  className="tenant-form-input"
                  value={profile.email}
                  disabled
                  style={{ opacity: 0.6 }}
                />
                <div
                  style={{
                    fontSize: "0.75rem",
                    color: "var(--muted)",
                    marginTop: 4,
                  }}
                >
                  {t("emailChangeNote")}
                </div>
              </div>

              <div className="tenant-field">
                <label className="tenant-label">{t("phone")}</label>
                <input
                  type="tel"
                  className="tenant-form-input"
                  value={phone}
                  onChange={(e) => setPhone(e.target.value)}
                  placeholder={t("phonePlaceholder")}
                  disabled={saving}
                />
              </div>

              <div
                style={{
                  display: "flex",
                  gap: 10,
                  justifyContent: "flex-end",
                  marginTop: 8,
                }}
              >
                <button
                  type="button"
                  className="ui-btn ui-btn-sm ui-btn-outline"
                  onClick={cancelEdit}
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <X size={14} />
                  {t("cancel")}
                </button>
                <button
                  type="submit"
                  className="ui-btn ui-btn-sm ui-btn-primary"
                  disabled={saving}
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    gap: 4,
                  }}
                >
                  <Check size={14} />
                  {saving ? t("saving") : t("saveChanges")}
                </button>
              </div>
            </form>
          ) : (
            <div>
              <div className="tenant-profile-row">
                <User size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("fullName")}</div>
                  <div className="tenant-profile-row-value">
                    {profile.full_name || (
                      <span
                        style={{ color: "var(--muted)", fontStyle: "italic" }}
                      >
                        {t("notSet")}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="tenant-profile-row">
                <Mail size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("email")}</div>
                  <div className="tenant-profile-row-value">
                    {profile.email}
                  </div>
                </div>
              </div>

              <div
                className="tenant-profile-row"
                style={{ borderBottom: "none" }}
              >
                <Phone size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("phone")}</div>
                  <div className="tenant-profile-row-value">
                    {profile.phone || (
                      <span
                        style={{ color: "var(--muted)", fontStyle: "italic" }}
                      >
                        {t("notSet")}
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Lease Information */}
        <div className="card" style={{ padding: 24 }}>
          <h3
            style={{
              margin: "0 0 20px 0",
              fontSize: "0.95rem",
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Home size={18} style={{ color: "var(--color-amber)" }} />
            {t("leaseInfo")}
          </h3>

          {profile.lease ? (
            <div>
              <div className="tenant-profile-row">
                <Home size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("property")}</div>
                  <div className="tenant-profile-row-value">
                    {profile.lease.property_name}
                  </div>
                </div>
              </div>

              <div className="tenant-profile-row">
                <Home size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("unitLabel", { unit: profile.lease.unit_name })}</div>
                  <div className="tenant-profile-row-value">
                    {profile.lease.unit_name}
                  </div>
                </div>
              </div>

              <div className="tenant-profile-row">
                <Calendar size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("leasePeriod")}</div>
                  <div className="tenant-profile-row-value">
                    {formatDate(profile.lease.lease_start)} {"\u2014"}{" "}
                    {formatDate(profile.lease.lease_end)}
                  </div>
                </div>
              </div>

              <div className="tenant-profile-row">
                <DollarSign size={15} style={{ color: "var(--muted)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("monthlyRent")}</div>
                  <div className="tenant-profile-row-value">
                    {formatCurrency(profile.lease.monthly_rent)}
                  </div>
                </div>
              </div>

              <div
                className="tenant-profile-row"
                style={{ borderBottom: "none" }}
              >
                <Check size={15} style={{ color: "var(--color-green)" }} />
                <div>
                  <div className="tenant-profile-row-label">{t("status")}</div>
                  <div className="tenant-profile-row-value">
                    <span className="badge badge-green">
                      {profile.lease.status}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div
              style={{
                textAlign: "center",
                padding: "20px 0",
                color: "var(--muted)",
                fontSize: "0.85rem",
              }}
            >
              {t("noActiveLeaseProfile")}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
