"use client";

import React, { useCallback, useEffect, useState } from "react";

type IbkrStatus = {
  ok: boolean;
  authenticated?: boolean;
  bridge?: { ok: boolean; status?: string; service?: string; error?: string };
  gateway?: { ok: boolean; status?: number; authenticated?: boolean; connected?: boolean; error?: string };
  _debug?: any;
};

// Component is always rendered - never conditionally hidden

const SSO_URL = "https://ibkr.agentyctrader.com/sso/Login?forwardTo=22&RL=1";

export default function IbkrConnectBanner() {
  // Initialize with explicit false state - banner should always show when not authenticated
  const [loading, setLoading] = useState(true);
  const [authenticated, setAuthenticated] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const loadStatus = useCallback(async () => {
    setLoading(true);
    setError(null);
    
    // Default to not authenticated - only set to true if explicitly true
    let isAuthenticated = false;
    
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
      
      // ONLY set authenticated to true if:
      // 1. Response is ok (data.ok === true)
      // 2. AND authenticated field is explicitly true
      // Any other case = not authenticated (including undefined, null, false, errors)
      if (data && data.ok === true && data.authenticated === true) {
        isAuthenticated = true;
      } else {
        // Explicitly false for all other cases
        isAuthenticated = false;
        if (!data || data.ok === false) {
          setError("Status unavailable");
        }
      }
      
      setAuthenticated(isAuthenticated);
    } catch (e: any) {
      // On any error, ensure authenticated is false - banner stays visible
      setError(e?.message || "Status fetch failed");
      setAuthenticated(false);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadStatus();
  }, [loadStatus]);

  // Banner ALWAYS renders - never conditionally hidden
  // authenticated state only affects the UI content (badge, message, button text)

  // ALWAYS render the banner - never hide it based on state
  // Using inline style to ensure visibility (defense against CSS hiding)
  return (
    <div 
      className="rounded-2xl bg-white/[0.03] backdrop-blur-2xl border border-white/10 px-5 py-4 shadow-[0_8px_32px_rgba(0,0,0,0.4)]"
      style={{ display: 'block' }}
    >
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

