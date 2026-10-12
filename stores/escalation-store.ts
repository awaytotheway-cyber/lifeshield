/**
 * Tier 1 escalation state — BRCA1/2 and CTC results.
 *
 * Mirrors stores/triage-store: the remote table is the record, a local flag
 * is the backup so a known stop survives a restart or an offline launch.
 *
 * Fail-open on the unknown. If results cannot be loaded and nothing is
 * cached, the app does NOT lock: wrongly stranding a user on a stop screen
 * because of a network blip is its own harm. Once a CTC positive has been
 * seen it is cached and keeps stopping the pathway until a clinician
 * changes the result.
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { create } from "zustand";

import {
  NO_ESCALATION,
  escalationFromResults,
  type EscalationState,
} from "@/lib/escalation";
import { loadOwnTestResults } from "@/lib/test-results";

type EscalationStore = {
  loading: boolean;
  loaded: boolean;
  state: EscalationState;
  load: (userId: string) => Promise<void>;
  reset: () => void;
};

function cacheKey(userId: string) {
  return `lifeshield.escalation.${userId}`;
}

async function readCache(userId: string): Promise<EscalationState | null> {
  try {
    const raw = await AsyncStorage.getItem(cacheKey(userId));
    if (!raw) return null;
    const parsed = JSON.parse(raw) as Partial<EscalationState>;
    if (typeof parsed?.ctcPositive !== "boolean") return null;
    return {
      brcaPositive: Boolean(parsed.brcaPositive),
      ctcPositive: Boolean(parsed.ctcPositive),
      level: parsed.ctcPositive
        ? "ctc_stop"
        : parsed.brcaPositive
          ? "brca_referral"
          : "none",
    };
  } catch {
    return null;
  }
}

async function writeCache(userId: string, state: EscalationState) {
  try {
    await AsyncStorage.setItem(cacheKey(userId), JSON.stringify(state));
  } catch {
    // Cache is a backup; the results table is the record.
  }
}

export const useEscalationStore = create<EscalationStore>((set) => ({
  loading: false,
  loaded: false,
  state: NO_ESCALATION,

  load: async (userId: string) => {
    set({ loading: true });

    const cached = await readCache(userId);
    if (cached && cached.level !== "none") {
      // Show the stop immediately rather than waiting on the network.
      set({ state: cached, loading: true, loaded: true });
    }

    const results = await loadOwnTestResults(userId);
    if (!results.ok) {
      // Keep whatever the cache said; never invent a lock from a failure.
      set({
        loading: false,
        loaded: true,
        state: cached ?? NO_ESCALATION,
      });
      return;
    }

    const next = escalationFromResults(results.rows);
    await writeCache(userId, next);
    set({ state: next, loading: false, loaded: true });
  },

  reset: () => set({ loading: false, loaded: false, state: NO_ESCALATION }),
}));
