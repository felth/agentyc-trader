"use client";

import React, { useCallback, useEffect, useState } from "react";

type IbkrStatus = {
  ok: boolean;
  authenticated?: boolean;
  bridge?: { ok: boolean; status?: string; service?: string; error?: string };
  gateway?: { ok: boolean; status?: number; authenticated?: boolean; connected?: boolean; error?: string };
  _debug?: any;
};

const SSO_URL = "https://ibkr.agentyctrader.com/sso/Login?forwardTo=22&RL=1";

export default function IbkrConnectBanner() {
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState<IbkrStatus | null>(null);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch("/api/ibkr/status", { 
        cache: "no-store",
        headers: {
          'Cache-Control': 'no-cache',
        },
      });
      
      // Always try to parse JSON, even on non-200 status
      const data: IbkrStatus = await res.json().catch(() => ({ 
        ok: false, 
        authenticated: false 
      }));
      
      setStatus(data);

      // Treat any error state as disconnected, never hide the banner
      if (!data || data.ok === false) {
        setError("Status unavailable");
      }
    } catch (e: any) {
      setError(e?.message || "Status fetch failed");
      // Always set a status so banner stays visible
      setStatus({ ok: false, authenticated: false });
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Always show banner - never hide it
  // If authenticated is true, show connected state
  // Otherwise (false, undefined, or error), show disconnected state
  const authenticated = status?.authenticated === true;

  return (
    <div className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]">
      <div className="flex items-center justify-between gap-4">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="text-sm font-bold text-white">IBKR Connection</span>
            {authenticated && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-ultra-positive/20 text-ultra-positive border border-ultra-positive/40">
                CONNECTED
              </span>
            )}
            {!authenticated && !loading && (
              <span className="text-[10px] px-2.5 py-1 rounded-full font-bold bg-white/10 text-white/70 border border-white/20">
                NOT CONNECTED
              </span>
            )}
          </div>
          <p className="text-xs text-slate-400 font-medium">
            {loading
              ? "Checking status…"
              : authenticated
                ? "Connected to Interactive Brokers"
                : "Login required to connect your IBKR account"}
            {error && !loading && ` (${error})`}
          </p>
        </div>

        <div className="flex items-center gap-2 flex-shrink-0">
          <button
            onClick={loadStatus}
            type="button"
            disabled={loading}
            className="text-xs px-3 py-2 rounded-lg border border-white/10 hover:bg-white/10 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? "..." : "Refresh"}
          </button>

          {authenticated ? (
            <a
              href={SSO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 rounded-lg bg-ultra-accent text-white font-bold hover:bg-ultra-accentHover transition-colors"
            >
              Reconnect
            </a>
          ) : (
            <a
              href={SSO_URL}
              target="_blank"
              rel="noreferrer"
              className="text-xs px-3 py-2 rounded-lg bg-ultra-accent text-white font-bold hover:bg-ultra-accentHover transition-colors"
            >
              Connect IBKR
            </a>
          )}
        </div>
      </div>
    </div>
  );
}

