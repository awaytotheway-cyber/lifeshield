import { View } from "react-native";

type ProgressBarProps = {
  current: number;
  total: number;
};

export function ProgressBar({ current, total }: ProgressBarProps) {
  const safeTotal = total > 0 ? total : 1;
  const ratio = Math.min(1, Math.max(0, current / safeTotal));
  return (
    <View className="mt-4 h-2 w-full overflow-hidden rounded-full bg-sage">
      <View
        className="h-2 rounded-full bg-teal"
        style={{ width: `${Math.round(ratio * 100)}%` }}
      />
    </View>
  );
}
