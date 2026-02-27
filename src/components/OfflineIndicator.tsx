"use client";

import { useEffect, useState } from "react";
import { useTranslations } from "next-intl";
import { WifiOff, Wifi } from "lucide-react";

export default function OfflineIndicator() {
  const t = useTranslations("common");
  const [isOnline, setIsOnline] = useState(true);
  const [showReconnected, setShowReconnected] = useState(false);

  useEffect(() => {
    function handleOnline() {
      setIsOnline(true);
      setShowReconnected(true);
      setTimeout(() => setShowReconnected(false), 3000);
    }
    function handleOffline() {
      setIsOnline(false);
      setShowReconnected(false);
    }

    setIsOnline(navigator.onLine);
    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  if (isOnline && !showReconnected) return null;

  return (
    <div
      style={{
        position: "fixed",
        bottom: "16px",
        left: "50%",
        transform: "translateX(-50%)",
        zIndex: 9999,
        padding: "10px 20px",
        borderRadius: "12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
        fontSize: "0.85rem",
        fontWeight: 500,
        boxShadow: "0 4px 20px rgba(0,0,0,0.2)",
        background: isOnline ? "#22c55e" : "#ef4444",
        color: "#fff",
        transition: "all 0.3s ease",
        animation: "slideUp 0.3s ease",
      }}
    >
      {isOnline ? (
        <>
          <Wifi size={16} /> {t("offline.backOnline")}
        </>
      ) : (
        <>
          <WifiOff size={16} /> {t("offline.youAreOffline")}
        </>
      )}
    </div>
  );
}
