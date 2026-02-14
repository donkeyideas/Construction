"use client";

interface PresenceUser {
  userId: string;
  name: string;
  avatar?: string;
  online_at: string;
}

interface PresenceIndicatorProps {
  users: PresenceUser[];
  maxShow?: number;
}

function getInitials(name: string): string {
  const parts = name.trim().split(/\s+/);
  if (parts.length >= 2) return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  return parts[0]?.substring(0, 2).toUpperCase() || "?";
}

const COLORS = [
  "#3b82f6", "#ef4444", "#22c55e", "#f59e0b", "#8b5cf6",
  "#ec4899", "#14b8a6", "#f97316", "#06b6d4", "#6366f1",
];

export default function PresenceIndicator({ users, maxShow = 5 }: PresenceIndicatorProps) {
  if (!users || users.length === 0) return null;

  const visible = users.slice(0, maxShow);
  const overflow = users.length - maxShow;

  return (
    <div style={{ display: "flex", alignItems: "center", gap: "0" }}>
      {visible.map((user, idx) => (
        <div
          key={user.userId}
          title={`${user.name} (online)`}
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: COLORS[idx % COLORS.length],
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.65rem",
            fontWeight: 600,
            border: "2px solid var(--surface)",
            marginLeft: idx > 0 ? "-8px" : "0",
            position: "relative",
            zIndex: maxShow - idx,
          }}
        >
          {getInitials(user.name)}
          {/* Online dot */}
          <div
            style={{
              position: "absolute",
              bottom: "-1px",
              right: "-1px",
              width: "8px",
              height: "8px",
              borderRadius: "50%",
              background: "#22c55e",
              border: "2px solid var(--surface)",
            }}
          />
        </div>
      ))}
      {overflow > 0 && (
        <div
          style={{
            width: "28px",
            height: "28px",
            borderRadius: "50%",
            background: "var(--border)",
            color: "var(--foreground)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "0.6rem",
            fontWeight: 600,
            border: "2px solid var(--surface)",
            marginLeft: "-8px",
          }}
        >
          +{overflow}
        </div>
      )}
      <span style={{ fontSize: "0.72rem", color: "var(--muted)", marginLeft: "8px" }}>
        {users.length} online
      </span>
    </div>
  );
}
