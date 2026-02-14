"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { createClient } from "@/lib/supabase/client";
import type { RealtimeChannel, RealtimePresenceState } from "@supabase/supabase-js";

/**
 * Hook to subscribe to Supabase Realtime changes on a table.
 * Automatically cleans up on unmount.
 */
export function useRealtimeSubscription<T extends Record<string, unknown>>(
  table: string,
  filter?: { column: string; value: string },
  onInsert?: (record: T) => void,
  onUpdate?: (record: T) => void,
  onDelete?: (old: T) => void
) {
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    const supabase = createClient();

    let channelConfig = `realtime:${table}`;
    if (filter) {
      channelConfig += `:${filter.column}=eq.${filter.value}`;
    }

    const channel = supabase
      .channel(channelConfig)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table,
          ...(filter ? { filter: `${filter.column}=eq.${filter.value}` } : {}),
        },
        (payload) => {
          if (payload.eventType === "INSERT" && onInsert) {
            onInsert(payload.new as T);
          } else if (payload.eventType === "UPDATE" && onUpdate) {
            onUpdate(payload.new as T);
          } else if (payload.eventType === "DELETE" && onDelete) {
            onDelete(payload.old as T);
          }
        }
      )
      .subscribe();

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [table, filter?.column, filter?.value]);

  return channelRef;
}

/**
 * Hook for Supabase Realtime Presence - shows who's online/viewing.
 */
export function usePresence(
  channelName: string,
  userData: { userId: string; name: string; avatar?: string }
) {
  const [presenceState, setPresenceState] = useState<
    { userId: string; name: string; avatar?: string; online_at: string }[]
  >([]);
  const channelRef = useRef<RealtimeChannel | null>(null);

  useEffect(() => {
    if (!userData.userId) return;

    const supabase = createClient();
    const channel = supabase.channel(channelName, {
      config: { presence: { key: userData.userId } },
    });

    channel
      .on("presence", { event: "sync" }, () => {
        const state: RealtimePresenceState = channel.presenceState();
        const users = Object.values(state)
          .flat()
          .map((p) => ({
            userId: (p as Record<string, string>).userId || "",
            name: (p as Record<string, string>).name || "",
            avatar: (p as Record<string, string>).avatar,
            online_at: (p as Record<string, string>).online_at || new Date().toISOString(),
          }));
        setPresenceState(users);
      })
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") {
          await channel.track({
            userId: userData.userId,
            name: userData.name,
            avatar: userData.avatar,
            online_at: new Date().toISOString(),
          });
        }
      });

    channelRef.current = channel;

    return () => {
      supabase.removeChannel(channel);
    };
  }, [channelName, userData.userId, userData.name]);

  return presenceState;
}

/**
 * Hook for real-time notification badge count.
 */
export function useRealtimeNotifications(userId: string) {
  const [count, setCount] = useState(0);

  const increment = useCallback(() => {
    setCount((c) => c + 1);
  }, []);

  useRealtimeSubscription(
    "messages",
    { column: "recipient_id", value: userId },
    increment // onInsert
  );

  return { count, reset: () => setCount(0) };
}
