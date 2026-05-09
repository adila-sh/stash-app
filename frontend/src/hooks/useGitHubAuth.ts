import { useCallback, useEffect, useRef, useState } from "react";
import { Events } from "@wailsio/runtime";

import { github, type DeviceFlowStart, type GitHubUser } from "@/lib/github";

interface DeviceFlowState {
  start: DeviceFlowStart;
  startedAt: number;
}

export interface GitHubAuthState {
  user: GitHubUser | null;
  isAuthenticated: boolean;
  loading: boolean;
  deviceFlow: DeviceFlowState | null;
  error: string | null;
  login: () => Promise<void>;
  cancelLogin: () => Promise<void>;
  logout: () => Promise<void>;
}

export function useGitHubAuth(): GitHubAuthState {
  const [user, setUser] = useState<GitHubUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [deviceFlow, setDeviceFlow] = useState<DeviceFlowState | null>(null);
  const [error, setError] = useState<string | null>(null);
  const pollAbortRef = useRef<(() => void) | null>(null);

  const refreshUser = useCallback(async () => {
    try {
      const authed = await github.isAuthenticated();
      if (!authed) {
        setUser(null);
        return;
      }
      const u = await github.getUser();
      setUser(u);
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setUser(null);
    }
  }, []);

  // Initial load
  useEffect(() => {
    void refreshUser().finally(() => setLoading(false));
  }, [refreshUser]);

  // React to backend-driven changes (token set/cleared in /ide or here)
  useEffect(() => {
    const off = Events.On("github.changed", () => {
      void refreshUser();
    });
    return () => {
      off();
    };
  }, [refreshUser]);

  const login = useCallback(async () => {
    setError(null);
    try {
      const start = await github.startDeviceFlow();
      setDeviceFlow({ start, startedAt: Date.now() });

      let cancelled = false;
      pollAbortRef.current = () => {
        cancelled = true;
      };

      try {
        await github.pollDeviceToken(start.deviceCode, start.interval);
        if (cancelled) return;
        setDeviceFlow(null);
        await refreshUser();
      } catch (e) {
        if (cancelled) return;
        setError(e instanceof Error ? e.message : String(e));
        setDeviceFlow(null);
      }
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
      setDeviceFlow(null);
    }
  }, [refreshUser]);

  const cancelLogin = useCallback(async () => {
    pollAbortRef.current?.();
    pollAbortRef.current = null;
    try {
      await github.cancelDeviceFlow();
    } catch {
      /* ignore */
    }
    setDeviceFlow(null);
  }, []);

  const logout = useCallback(async () => {
    try {
      await github.logout();
    } catch (e) {
      setError(e instanceof Error ? e.message : String(e));
    }
    setUser(null);
  }, []);

  return {
    user,
    isAuthenticated: user !== null,
    loading,
    deviceFlow,
    error,
    login,
    cancelLogin,
    logout,
  };
}
