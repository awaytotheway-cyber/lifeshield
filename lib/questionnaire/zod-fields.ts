import { z } from "zod";

import { parseFiniteNumber } from "@/lib/questionnaire/numbers";

/** Required number typed as text in the form, parsed safely on submit. */
export function requiredNumberField(label: string, min: number, max: number) {
  return z
    .string()
    .trim()
    .min(1, `Enter ${label}`)
    .transform((raw, ctx) => {
      const n = parseFiniteNumber(raw);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: `Enter a number for ${label}` });
        return z.NEVER;
      }
      if (n < min || n > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} should be between ${min} and ${max}`,
        });
        return z.NEVER;
      }
      return n;
    });
}

/** Optional number: blank is allowed, NaN is not. */
export function optionalNumberField(label: string, min: number, max: number) {
  return z
    .string()
    .transform((raw, ctx) => {
      const trimmed = raw.trim();
      if (trimmed === "") {
        return null;
      }
      const n = parseFiniteNumber(trimmed);
      if (n === null) {
        ctx.addIssue({ code: "custom", message: `Enter a number for ${label}` });
        return z.NEVER;
      }
      if (n < min || n > max) {
        ctx.addIssue({
          code: "custom",
          message: `${label} should be between ${min} and ${max}`,
        });
        return z.NEVER;
      }
      return n;
    });
}

export const yesNoSchema = z.enum(["yes", "no"], {
  message: "Please choose Yes or No",
});
