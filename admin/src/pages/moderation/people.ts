import { useEffect, useState } from "react";

import { supabaseClient } from "../../utility/supabaseClient";
import type { PersonRow } from "../../utility/moderation";

export type Person = PersonRow & { id: string; is_buddy_discoverable?: boolean | null };

/**
 * First name, city and discoverability for a set of profile ids. A moderator
 * sees what members see of each other, not the whole account: no email, no
 * surname, nothing from the assessment.
 */
export function usePeople(ids: readonly string[]): Record<string, Person> {
  const [people, setPeople] = useState<Record<string, Person>>({});
  const key = [...new Set(ids)].sort().join(",");

  useEffect(() => {
    const unique = key ? key.split(",") : [];
    if (unique.length === 0) {
      setPeople({});
      return;
    }
    let cancelled = false;
    void (async () => {
      const { data } = await supabaseClient
        .from("profiles")
        .select("id, buddy_display_name, full_name, city, is_buddy_discoverable")
        .in("id", unique);
      if (cancelled) return;
      const next: Record<string, Person> = {};
      for (const row of (data ?? []) as Person[]) {
        next[row.id] = row;
      }
      setPeople(next);
    })();
    return () => {
      cancelled = true;
    };
  }, [key]);

  return people;
}
