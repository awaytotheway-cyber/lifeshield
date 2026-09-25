/**
 * Extended profile load/save for My Profile + notification prefs.
 * Maps to public.profiles columns (including migration 20260913_*).
 */
import AsyncStorage from "@react-native-async-storage/async-storage";
import { z } from "zod";

import { COPY } from "@/lib/copy";
import { ensureProfileRow } from "@/lib/ensure-profile";
import { messageFromUnknown } from "@/lib/friendly-errors";
import { isHHmm } from "@/lib/datetime";
import {
  ageFromDob,
  calcBmi,
  parseFiniteNumber,
} from "@/lib/questionnaire/numbers";
import { optionalNumberField } from "@/lib/questionnaire/zod-fields";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

const LOCAL_AVATAR_KEY = (userId: string) => `prescope:avatar-uri:${userId}`;

export type ExtendedProfileRow = {
  full_name: string | null;
  date_of_birth: string | null;
  sex: string | null;
  height_cm: number | string | null;
  weight_kg: number | string | null;
  bmi: number | string | null;
  phone: string | null;
  blood_type: string | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  conditions: string[] | null;
  allergies: string[] | null;
  avatar_url: string | null;
  notify_reminders: boolean | null;
  notify_results: boolean | null;
  notify_plan: boolean | null;
  notify_marketing: boolean | null;
  preferred_notify_time: string | null;
  location_postcode: string | null;
  location_country: string | null;
};

export type ExtendedProfileDraft = {
  full_name: string;
  phone: string | null;
  date_of_birth: string | null;
  sex: string | null;
  blood_type: string | null;
  height_cm: number | null;
  weight_kg: number | null;
  emergency_contact_name: string | null;
  emergency_contact_phone: string | null;
  emergency_contact_relationship: string | null;
  conditions: string[];
  allergies: string[];
  avatar_url: string | null;
  location_postcode: string | null;
  location_country: string | null;
};

export type NotificationPrefsDraft = {
  notify_reminders: boolean;
  notify_results: boolean;
  notify_plan: boolean;
  notify_marketing: boolean;
  preferred_notify_time: string | null;
};

const PROFILE_SELECT =
  "full_name, date_of_birth, sex, height_cm, weight_kg, bmi, phone, blood_type, emergency_contact_name, emergency_contact_phone, emergency_contact_relationship, conditions, allergies, avatar_url, notify_reminders, notify_results, notify_plan, notify_marketing, preferred_notify_time, location_postcode, location_country";

export const profileFormSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(1, "Please enter your name")
    .max(120, "Name is too long"),
  phone: z.string().max(40, "Phone is too long"),
  dateOfBirth: z.string(),
  sex: z.string(),
  bloodType: z.string(),
  heightCm: optionalNumberField("height (cm)", 80, 250),
  weightKg: optionalNumberField("weight (kg)", 20, 400),
  emergencyName: z.string().max(120),
  emergencyPhone: z.string().max(40),
  emergencyRelationship: z.string(),
  conditions: z.array(z.string()),
  allergies: z.array(z.string()),
  // Phase D: location for lab-search proximity ranking. Country must match
  // the DB CHECK (^[A-Z]{2}$) — normalised on submit.
  locationCountry: z
    .string()
    .transform((v) => v.trim().toUpperCase())
    .refine((v) => v === "" || /^[A-Z]{2}$/.test(v), {
      message: "Two-letter ISO country code (e.g. IN, GB, US).",
    }),
  locationPostcode: z
    .string()
    .max(20, "Postcode is too long")
    .transform((v) => v.trim()),
});

export type ProfileFormInput = {
  fullName: string;
  phone: string;
  dateOfBirth: string;
  sex: string;
  bloodType: string;
  heightCm: string;
  weightKg: string;
  emergencyName: string;
  emergencyPhone: string;
  emergencyRelationship: string;
  conditions: string[];
  allergies: string[];
  locationCountry: string;
  locationPostcode: string;
};

export type ProfileFormParsed = z.output<typeof profileFormSchema>;

export function emptyProfileForm(): ProfileFormInput {
  return {
    fullName: "",
    phone: "",
    dateOfBirth: "",
    sex: "",
    bloodType: "",
    heightCm: "",
    weightKg: "",
    emergencyName: "",
    emergencyPhone: "",
    emergencyRelationship: "",
    conditions: [],
    allergies: [],
    locationCountry: "",
    locationPostcode: "",
  };
}

export function profileRowToForm(
  row: ExtendedProfileRow | null,
  fallbackName?: string,
): ProfileFormInput {
  const name =
    row?.full_name?.trim() ||
    (fallbackName?.trim() ? fallbackName.trim() : "") ||
    "";
  return {
    fullName: name,
    phone: row?.phone?.trim() ?? "",
    dateOfBirth: row?.date_of_birth ?? "",
    sex: row?.sex ?? "",
    bloodType: row?.blood_type ?? "",
    heightCm:
      row?.height_cm === null || row?.height_cm === undefined
        ? ""
        : String(row.height_cm),
    weightKg:
      row?.weight_kg === null || row?.weight_kg === undefined
        ? ""
        : String(row.weight_kg),
    emergencyName: row?.emergency_contact_name?.trim() ?? "",
    emergencyPhone: row?.emergency_contact_phone?.trim() ?? "",
    emergencyRelationship: row?.emergency_contact_relationship ?? "",
    conditions: Array.isArray(row?.conditions) ? [...row.conditions] : [],
    allergies: Array.isArray(row?.allergies) ? [...row.allergies] : [],
    locationCountry: row?.location_country ?? "",
    locationPostcode: row?.location_postcode ?? "",
  };
}

export function formToDraft(values: ProfileFormParsed): ExtendedProfileDraft {
  return {
    full_name: values.fullName.trim(),
    phone: values.phone.trim() || null,
    date_of_birth: values.dateOfBirth.trim() || null,
    sex: values.sex.trim() || null,
    blood_type: values.bloodType.trim() || null,
    height_cm: values.heightCm,
    weight_kg: values.weightKg,
    emergency_contact_name: values.emergencyName.trim() || null,
    emergency_contact_phone: values.emergencyPhone.trim() || null,
    emergency_contact_relationship:
      values.emergencyRelationship.trim() || null,
    conditions: values.conditions,
    allergies: values.allergies,
    avatar_url: null,
    // The schema transforms already uppercase / trim these; empty → null so
    // the DB CHECK on location_country doesn't trip on empty strings.
    location_country: values.locationCountry || null,
    location_postcode: values.locationPostcode || null,
  };
}

export function displayAge(dateOfBirth: string): string {
  const age = ageFromDob(dateOfBirth);
  return age === null ? "—" : `${age}`;
}

export function displayBmi(heightCm: unknown, weightKg: unknown): string {
  const bmi = calcBmi(heightCm, weightKg);
  return bmi === null ? "—" : String(bmi);
}

function asStringArray(value: unknown): string[] | null {
  if (!Array.isArray(value)) {
    return null;
  }
  return value.filter((item): item is string => typeof item === "string");
}

function normalizeRow(data: Record<string, unknown> | null): ExtendedProfileRow | null {
  if (!data) {
    return null;
  }
  return {
    full_name: typeof data.full_name === "string" ? data.full_name : null,
    date_of_birth:
      typeof data.date_of_birth === "string" ? data.date_of_birth : null,
    sex: typeof data.sex === "string" ? data.sex : null,
    height_cm: (data.height_cm as number | string | null) ?? null,
    weight_kg: (data.weight_kg as number | string | null) ?? null,
    bmi: (data.bmi as number | string | null) ?? null,
    phone: typeof data.phone === "string" ? data.phone : null,
    blood_type: typeof data.blood_type === "string" ? data.blood_type : null,
    emergency_contact_name:
      typeof data.emergency_contact_name === "string"
        ? data.emergency_contact_name
        : null,
    emergency_contact_phone:
      typeof data.emergency_contact_phone === "string"
        ? data.emergency_contact_phone
        : null,
    emergency_contact_relationship:
      typeof data.emergency_contact_relationship === "string"
        ? data.emergency_contact_relationship
        : null,
    conditions: asStringArray(data.conditions),
    allergies: asStringArray(data.allergies),
    avatar_url: typeof data.avatar_url === "string" ? data.avatar_url : null,
    location_postcode:
      typeof data.location_postcode === "string"
        ? data.location_postcode
        : null,
    location_country:
      typeof data.location_country === "string"
        ? data.location_country
        : null,
    notify_reminders:
      typeof data.notify_reminders === "boolean" ? data.notify_reminders : null,
    notify_results:
      typeof data.notify_results === "boolean" ? data.notify_results : null,
    notify_plan:
      typeof data.notify_plan === "boolean" ? data.notify_plan : null,
    notify_marketing:
      typeof data.notify_marketing === "boolean"
        ? data.notify_marketing
        : null,
    preferred_notify_time:
      typeof data.preferred_notify_time === "string"
        ? data.preferred_notify_time
        : null,
  };
}

/** Columns that exist only after the migration — if missing, we fall back. */
const LEGACY_SELECT = "full_name, date_of_birth, sex, height_cm, weight_kg, bmi";

export async function loadExtendedProfile(
  userId: string,
): Promise<{
  ok: boolean;
  profile: ExtendedProfileRow | null;
  localAvatarUri: string | null;
  message?: string;
  needsMigration?: boolean;
}> {
  if (!isSupabaseConfigured) {
    return { ok: false, profile: null, localAvatarUri: null, message: COPY.missingKeys };
  }

  let localAvatarUri: string | null = null;
  try {
    localAvatarUri = await AsyncStorage.getItem(LOCAL_AVATAR_KEY(userId));
  } catch {
    localAvatarUri = null;
  }

  try {
    const ensured = await ensureProfileRow(userId);
    if (!ensured.ok) {
      return {
        ok: false,
        profile: null,
        localAvatarUri,
        message: ensured.message ?? COPY.missingProfile,
      };
    }

    const full = await supabase
      .from("profiles")
      .select(PROFILE_SELECT)
      .eq("id", userId)
      .maybeSingle();

    if (full.error) {
      const text = full.error.message?.toLowerCase() ?? "";
      const missingColumn =
        text.includes("column") ||
        text.includes("does not exist") ||
        text.includes("schema cache");
      if (missingColumn) {
        const legacy = await supabase
          .from("profiles")
          .select(LEGACY_SELECT)
          .eq("id", userId)
          .maybeSingle();
        if (legacy.error) {
          throw legacy.error;
        }
        return {
          ok: true,
          profile: normalizeRow(legacy.data as Record<string, unknown> | null),
          localAvatarUri,
          needsMigration: true,
          message: COPY.profileNeedsMigration,
        };
      }
      throw full.error;
    }

    return {
      ok: true,
      profile: normalizeRow(full.data as Record<string, unknown> | null),
      localAvatarUri,
    };
  } catch (error) {
    return {
      ok: false,
      profile: null,
      localAvatarUri,
      message: messageFromUnknown(error, COPY.profileLoadFailed),
    };
  }
}

export async function saveExtendedProfile(
  userId: string,
  draft: ExtendedProfileDraft,
  options?: { avatarUrl?: string | null },
): Promise<{ ok: boolean; message?: string; needsMigration?: boolean }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  if (!draft.full_name.trim()) {
    return { ok: false, message: COPY.profileNameRequired };
  }

  try {
    const ensured = await ensureProfileRow(userId, draft.full_name);
    if (!ensured.ok) {
      return { ok: false, message: ensured.message ?? COPY.missingProfile };
    }

    const payload: Record<string, unknown> = {
      full_name: draft.full_name.trim(),
      phone: draft.phone,
      date_of_birth: draft.date_of_birth,
      sex: draft.sex,
      blood_type: draft.blood_type,
      height_cm: draft.height_cm,
      weight_kg: draft.weight_kg,
      emergency_contact_name: draft.emergency_contact_name,
      emergency_contact_phone: draft.emergency_contact_phone,
      emergency_contact_relationship: draft.emergency_contact_relationship,
      conditions: draft.conditions,
      allergies: draft.allergies,
      location_country: draft.location_country,
      location_postcode: draft.location_postcode,
    };
    if (options && "avatarUrl" in options) {
      payload.avatar_url = options.avatarUrl;
    }

    const { error } = await supabase
      .from("profiles")
      .update(payload)
      .eq("id", userId);

    if (error) {
      const text = error.message?.toLowerCase() ?? "";
      const missingColumn =
        text.includes("column") ||
        text.includes("does not exist") ||
        text.includes("schema cache");
      if (missingColumn) {
        // Save the Phase-1 fields that always exist so the user is not stuck.
        const { error: legacyError } = await supabase
          .from("profiles")
          .update({
            full_name: draft.full_name.trim(),
            date_of_birth: draft.date_of_birth,
            sex: draft.sex,
            height_cm: draft.height_cm,
            weight_kg: draft.weight_kg,
          })
          .eq("id", userId);
        if (legacyError) {
          throw legacyError;
        }
        return {
          ok: true,
          needsMigration: true,
          message: COPY.profileNeedsMigration,
        };
      }
      throw error;
    }

    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.profileSaveFailed),
    };
  }
}

export async function saveNotificationPrefs(
  userId: string,
  prefs: NotificationPrefsDraft,
): Promise<{ ok: boolean; message?: string; needsMigration?: boolean }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  if (prefs.preferred_notify_time && !isHHmm(prefs.preferred_notify_time)) {
    return { ok: false, message: COPY.settingsNotifyTimeInvalid };
  }

  try {
    const { error } = await supabase
      .from("profiles")
      .update({
        notify_reminders: prefs.notify_reminders,
        notify_results: prefs.notify_results,
        notify_plan: prefs.notify_plan,
        notify_marketing: prefs.notify_marketing,
        preferred_notify_time: prefs.preferred_notify_time,
      })
      .eq("id", userId);

    if (error) {
      const text = error.message?.toLowerCase() ?? "";
      if (
        text.includes("column") ||
        text.includes("does not exist") ||
        text.includes("schema cache")
      ) {
        // Local fallback so toggles still feel saved on this device.
        await AsyncStorage.setItem(
          `prescope:notify-prefs:${userId}`,
          JSON.stringify(prefs),
        );
        return {
          ok: true,
          needsMigration: true,
          message: COPY.profileNeedsMigration,
        };
      }
      throw error;
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.settingsNotifySaveFailed),
    };
  }
}

export async function loadLocalNotificationPrefsFallback(
  userId: string,
): Promise<NotificationPrefsDraft | null> {
  try {
    const raw = await AsyncStorage.getItem(`prescope:notify-prefs:${userId}`);
    if (!raw) {
      return null;
    }
    const parsed = JSON.parse(raw) as NotificationPrefsDraft;
    return parsed;
  } catch {
    return null;
  }
}

export async function setLocalAvatarUri(
  userId: string,
  uri: string | null,
): Promise<void> {
  try {
    if (!uri) {
      await AsyncStorage.removeItem(LOCAL_AVATAR_KEY(userId));
      return;
    }
    await AsyncStorage.setItem(LOCAL_AVATAR_KEY(userId), uri);
  } catch {
    // Non-fatal — profile still saves without a photo.
  }
}

export function prefsFromProfile(
  row: ExtendedProfileRow | null,
  fallback: NotificationPrefsDraft | null,
): NotificationPrefsDraft {
  if (row?.notify_reminders !== null && row?.notify_reminders !== undefined) {
    return {
      notify_reminders: Boolean(row.notify_reminders),
      notify_results: row.notify_results !== false,
      notify_plan: row.notify_plan !== false,
      notify_marketing: Boolean(row.notify_marketing),
      preferred_notify_time: row.preferred_notify_time,
    };
  }
  if (fallback) {
    return fallback;
  }
  return {
    notify_reminders: true,
    notify_results: true,
    notify_plan: true,
    notify_marketing: false,
    preferred_notify_time: "09:00",
  };
}
