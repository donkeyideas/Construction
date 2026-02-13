"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Save, X } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface CompanyMember {
  user_id: string;
  role: string;
  user: {
    id: string;
    full_name: string;
    email: string;
  };
}

const PROJECT_TYPES = [
  "Commercial",
  "Residential",
  "Industrial",
  "Infrastructure",
  "Renovation",
  "Mixed-Use",
  "Healthcare",
  "Education",
  "Hospitality",
  "Government",
  "Other",
];

function generateProjectCode() {
  const now = new Date();
  const yr = now.getFullYear().toString().slice(-2);
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `PRJ-${yr}-${seq}`;
}

export default function NewProjectPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [members, setMembers] = useState<CompanyMember[]>([]);

  // Form fields
  const [name, setName] = useState("");
  const [code, setCode] = useState(generateProjectCode());
  const [description, setDescription] = useState("");
  const [projectType, setProjectType] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [addressLine1, setAddressLine1] = useState("");
  const [city, setCity] = useState("");
  const [state, setState] = useState("");
  const [zip, setZip] = useState("");
  const [contractAmount, setContractAmount] = useState("");
  const [estimatedCost, setEstimatedCost] = useState("");
  const [startDate, setStartDate] = useState("");
  const [estimatedEndDate, setEstimatedEndDate] = useState("");
  const [projectManagerId, setProjectManagerId] = useState("");
  const [superintendentId, setSuperintendentId] = useState("");

  // Load company members for dropdowns
  useEffect(() => {
    async function loadMembers() {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) return;

      const { data: membership } = await supabase
        .from("company_members")
        .select("company_id")
        .eq("user_id", user.id)
        .limit(1)
        .single();

      if (!membership) return;

      const { data } = await supabase
        .from("company_members")
        .select(
          `
          user_id,
          role,
          user:user_profiles!company_members_user_profile_fkey(id, full_name, email)
        `
        )
        .eq("company_id", membership.company_id)
        .order("role", { ascending: true });

      if (data) {
        setMembers(data as unknown as CompanyMember[]);
      }
    }

    loadMembers();
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!name.trim()) {
      setError("Project name is required.");
      return;
    }

    if (!code.trim()) {
      setError("Project code is required.");
      return;
    }

    setLoading(true);

    try {
      const body: Record<string, unknown> = {
        name: name.trim(),
        code: code.trim(),
        description: description.trim() || undefined,
        project_type: projectType || undefined,
        client_name: clientName.trim() || undefined,
        address_line1: addressLine1.trim() || undefined,
        city: city.trim() || undefined,
        state: state.trim() || undefined,
        zip: zip.trim() || undefined,
        contract_amount: contractAmount ? parseFloat(contractAmount) : undefined,
        estimated_cost: estimatedCost ? parseFloat(estimatedCost) : undefined,
        start_date: startDate || undefined,
        estimated_end_date: estimatedEndDate || undefined,
        project_manager_id: projectManagerId || undefined,
        superintendent_id: superintendentId || undefined,
      };

      // Store client contact info in metadata if provided
      if (clientEmail.trim() || clientPhone.trim()) {
        body.metadata = {
          client_email: clientEmail.trim() || undefined,
          client_phone: clientPhone.trim() || undefined,
        };
      }

      const res = await fetch("/api/projects", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });

      const result = await res.json();

      if (!res.ok) {
        setError(result.error ?? "Failed to create project.");
        setLoading(false);
        return;
      }

      router.push(`/projects/${result.id}`);
    } catch (err) {
      console.error("Create project error:", err);
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  }

  return (
    <div>
      {/* Header */}
      <div className="projects-header">
        <div>
          <div style={{ marginBottom: 8 }}>
            <Link
              href="/projects"
              style={{
                fontSize: "0.82rem",
                color: "var(--muted)",
                textDecoration: "none",
                display: "inline-flex",
                alignItems: "center",
                gap: 4,
              }}
            >
              <ArrowLeft size={14} /> Back to Projects
            </Link>
          </div>
          <h2>New Project</h2>
          <p className="projects-header-sub">
            Fill out the details below to create a new project.
          </p>
        </div>
      </div>

      {error && <div className="form-error">{error}</div>}

      <form onSubmit={handleSubmit} className="project-form">
        {/* Basic Info */}
        <div className="project-form-section">
          <div className="card-title">Basic Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="name">
                Project Name *
              </label>
              <input
                id="name"
                type="text"
                className="form-input"
                placeholder="e.g. Harbor Ridge Mixed-Use"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="code">
                Project Code *
              </label>
              <input
                id="code"
                type="text"
                className="form-input"
                placeholder="e.g. PRJ-26-0042"
                value={code}
                onChange={(e) => setCode(e.target.value)}
                required
              />
              <span className="form-hint">
                Auto-generated. You can customize it.
              </span>
            </div>
            <div className="form-group full-width">
              <label className="form-label" htmlFor="description">
                Description
              </label>
              <textarea
                id="description"
                className="form-textarea"
                placeholder="Brief description of the project scope and objectives..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="projectType">
                Project Type
              </label>
              <select
                id="projectType"
                className="form-select"
                value={projectType}
                onChange={(e) => setProjectType(e.target.value)}
              >
                <option value="">Select type...</option>
                {PROJECT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Client Info */}
        <div className="project-form-section">
          <div className="card-title">Client Information</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="clientName">
                Client Name
              </label>
              <input
                id="clientName"
                type="text"
                className="form-input"
                placeholder="e.g. Meridian Development Group"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="clientEmail">
                Client Email
              </label>
              <input
                id="clientEmail"
                type="email"
                className="form-input"
                placeholder="contact@client.com"
                value={clientEmail}
                onChange={(e) => setClientEmail(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="clientPhone">
                Client Phone
              </label>
              <input
                id="clientPhone"
                type="tel"
                className="form-input"
                placeholder="(555) 123-4567"
                value={clientPhone}
                onChange={(e) => setClientPhone(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Location */}
        <div className="project-form-section">
          <div className="card-title">Project Location</div>
          <div className="form-grid">
            <div className="form-group full-width">
              <label className="form-label" htmlFor="addressLine1">
                Street Address
              </label>
              <input
                id="addressLine1"
                type="text"
                className="form-input"
                placeholder="123 Main Street"
                value={addressLine1}
                onChange={(e) => setAddressLine1(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="city">
                City
              </label>
              <input
                id="city"
                type="text"
                className="form-input"
                placeholder="San Francisco"
                value={city}
                onChange={(e) => setCity(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="state">
                State
              </label>
              <input
                id="state"
                type="text"
                className="form-input"
                placeholder="CA"
                value={state}
                onChange={(e) => setState(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="zip">
                ZIP Code
              </label>
              <input
                id="zip"
                type="text"
                className="form-input"
                placeholder="94105"
                value={zip}
                onChange={(e) => setZip(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Financial */}
        <div className="project-form-section">
          <div className="card-title">Financial Details</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="contractAmount">
                Contract Amount ($)
              </label>
              <input
                id="contractAmount"
                type="number"
                className="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={contractAmount}
                onChange={(e) => setContractAmount(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="estimatedCost">
                Estimated Cost ($)
              </label>
              <input
                id="estimatedCost"
                type="number"
                className="form-input"
                placeholder="0.00"
                min="0"
                step="0.01"
                value={estimatedCost}
                onChange={(e) => setEstimatedCost(e.target.value)}
              />
            </div>
          </div>
        </div>

        {/* Schedule and Team */}
        <div className="project-form-section">
          <div className="card-title">Schedule and Team</div>
          <div className="form-grid">
            <div className="form-group">
              <label className="form-label" htmlFor="startDate">
                Start Date
              </label>
              <input
                id="startDate"
                type="date"
                className="form-input"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="estimatedEndDate">
                Estimated End Date
              </label>
              <input
                id="estimatedEndDate"
                type="date"
                className="form-input"
                value={estimatedEndDate}
                onChange={(e) => setEstimatedEndDate(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="projectManager">
                Project Manager
              </label>
              <select
                id="projectManager"
                className="form-select"
                value={projectManagerId}
                onChange={(e) => setProjectManagerId(e.target.value)}
              >
                <option value="">Select PM...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
            <div className="form-group">
              <label className="form-label" htmlFor="superintendent">
                Superintendent
              </label>
              <select
                id="superintendent"
                className="form-select"
                value={superintendentId}
                onChange={(e) => setSuperintendentId(e.target.value)}
              >
                <option value="">Select superintendent...</option>
                {members.map((m) => (
                  <option key={m.user_id} value={m.user_id}>
                    {m.user.full_name} ({m.role})
                  </option>
                ))}
              </select>
            </div>
          </div>
        </div>

        {/* Actions */}
        <div className="form-actions">
          <Link href="/projects" className="btn-secondary">
            <X size={14} />
            Cancel
          </Link>
          <button type="submit" className="btn-primary" disabled={loading}>
            <Save size={14} />
            {loading ? "Creating..." : "Create Project"}
          </button>
        </div>
      </form>
    </div>
  );
}
