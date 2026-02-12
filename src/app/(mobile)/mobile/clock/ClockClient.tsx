"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface ClockClientProps {
  isClockedIn: boolean;
  openEntryId: string | null;
  openEntryClockIn: string | null;
  todayHours: number;
  projects: Array<{ id: string; name: string; code: string }>;
}

export default function ClockClient({
  isClockedIn: initialClockedIn,
  openEntryId,
  openEntryClockIn,
  todayHours,
  projects,
}: ClockClientProps) {
  const router = useRouter();
  const [clockedIn, setClockedIn] = useState(initialClockedIn);
  const [selectedProject, setSelectedProject] = useState(
    projects.length > 0 ? projects[0].id : ""
  );
  const [elapsed, setElapsed] = useState("00:00:00");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Calculate elapsed time
  const updateElapsed = useCallback(() => {
    if (!clockedIn || !openEntryClockIn) {
      setElapsed("00:00:00");
      return;
    }

    const start = new Date(openEntryClockIn).getTime();
    const diff = Math.max(0, Date.now() - start);
    const h = Math.floor(diff / 3600000);
    const m = Math.floor((diff % 3600000) / 60000);
    const s = Math.floor((diff % 60000) / 1000);
    setElapsed(
      `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`
    );
  }, [clockedIn, openEntryClockIn]);

  useEffect(() => {
    updateElapsed();
    const interval = setInterval(updateElapsed, 1000);
    return () => clearInterval(interval);
  }, [updateElapsed]);

  async function getGPS(): Promise<{
    lat: number | null;
    lng: number | null;
  }> {
    return new Promise((resolve) => {
      if (!navigator.geolocation) {
        resolve({ lat: null, lng: null });
        return;
      }
      navigator.geolocation.getCurrentPosition(
        (pos) =>
          resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
        () => resolve({ lat: null, lng: null }),
        { timeout: 5000, enableHighAccuracy: true }
      );
    });
  }

  async function handleClockIn() {
    setLoading(true);
    setError(null);

    try {
      const gps = await getGPS();
      const res = await fetch("/api/mobile/clock", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          project_id: selectedProject || null,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to clock in");
        return;
      }

      setClockedIn(true);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  async function handleClockOut() {
    if (!openEntryId) return;
    setLoading(true);
    setError(null);

    try {
      const gps = await getGPS();
      const res = await fetch("/api/mobile/clock", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entry_id: openEntryId,
          gps_lat: gps.lat,
          gps_lng: gps.lng,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        setError(data.error || "Failed to clock out");
        return;
      }

      setClockedIn(false);
      router.refresh();
    } catch {
      setError("Network error. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <>
      {/* Timer Display */}
      <div className="mobile-card">
        <div className="timer-display">
          <div className="timer-time">{elapsed}</div>
          <div className="timer-label">
            {clockedIn ? "Time on the clock" : "Ready to start"}
          </div>
        </div>

        {/* Project Selector */}
        {!clockedIn && projects.length > 0 && (
          <div className="mobile-form-field" style={{ marginBottom: "12px" }}>
            <label className="mobile-form-label" htmlFor="project-select">
              Project
            </label>
            <select
              id="project-select"
              className="mobile-form-select"
              value={selectedProject}
              onChange={(e) => setSelectedProject(e.target.value)}
            >
              <option value="">No project</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.code})
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Clock Button */}
        {clockedIn ? (
          <button
            className="clock-btn clock-btn-out"
            onClick={handleClockOut}
            disabled={loading}
          >
            {loading ? "Clocking Out..." : "Clock Out"}
          </button>
        ) : (
          <button
            className="clock-btn clock-btn-in"
            onClick={handleClockIn}
            disabled={loading}
          >
            {loading ? "Clocking In..." : "Clock In"}
          </button>
        )}

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

        {todayHours > 0 && (
          <p
            style={{
              fontSize: "0.75rem",
              color: "var(--muted)",
              textAlign: "center",
              marginTop: "8px",
            }}
          >
            Total today: {todayHours.toFixed(1)} hours
          </p>
        )}
      </div>
    </>
  );
}
