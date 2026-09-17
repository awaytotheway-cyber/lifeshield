/**
 * The tests a person is booking, with their preparation rules.
 *
 * Shared by the booking screens so the prep steps shown before payment are the
 * same ones repeated on the confirmation and in the day-before reminder.
 */
import { useCallback, useEffect, useState } from "react";

import {
  buildPrepSteps,
  homeKitAvailableForAll,
  type PrepStep,
  type TestPrepSource,
} from "@/lib/booking";
import {
  loadTestPrepSources,
} from "@/lib/booking-data";
import { useAuthStore } from "@/stores/auth-store";
import { useQuestionnaireStore } from "@/stores/questionnaire-store";

export type BookingTests = {
  loading: boolean;
  tests: TestPrepSource[];
  prepSteps: PrepStep[];
  homeKitAvailable: boolean;
  message: string | null;
  reload: () => void;
};

export function useBookingTests(): BookingTests {
  const session = useAuthStore((state) => state.session);
  const loadTestOrders = useQuestionnaireStore((state) => state.loadTestOrders);
  const [loading, setLoading] = useState(true);
  const [tests, setTests] = useState<TestPrepSource[]>([]);
  const [message, setMessage] = useState<string | null>(null);

  const reload = useCallback(() => {
    const userId = session?.user.id;
    if (!userId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    void (async () => {
      try {
        const orders = await loadTestOrders(userId);
        const testNames = orders.ok
          ? orders.orders.map((order) => order.test_name)
          : [];
        const prep = await loadTestPrepSources(testNames);
        if (cancelled) {
          return;
        }
        if (prep.ok) {
          setTests(prep.tests);
          setMessage(null);
        } else {
          setTests([]);
          setMessage(prep.message);
        }
      } catch {
        if (!cancelled) {
          setTests([]);
          setMessage(null);
        }
      } finally {
        if (!cancelled) {
          setLoading(false);
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [session?.user.id, loadTestOrders]);

  useEffect(() => {
    reload();
  }, [reload]);

  return {
    loading,
    tests,
    prepSteps: buildPrepSteps(tests),
    homeKitAvailable: homeKitAvailableForAll(tests),
    message,
    reload,
  };
}
