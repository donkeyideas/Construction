"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

interface DailyLogClientProps {
  projects: Array<{ id: string; name: string; code: string }>;
}

const weatherConditions = [
  "Clear",
  "Partly Cloudy",
  "Overcast",
  "Rain",
  "Heavy Rain",
  "Snow",
  "Sleet",
  "Fog",
  "Windy",
  "Hot",
  "Cold",
];

export default function DailyLogClient({ projects }: DailyLogClientProps) {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const [logDate, setLogDate] = useState(
    new Date().toISOString().slice(0, 10)
  );
  const [projectId, setProjectId] = useState(
    projects.length > 0 ? projects[0].id : ""
  );
  const [weatherCondition, setWeatherCondition] = useState("");
  const [weatherTempHigh, setWeatherTempHigh] = useState("");
  const [weatherTempLow, setWeatherTempLow] = useState("");
  const [workforceCount, setWorkforceCount] = useState("");
  const [workPerformed, setWorkPerformed] = useState("");
  const [safetyIncident, setSafetyIncident] = useState(false);
  const [safetyNotes, setSafetyNotes] = useState("");
  const [visitors, setVisitors] = useState("");

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setError(null);
    setSuccess(false);

    if (!projectId) {
      setError("Please select a project.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/mobile/daily-log", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          log_date: logDate,
          project_id: projectId,
          weather_condition: weatherCondition || null,
          weather_temp_high: weatherTempHigh
            ? Number(weatherTempHigh)
            : null,
          weather_temp_low: weatherTempLow
            ? Number(weatherTempLow)
            : null,
          workforce: workforceCount
            ? { total: Number(workforceCount) }
            : null,
          work_performed: workPerformed || null,
          safety_incident: safetyIncident,
          safety_notes: safetyNotes || null,
          visitors: visitors || null,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to submit daily log.");
        return;
      }

      setSuccess(true);
      // Reset form
      setWorkPerformed("");
      setWeatherCondition("");
      setWeatherTempHigh("");
      setWeatherTempLow("");
      setWorkforceCount("");
      setSafetyIncident(false);
      setSafetyNotes("");
      setVisitors("");
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="mobile-card">
        {/* Date */}
        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="log-date">
            Date
          </label>
          <input
            id="log-date"
            type="date"
            className="mobile-form-input"
            value={logDate}
            onChange={(e) => setLogDate(e.target.value)}
            required
          />
        </div>

        {/* Project */}
        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="log-project">
            Project
          </label>
          <select
            id="log-project"
            className="mobile-form-select"
            value={projectId}
            onChange={(e) => setProjectId(e.target.value)}
            required
          >
            <option value="">Select a project</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.code})
              </option>
            ))}
          </select>
        </div>

        {/* Weather */}
        <div className="mobile-section-title" style={{ marginTop: "8px" }}>
          Weather Conditions
        </div>

        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="weather-condition">
            Condition
          </label>
          <select
            id="weather-condition"
            className="mobile-form-select"
            value={weatherCondition}
            onChange={(e) => setWeatherCondition(e.target.value)}
          >
            <option value="">Select condition</option>
            {weatherConditions.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
        </div>

        <div style={{ display: "flex", gap: "10px" }}>
          <div className="mobile-form-field" style={{ flex: 1 }}>
            <label className="mobile-form-label" htmlFor="temp-high">
              High (F)
            </label>
            <input
              id="temp-high"
              type="number"
              className="mobile-form-input"
              value={weatherTempHigh}
              onChange={(e) => setWeatherTempHigh(e.target.value)}
              placeholder="--"
            />
          </div>
          <div className="mobile-form-field" style={{ flex: 1 }}>
            <label className="mobile-form-label" htmlFor="temp-low">
              Low (F)
            </label>
            <input
              id="temp-low"
              type="number"
              className="mobile-form-input"
              value={weatherTempLow}
              onChange={(e) => setWeatherTempLow(e.target.value)}
              placeholder="--"
            />
          </div>
        </div>

        {/* Workforce */}
        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="workforce-count">
            Workforce Count
          </label>
          <input
            id="workforce-count"
            type="number"
            className="mobile-form-input"
            value={workforceCount}
            onChange={(e) => setWorkforceCount(e.target.value)}
            placeholder="Number of workers on site"
          />
        </div>

        {/* Work Performed */}
        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="work-performed">
            Work Performed
          </label>
          <textarea
            id="work-performed"
            className="mobile-form-textarea"
            value={workPerformed}
            onChange={(e) => setWorkPerformed(e.target.value)}
            placeholder="Describe work performed today..."
          />
        </div>

        {/* Safety Incidents */}
        <div className="mobile-form-field">
          <label
            style={{
              display: "flex",
              alignItems: "center",
              gap: "8px",
              fontSize: "0.8rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            <input
              type="checkbox"
              checked={safetyIncident}
              onChange={(e) => setSafetyIncident(e.target.checked)}
              style={{ width: "18px", height: "18px" }}
            />
            Safety Incident Occurred
          </label>
        </div>

        {safetyIncident && (
          <div className="mobile-form-field">
            <label className="mobile-form-label" htmlFor="safety-notes">
              Incident Details
            </label>
            <textarea
              id="safety-notes"
              className="mobile-form-textarea"
              value={safetyNotes}
              onChange={(e) => setSafetyNotes(e.target.value)}
              placeholder="Describe the incident..."
              style={{ minHeight: "80px" }}
            />
          </div>
        )}

        {/* Visitors */}
        <div className="mobile-form-field">
          <label className="mobile-form-label" htmlFor="visitors">
            Visitors
          </label>
          <input
            id="visitors"
            type="text"
            className="mobile-form-input"
            value={visitors}
            onChange={(e) => setVisitors(e.target.value)}
            placeholder="Names of visitors on site (if any)"
          />
        </div>

        {/* Submit */}
        <button
          type="submit"
          className="mobile-submit-btn"
          disabled={loading}
        >
          {loading ? "Submitting..." : "Submit Daily Log"}
        </button>

        {error && (
          <p
            style={{
              color: "var(--color-red)",
              fontSize: "0.8rem",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            {error}
          </p>
        )}

        {success && (
          <p
            style={{
              color: "var(--color-green)",
              fontSize: "0.8rem",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            Daily log submitted successfully.
          </p>
        )}
      </div>
    </form>
  );
}
