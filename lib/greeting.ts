/**
 * Time-of-day greeting for the home header.
 *
 * Boundaries follow common usage rather than strict clock quarters:
 * morning runs to noon, afternoon to 17:00, evening thereafter.
 */
export type GreetingSlot = "morning" | "afternoon" | "evening";

export function greetingSlot(date: Date = new Date()): GreetingSlot {
  const hour = date.getHours();
  if (hour < 12) {
    return "morning";
  }
  if (hour < 17) {
    return "afternoon";
  }
  return "evening";
}

const SLOT_TEXT: Record<GreetingSlot, string> = {
  morning: "Good morning",
  afternoon: "Good afternoon",
  evening: "Good evening",
};

/**
 * First name only, so the greeting stays short on narrow screens.
 * Returns null when the stored name is empty or whitespace.
 */
export function firstNameFrom(fullName: unknown): string | null {
  if (typeof fullName !== "string") {
    return null;
  }
  const first = fullName.trim().split(/\s+/)[0];
  return first ? first : null;
}

/** "Good morning, Pratik" — falls back to "Good morning" with no name. */
export function greetingFor(
  fullName: unknown,
  date: Date = new Date(),
): string {
  const slot = SLOT_TEXT[greetingSlot(date)];
  const name = firstNameFrom(fullName);
  return name ? `${slot}, ${name}` : slot;
}
