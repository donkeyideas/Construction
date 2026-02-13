"use client";

import { useState, useMemo, useCallback, useEffect, useRef } from "react";
import Link from "next/link";
import {
  ChevronLeft,
  ChevronRight,
  Calendar as CalendarIcon,
  ExternalLink,
  X,
  Plus,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { CalendarEvent, CalendarModule } from "@/lib/queries/calendar";

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

type ViewMode = "month" | "week" | "day";

interface CalendarClientProps {
  initialEvents: CalendarEvent[];
  companyId: string;
  initialYear: number;
  initialMonth: number; // 1-based
}

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

const WEEKDAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const MODULE_META: Record<
  CalendarModule,
  { label: string; color: string }
> = {
  projects: { label: "Projects", color: "#3b82f6" },
  properties: { label: "Properties", color: "#22c55e" },
  financial: { label: "Financial", color: "#f59e0b" },
  people: { label: "People", color: "#a855f7" },
  crm: { label: "CRM", color: "#14b8a6" },
};

const ALL_MODULES: CalendarModule[] = [
  "projects",
  "properties",
  "financial",
  "people",
  "crm",
];

const MAX_VISIBLE_EVENTS = 3;

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function monthName(month: number): string {
  return new Date(2024, month - 1).toLocaleString("en-US", { month: "long" });
}

function toISODate(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, "0");
  const day = String(d.getDate()).padStart(2, "0");
  return `${y}-${m}-${day}`;
}

function isSameDay(a: string, b: string): boolean {
  return a === b;
}

function formatEventDate(dateStr: string): string {
  const d = new Date(dateStr + "T00:00:00");
  return d.toLocaleDateString("en-US", {
    weekday: "short",
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function typeLabel(type: string): string {
  return type
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase());
}

/** Build the calendar grid cells for a given month (with leading/trailing days) */
function buildMonthGrid(year: number, month: number) {
  // month is 1-based
  const firstDay = new Date(year, month - 1, 1);
  const lastDay = new Date(year, month, 0);
  const daysInMonth = lastDay.getDate();
  const startDow = firstDay.getDay(); // 0=Sun

  const cells: { date: string; day: number; inMonth: boolean }[] = [];

  // Leading days from previous month
  if (startDow > 0) {
    const prevMonthLast = new Date(year, month - 1, 0).getDate();
    for (let i = startDow - 1; i >= 0; i--) {
      const d = prevMonthLast - i;
      const prevMonth = month - 1 === 0 ? 12 : month - 1;
      const prevYear = month - 1 === 0 ? year - 1 : year;
      cells.push({
        date: `${prevYear}-${String(prevMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        inMonth: false,
      });
    }
  }

  // Current month days
  for (let d = 1; d <= daysInMonth; d++) {
    cells.push({
      date: `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
      day: d,
      inMonth: true,
    });
  }

  // Trailing days to fill last row
  const remainder = cells.length % 7;
  if (remainder > 0) {
    const trailingCount = 7 - remainder;
    for (let d = 1; d <= trailingCount; d++) {
      const nextMonth = month + 1 > 12 ? 1 : month + 1;
      const nextYear = month + 1 > 12 ? year + 1 : year;
      cells.push({
        date: `${nextYear}-${String(nextMonth).padStart(2, "0")}-${String(d).padStart(2, "0")}`,
        day: d,
        inMonth: false,
      });
    }
  }

  return cells;
}

/** Get the week dates (Sun-Sat) for a given date */
function getWeekDates(date: Date): Date[] {
  const dow = date.getDay();
  const start = new Date(date);
  start.setDate(start.getDate() - dow);
  const dates: Date[] = [];
  for (let i = 0; i < 7; i++) {
    const d = new Date(start);
    d.setDate(d.getDate() + i);
    dates.push(d);
  }
  return dates;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

export default function CalendarClient({
  initialEvents,
  companyId,
  initialYear,
  initialMonth,
}: CalendarClientProps) {
  const [year, setYear] = useState(initialYear);
  const [month, setMonth] = useState(initialMonth);
  const [view, setView] = useState<ViewMode>("month");
  const [events, setEvents] = useState<CalendarEvent[]>(initialEvents);
  const [loading, setLoading] = useState(false);
  const [activeModules, setActiveModules] = useState<Set<CalendarModule>>(
    new Set(ALL_MODULES)
  );
  const [selectedEvent, setSelectedEvent] = useState<CalendarEvent | null>(null);
  const [popoverPos, setPopoverPos] = useState<{ top: number; left: number } | null>(null);
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // For day/week view navigation
  const [currentDate, setCurrentDate] = useState<Date>(
    new Date(initialYear, initialMonth - 1, new Date().getDate())
  );

  // Add Event modal state
  const [showCreateEvent, setShowCreateEvent] = useState(false);
  const [creatingEvent, setCreatingEvent] = useState(false);
  const [createEventError, setCreateEventError] = useState("");
  const [eventProjects, setEventProjects] = useState<
    { id: string; name: string }[]
  >([]);
  const [eventMembers, setEventMembers] = useState<
    { user_id: string; full_name: string | null; email: string | null }[]
  >([]);
  const [loadingEventData, setLoadingEventData] = useState(false);
  const [eventForm, setEventForm] = useState({
    title: "",
    description: "",
    project_id: "",
    start_date: "",
    end_date: "",
    priority: "medium",
    event_type: "task",
    assigned_to: "",
  });

  const popoverRef = useRef<HTMLDivElement>(null);

  // Fetch projects and members when create modal opens
  useEffect(() => {
    if (!showCreateEvent) return;

    async function fetchFormData() {
      setLoadingEventData(true);
      try {
        const supabase = createClient();
        const [{ data: projects }, { data: members }] = await Promise.all([
          supabase
            .from("projects")
            .select("id, name")
            .eq("company_id", companyId)
            .order("name"),
          supabase
            .from("company_members")
            .select("user_id, user_profiles!company_members_user_profile_fkey(full_name, email)")
            .eq("company_id", companyId)
            .eq("is_active", true),
        ]);
        setEventProjects(projects ?? []);
        setEventMembers(
          (members ?? []).map((m: Record<string, unknown>) => {
            const profile = m.user_profiles as {
              full_name: string | null;
              email: string | null;
            } | null;
            return {
              user_id: m.user_id as string,
              full_name: profile?.full_name ?? null,
              email: profile?.email ?? null,
            };
          })
        );
      } catch (err) {
        console.error("Failed to fetch form data:", err);
      } finally {
        setLoadingEventData(false);
      }
    }

    fetchFormData();
  }, [showCreateEvent, companyId]);

  function resetEventForm() {
    setEventForm({
      title: "",
      description: "",
      project_id: "",
      start_date: "",
      end_date: "",
      priority: "medium",
      event_type: "task",
      assigned_to: "",
    });
    setCreateEventError("");
  }

  function openCreateModal() {
    // Default start_date to the currently viewed day (in day view) or today
    const defaultDate =
      view === "day" ? toISODate(currentDate) : toISODate(new Date());
    setEventForm((prev) => ({ ...prev, start_date: defaultDate }));
    setShowCreateEvent(true);
  }

  async function handleCreateEvent(e: React.FormEvent) {
    e.preventDefault();
    setCreatingEvent(true);
    setCreateEventError("");

    try {
      const res = await fetch("/api/calendar/events", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title: eventForm.title,
          description: eventForm.description || undefined,
          project_id: eventForm.project_id,
          start_date: eventForm.start_date,
          end_date: eventForm.end_date || undefined,
          priority: eventForm.priority,
          is_milestone: eventForm.event_type === "milestone",
          assigned_to: eventForm.assigned_to || undefined,
        }),
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || "Failed to create event");
      }

      resetEventForm();
      setShowCreateEvent(false);

      // Re-fetch calendar events to show the new task
      try {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const refetchRes = await fetch(
          `/api/calendar/events?start=${startDate}&end=${endDate}`
        );
        if (refetchRes.ok) {
          const data = await refetchRes.json();
          setEvents(data);
        }
      } catch {
        // Silently handle refetch error
      }
    } catch (err: unknown) {
      setCreateEventError(
        err instanceof Error ? err.message : "Failed to create event"
      );
    } finally {
      setCreatingEvent(false);
    }
  }

  // Close popover on outside click
  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setSelectedEvent(null);
        setPopoverPos(null);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  // Fetch events when month/year changes (but not on initial render)
  const isInitialMount = useRef(true);
  useEffect(() => {
    if (isInitialMount.current) {
      isInitialMount.current = false;
      return;
    }

    async function fetchEvents() {
      setLoading(true);
      try {
        const startDate = `${year}-${String(month).padStart(2, "0")}-01`;
        const lastDay = new Date(year, month, 0).getDate();
        const endDate = `${year}-${String(month).padStart(2, "0")}-${String(lastDay).padStart(2, "0")}`;

        const res = await fetch(
          `/api/calendar/events?start=${startDate}&end=${endDate}`
        );
        if (res.ok) {
          const data = await res.json();
          setEvents(data);
        }
      } catch (err) {
        console.error("Failed to fetch calendar events:", err);
      } finally {
        setLoading(false);
      }
    }

    fetchEvents();
  }, [year, month]);

  // Filter events by active modules
  const filteredEvents = useMemo(
    () => events.filter((e) => activeModules.has(e.module)),
    [events, activeModules]
  );

  // Group events by date for quick lookup
  const eventsByDate = useMemo(() => {
    const map: Record<string, CalendarEvent[]> = {};
    for (const event of filteredEvents) {
      if (!map[event.date]) {
        map[event.date] = [];
      }
      map[event.date].push(event);
    }
    return map;
  }, [filteredEvents]);

  // Today's ISO date
  const todayStr = toISODate(new Date());

  // Module filter toggle
  const toggleModule = useCallback((mod: CalendarModule) => {
    setActiveModules((prev) => {
      const next = new Set(prev);
      if (next.has(mod)) {
        next.delete(mod);
      } else {
        next.add(mod);
      }
      return next;
    });
  }, []);

  // Navigation
  const goToToday = useCallback(() => {
    const now = new Date();
    setYear(now.getFullYear());
    setMonth(now.getMonth() + 1);
    setCurrentDate(now);
    setSelectedDay(null);
  }, []);

  const goPrev = useCallback(() => {
    if (view === "month") {
      setMonth((prev) => {
        if (prev === 1) {
          setYear((y) => y - 1);
          return 12;
        }
        return prev - 1;
      });
    } else if (view === "week") {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 7);
        setYear(d.getFullYear());
        setMonth(d.getMonth() + 1);
        return d;
      });
    } else {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() - 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth() + 1);
        return d;
      });
    }
    setSelectedDay(null);
  }, [view]);

  const goNext = useCallback(() => {
    if (view === "month") {
      setMonth((prev) => {
        if (prev === 12) {
          setYear((y) => y + 1);
          return 1;
        }
        return prev + 1;
      });
    } else if (view === "week") {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 7);
        setYear(d.getFullYear());
        setMonth(d.getMonth() + 1);
        return d;
      });
    } else {
      setCurrentDate((prev) => {
        const d = new Date(prev);
        d.setDate(d.getDate() + 1);
        setYear(d.getFullYear());
        setMonth(d.getMonth() + 1);
        return d;
      });
    }
    setSelectedDay(null);
  }, [view]);

  // Handle clicking on an event pill
  const handleEventClick = useCallback(
    (event: CalendarEvent, e: React.MouseEvent) => {
      e.stopPropagation();
      const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
      setPopoverPos({
        top: rect.bottom + window.scrollY + 4,
        left: rect.left + window.scrollX,
      });
      setSelectedEvent(event);
    },
    []
  );

  // Handle clicking a day cell to expand all events
  const handleDayClick = useCallback((dateStr: string) => {
    setSelectedDay((prev) => (prev === dateStr ? null : dateStr));
  }, []);

  // Build the header text
  const headerText =
    view === "month"
      ? `${monthName(month)} ${year}`
      : view === "week"
        ? (() => {
            const weekDates = getWeekDates(currentDate);
            const first = weekDates[0];
            const last = weekDates[6];
            if (first.getMonth() === last.getMonth()) {
              return `${first.toLocaleDateString("en-US", { month: "long" })} ${first.getDate()}-${last.getDate()}, ${first.getFullYear()}`;
            }
            return `${first.toLocaleDateString("en-US", { month: "short" })} ${first.getDate()} - ${last.toLocaleDateString("en-US", { month: "short" })} ${last.getDate()}, ${last.getFullYear()}`;
          })()
        : currentDate.toLocaleDateString("en-US", {
            weekday: "long",
            month: "long",
            day: "numeric",
            year: "numeric",
          });

  // Month grid cells
  const monthCells = useMemo(() => buildMonthGrid(year, month), [year, month]);

  // Week dates for week view
  const weekDates = useMemo(() => getWeekDates(currentDate), [currentDate]);

  // Event count summary
  const eventCounts = useMemo(() => {
    const counts: Record<CalendarModule, number> = {
      projects: 0,
      properties: 0,
      financial: 0,
      people: 0,
      crm: 0,
    };
    for (const ev of events) {
      counts[ev.module]++;
    }
    return counts;
  }, [events]);

  return (
    <div className="calendar-page">
      {/* Header */}
      <div className="calendar-header">
        <div className="calendar-header-left">
          <h2>{headerText}</h2>
          {loading && <span className="calendar-loading">Loading...</span>}
        </div>
        <div className="calendar-header-right">
          <button className="calendar-nav-btn" onClick={goPrev} title="Previous">
            <ChevronLeft size={18} />
          </button>
          <button className="calendar-today-btn" onClick={goToToday}>
            Today
          </button>
          <button className="calendar-nav-btn" onClick={goNext} title="Next">
            <ChevronRight size={18} />
          </button>

          <div className="calendar-view-toggle">
            {(["month", "week", "day"] as ViewMode[]).map((v) => (
              <button
                key={v}
                className={`calendar-view-btn ${view === v ? "active" : ""}`}
                onClick={() => setView(v)}
              >
                {v.charAt(0).toUpperCase() + v.slice(1)}
              </button>
            ))}
          </div>

          <button className="btn-primary" onClick={openCreateModal}>
            <Plus size={16} />
            Add Event
          </button>
        </div>
      </div>

      {/* Module Filters */}
      <div className="calendar-filters">
        {ALL_MODULES.map((mod) => (
          <label key={mod} className="calendar-filter-item">
            <input
              type="checkbox"
              checked={activeModules.has(mod)}
              onChange={() => toggleModule(mod)}
            />
            <span
              className="calendar-filter-dot"
              style={{ background: MODULE_META[mod].color }}
            />
            <span className="calendar-filter-label">
              {MODULE_META[mod].label}
            </span>
            <span className="calendar-filter-count">{eventCounts[mod]}</span>
          </label>
        ))}
      </div>

      {/* Month View */}
      {view === "month" && (
        <div className="calendar-month-container">
          <div className="calendar-weekday-header">
            {WEEKDAY_LABELS.map((d) => (
              <div key={d} className="calendar-weekday-cell">
                {d}
              </div>
            ))}
          </div>
          <div className="calendar-grid">
            {monthCells.map((cell) => {
              const dayEvents = eventsByDate[cell.date] || [];
              const isToday = isSameDay(cell.date, todayStr);
              const isExpanded = selectedDay === cell.date;
              const visibleEvents = isExpanded
                ? dayEvents
                : dayEvents.slice(0, MAX_VISIBLE_EVENTS);
              const hiddenCount = dayEvents.length - MAX_VISIBLE_EVENTS;

              return (
                <div
                  key={cell.date}
                  className={`calendar-day ${!cell.inMonth ? "outside-month" : ""} ${isToday ? "today" : ""} ${dayEvents.length > 0 ? "has-events" : ""}`}
                  onClick={() => handleDayClick(cell.date)}
                >
                  <div className="calendar-day-number">
                    {isToday ? (
                      <span className="calendar-today-badge">{cell.day}</span>
                    ) : (
                      cell.day
                    )}
                  </div>
                  <div className="calendar-day-events">
                    {visibleEvents.map((ev) => (
                      <button
                        key={ev.id}
                        className="calendar-event-pill"
                        style={{ borderLeftColor: ev.color }}
                        onClick={(e) => handleEventClick(ev, e)}
                        title={ev.title}
                      >
                        <span
                          className="calendar-event-dot"
                          style={{ background: ev.color }}
                        />
                        <span className="calendar-event-title">{ev.title}</span>
                      </button>
                    ))}
                    {!isExpanded && hiddenCount > 0 && (
                      <button
                        className="calendar-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(cell.date);
                        }}
                      >
                        +{hiddenCount} more
                      </button>
                    )}
                    {isExpanded && dayEvents.length > MAX_VISIBLE_EVENTS && (
                      <button
                        className="calendar-more-btn"
                        onClick={(e) => {
                          e.stopPropagation();
                          setSelectedDay(null);
                        }}
                      >
                        Show less
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Week View */}
      {view === "week" && (
        <div className="calendar-week-view">
          <div className="calendar-weekday-header">
            {weekDates.map((d) => {
              const dateStr = toISODate(d);
              const isToday = isSameDay(dateStr, todayStr);
              return (
                <div
                  key={dateStr}
                  className={`calendar-weekday-cell week-view-header ${isToday ? "today" : ""}`}
                >
                  <span className="calendar-week-dow">
                    {d.toLocaleDateString("en-US", { weekday: "short" })}
                  </span>
                  <span className={`calendar-week-date ${isToday ? "calendar-today-badge" : ""}`}>
                    {d.getDate()}
                  </span>
                </div>
              );
            })}
          </div>
          <div className="calendar-week-grid">
            {weekDates.map((d) => {
              const dateStr = toISODate(d);
              const dayEvents = eventsByDate[dateStr] || [];
              return (
                <div key={dateStr} className="calendar-week-day">
                  {dayEvents.length === 0 && (
                    <div className="calendar-week-empty">No events</div>
                  )}
                  {dayEvents.map((ev) => (
                    <button
                      key={ev.id}
                      className="calendar-event-pill week-pill"
                      style={{ borderLeftColor: ev.color }}
                      onClick={(e) => handleEventClick(ev, e)}
                      title={ev.title}
                    >
                      <span
                        className="calendar-event-dot"
                        style={{ background: ev.color }}
                      />
                      <span className="calendar-event-title">{ev.title}</span>
                    </button>
                  ))}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Day View */}
      {view === "day" && (
        <div className="calendar-day-view">
          <div className="calendar-day-view-header">
            <CalendarIcon size={20} />
            <span>
              {currentDate.toLocaleDateString("en-US", {
                weekday: "long",
                month: "long",
                day: "numeric",
                year: "numeric",
              })}
            </span>
          </div>
          <div className="calendar-day-view-events">
            {(eventsByDate[toISODate(currentDate)] || []).length === 0 && (
              <div className="calendar-day-view-empty">
                <CalendarIcon size={40} strokeWidth={1.2} />
                <p>No events scheduled for this day</p>
              </div>
            )}
            {(eventsByDate[toISODate(currentDate)] || []).map((ev) => (
              <div
                key={ev.id}
                className="calendar-day-event-card"
                style={{ borderLeftColor: ev.color }}
              >
                <div className="calendar-day-event-header">
                  <span
                    className="calendar-event-module-badge"
                    style={{ background: ev.color }}
                  >
                    {MODULE_META[ev.module].label}
                  </span>
                  <span className="calendar-event-type-label">
                    {typeLabel(ev.type)}
                  </span>
                </div>
                <div className="calendar-day-event-title">{ev.title}</div>
                {ev.endDate && (
                  <div className="calendar-day-event-range">
                    {formatEventDate(ev.date)} - {formatEventDate(ev.endDate)}
                  </div>
                )}
                {ev.metadata && (
                  <div className="calendar-day-event-meta">
                    {ev.metadata.status != null && (
                      <span className="badge badge-small">
                        {String(ev.metadata.status).replace(/_/g, " ")}
                      </span>
                    )}
                    {ev.metadata.priority != null && (
                      <span className="badge badge-small">
                        {String(ev.metadata.priority)}
                      </span>
                    )}
                    {ev.metadata.amount != null && (
                      <span className="calendar-event-amount">
                        ${Number(ev.metadata.amount).toLocaleString()}
                      </span>
                    )}
                  </div>
                )}
                {ev.url && (
                  <Link href={ev.url} className="calendar-event-link">
                    Go to Source <ExternalLink size={12} />
                  </Link>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Event Popover */}
      {selectedEvent && popoverPos && (
        <div
          ref={popoverRef}
          className="calendar-event-popover"
          style={{ top: popoverPos.top, left: popoverPos.left }}
        >
          <div className="calendar-popover-header">
            <span
              className="calendar-event-module-badge"
              style={{ background: selectedEvent.color }}
            >
              {MODULE_META[selectedEvent.module].label}
            </span>
            <button
              className="calendar-popover-close"
              onClick={() => {
                setSelectedEvent(null);
                setPopoverPos(null);
              }}
            >
              <X size={14} />
            </button>
          </div>
          <div className="calendar-popover-title">{selectedEvent.title}</div>
          <div className="calendar-popover-date">
            {formatEventDate(selectedEvent.date)}
            {selectedEvent.endDate && (
              <> &mdash; {formatEventDate(selectedEvent.endDate)}</>
            )}
          </div>
          <div className="calendar-popover-type">
            {typeLabel(selectedEvent.type)}
          </div>
          {selectedEvent.metadata && (
            <div className="calendar-popover-meta">
              {selectedEvent.metadata.status != null && (
                <span className="badge badge-small">
                  {String(selectedEvent.metadata.status).replace(/_/g, " ")}
                </span>
              )}
              {selectedEvent.metadata.priority != null && (
                <span className="badge badge-small">
                  {String(selectedEvent.metadata.priority)}
                </span>
              )}
              {selectedEvent.metadata.amount != null && (
                <span className="calendar-event-amount">
                  ${Number(selectedEvent.metadata.amount).toLocaleString()}
                </span>
              )}
            </div>
          )}
          {selectedEvent.url && (
            <Link
              href={selectedEvent.url}
              className="calendar-popover-link"
            >
              Go to Source <ExternalLink size={12} />
            </Link>
          )}
        </div>
      )}

      {/* Add Event Modal */}
      {showCreateEvent && (
        <div
          className="ticket-modal-overlay"
          onClick={() => {
            setShowCreateEvent(false);
            resetEventForm();
          }}
        >
          <div className="ticket-modal" onClick={(e) => e.stopPropagation()}>
            <div className="ticket-modal-header">
              <h3>Add Event</h3>
              <button
                className="ticket-modal-close"
                onClick={() => {
                  setShowCreateEvent(false);
                  resetEventForm();
                }}
              >
                <X size={18} />
              </button>
            </div>

            {createEventError && (
              <div className="ticket-form-error">{createEventError}</div>
            )}

            <form onSubmit={handleCreateEvent} className="ticket-form">
              {/* Event type indicator */}
              <div className="ticket-form-group">
                <label className="ticket-form-label">Event Type</label>
                <select
                  className="ticket-form-select"
                  value={eventForm.event_type}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, event_type: e.target.value })
                  }
                >
                  <option value="task">Task</option>
                  <option value="milestone">Milestone</option>
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Project *</label>
                <select
                  className="ticket-form-select"
                  value={eventForm.project_id}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, project_id: e.target.value })
                  }
                  required
                >
                  <option value="">
                    {loadingEventData
                      ? "Loading projects..."
                      : "Select a project..."}
                  </option>
                  {eventProjects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Title *</label>
                <input
                  type="text"
                  className="ticket-form-input"
                  value={eventForm.title}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, title: e.target.value })
                  }
                  placeholder="Task title"
                  required
                />
              </div>

              <div className="ticket-form-group">
                <label className="ticket-form-label">Description</label>
                <textarea
                  className="ticket-form-textarea"
                  value={eventForm.description}
                  onChange={(e) =>
                    setEventForm({ ...eventForm, description: e.target.value })
                  }
                  placeholder="Describe the task..."
                  rows={3}
                />
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Start Date *</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={eventForm.start_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, start_date: e.target.value })
                    }
                    required
                  />
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">End Date</label>
                  <input
                    type="date"
                    className="ticket-form-input"
                    value={eventForm.end_date}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, end_date: e.target.value })
                    }
                  />
                </div>
              </div>

              <div className="ticket-form-row">
                <div className="ticket-form-group">
                  <label className="ticket-form-label">Priority</label>
                  <select
                    className="ticket-form-select"
                    value={eventForm.priority}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, priority: e.target.value })
                    }
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="urgent">Urgent</option>
                  </select>
                </div>

                <div className="ticket-form-group">
                  <label className="ticket-form-label">Assigned To</label>
                  <select
                    className="ticket-form-select"
                    value={eventForm.assigned_to}
                    onChange={(e) =>
                      setEventForm({ ...eventForm, assigned_to: e.target.value })
                    }
                  >
                    <option value="">
                      {loadingEventData ? "Loading..." : "Unassigned"}
                    </option>
                    {eventMembers.map((m) => (
                      <option key={m.user_id} value={m.user_id}>
                        {m.full_name || m.email || "Unknown"}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="ticket-form-actions">
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => {
                    setShowCreateEvent(false);
                    resetEventForm();
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={
                    creatingEvent ||
                    !eventForm.title.trim() ||
                    !eventForm.project_id ||
                    !eventForm.start_date
                  }
                >
                  {creatingEvent ? "Creating..." : "Create Event"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
