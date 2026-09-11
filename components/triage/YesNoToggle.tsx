import { ChoiceToggle } from "@/components/ui/ChoiceToggle";
import { COPY } from "@/lib/copy";

type YesNoToggleProps = {
  label: string;
  value: boolean | null;
  onChange: (next: boolean) => void;
};

export function YesNoToggle({ label, value, onChange }: YesNoToggleProps) {
  const selected =
    value === true ? "yes" : value === false ? "no" : "";

  return (
    <ChoiceToggle
      label={label}
      color="warning"
      allowClear={false}
      options={[
        { value: "yes", label: COPY.triageYes },
        { value: "no", label: COPY.triageNo },
      ]}
      value={selected}
      onChange={(next) => {
        if (next === "yes") {
          onChange(true);
          return;
        }
        if (next === "no") {
          onChange(false);
        }
      }}
    />
  );
}
