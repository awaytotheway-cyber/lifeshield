import { Text, View } from "react-native";

import type { ResultStatusChip } from "@/lib/result-status";

/**
 * Colour-coded status. Leads the row so the raw number is never the headline.
 */
export function StatusChip({ chip }: { chip: ResultStatusChip }) {
  const toneClass =
    chip.tone === "needs_attention"
      ? "bg-coral"
      : chip.tone === "worth_watching"
        ? "bg-charcoal"
        : "bg-sage";
  // bg-charcoal is now a pale chip (contrast needs dark ink); coral/sage are
  // saturated enough that white text reads clearly on both.
  const textClass =
    chip.tone === "worth_watching" ? "text-[#1A1A1A]" : "text-white";

  return (
    <View className={`self-start rounded-full px-3 py-1 ${toneClass}`}>
      <Text className={`text-sm ${textClass}`}>{chip.label}</Text>
    </View>
  );
}
