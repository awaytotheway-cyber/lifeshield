import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import {
  IconButton,
  PrimaryButton,
  TextButton,
} from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { DatePicker } from "@/components/ui/DatePicker";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Screen } from "@/components/ui/Screen";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { Surface } from "@/components/ui/Surface";
import { TextField } from "@/components/ui/TextField";
import { Toast } from "@/components/ui/Toast";
import { TwoTone } from "@/components/ui/TwoTone";
import { isAdminEmail, SEX_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
import { colors, radius, spacing, status, tapTarget } from "@/lib/design-tokens";
import { messageFromUnknown } from "@/lib/friendly-errors";
import {
  ALLERGY_OPTIONS,
  BLOOD_TYPE_OPTIONS,
  CONDITION_OPTIONS,
  EMERGENCY_RELATIONSHIP_OPTIONS,
} from "@/lib/profile-constants";
import {
  displayAge,
  displayBmi,
  emptyProfileForm,
  formToDraft,
  loadExtendedProfile,
  profileFormSchema,
  profileRowToForm,
  saveExtendedProfile,
  setLocalAvatarUri,
  type ProfileFormInput,
  type ProfileFormParsed,
} from "@/lib/profile-extended";
import { routes } from "@/lib/routes";
import { fontFamily, typography } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useEligibilityStore } from "@/stores/eligibility-store";
import { useTriageStore } from "@/stores/triage-store";

/** Failure text borrows the clay of `worthDiscussing`. Moss has no red. */
const CLAY = status.worthDiscussing.text;

/** The migration note is a caution, not a failure — the amber of the scale. */
const AMBER = status.worthWatching.text;

export default function ProfileScreen() {
  const router = useRouter();
  const session = useAuthStore((state) => state.session);
  const signOut = useAuthStore((state) => state.signOut);
  const triageStatus = useTriageStore((state) => state.status);

  const [loading, setLoading] = useState(true);
  const [loadMessage, setLoadMessage] = useState<string | null>(null);
  const [saveMessage, setSaveMessage] = useState<string | null>(null);
  const [toast, setToast] = useState<string | null>(null);
  const [migrationNote, setMigrationNote] = useState<string | null>(null);
  const [avatarUri, setAvatarUri] = useState<string | null>(null);
  const [signingOut, setSigningOut] = useState(false);
  const [signOutMessage, setSignOutMessage] = useState<string | null>(null);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm<ProfileFormInput, unknown, ProfileFormParsed>({
    resolver: zodResolver(profileFormSchema),
    defaultValues: emptyProfileForm(),
  });

  const dateOfBirth = useWatch({ control, name: "dateOfBirth" });
  const heightCm = useWatch({ control, name: "heightCm" });
  const weightKg = useWatch({ control, name: "weightKg" });

  const refresh = useCallback(async () => {
    if (!session?.user.id) {
      return;
    }
    setLoading(true);
    try {
      const result = await loadExtendedProfile(session.user.id);
      if (!result.ok) {
        setLoadMessage(result.message ?? COPY.profileLoadFailed);
        reset(emptyProfileForm());
        return;
      }
      const metaName =
        typeof session.user.user_metadata?.full_name === "string"
          ? session.user.user_metadata.full_name
          : undefined;
      reset(profileRowToForm(result.profile, metaName));
      setAvatarUri(result.localAvatarUri ?? result.profile?.avatar_url ?? null);
      setLoadMessage(null);
      setMigrationNote(result.needsMigration ? COPY.profileNeedsMigration : null);
    } catch (error) {
      setLoadMessage(messageFromUnknown(error, COPY.profileLoadFailed));
    } finally {
      setLoading(false);
    }
  }, [session?.user.id, session?.user.user_metadata?.full_name, reset]);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  if (!session) {
    return <Redirect href={routes.login} />;
  }

  if (triageStatus === "locked") {
    return <Redirect href={routes.pathwayB} />;
  }

  if (triageStatus === "pending") {
    return <Redirect href={routes.symptomCheck} />;
  }

  const email = session.user.email?.trim() ?? "";

  const onSave = handleSubmit(async (values) => {
    setSaveMessage(null);
    try {
      const draft = formToDraft(values);
      const result = await saveExtendedProfile(session.user.id, draft);
      if (!result.ok) {
        setSaveMessage(result.message ?? COPY.profileSaveFailed);
        return;
      }
      if (result.needsMigration) {
        setMigrationNote(COPY.profileNeedsMigration);
      }
      // Date of birth or sex can change here: refresh the eligibility gate.
      void useEligibilityStore.getState().load(session.user.id);
      setToast(COPY.profileSavedToast);
      await refresh();
    } catch (error) {
      setSaveMessage(messageFromUnknown(error, COPY.profileSaveFailed));
    }
  });

  const pickPhoto = async () => {
    try {
      const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
      if (!permission.granted) {
        setSaveMessage(COPY.profilePhotoDenied);
        return;
      }
      const picked = await ImagePicker.launchImageLibraryAsync({
        mediaTypes: ["images"],
        allowsEditing: true,
        aspect: [1, 1],
        quality: 0.7,
      });
      if (picked.canceled || !picked.assets[0]?.uri) {
        return;
      }
      const uri = picked.assets[0].uri;
      setAvatarUri(uri);
      await setLocalAvatarUri(session.user.id, uri);
      // Date of birth or sex can change here: refresh the eligibility gate.
      void useEligibilityStore.getState().load(session.user.id);
      setToast(COPY.profileSavedToast);
    } catch (error) {
      setSaveMessage(messageFromUnknown(error, COPY.profilePhotoFailed));
    }
  };

  const removePhoto = async () => {
    setAvatarUri(null);
    await setLocalAvatarUri(session.user.id, null);
  };

  return (
    <Screen scroll>
      <View style={styles.topRow}>
        <IconButton
          icon="arrow-left"
          accessibilityLabel="Back to settings"
          onPress={() => router.replace(routes.settings)}
          style={styles.back}
        />
      </View>

      <View accessibilityRole="header">
        <TwoTone
          size="xl"
          parts={[{ text: COPY.profileTitle, tone: "bold" }]}
        />
      </View>

      {/* What is required, what is optional, and what PRESCOPE is not. */}
      <Text style={styles.body}>{COPY.profileBody}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}
      {loadMessage ? <Text style={styles.error}>{loadMessage}</Text> : null}
      {migrationNote ? <Text style={styles.note}>{migrationNote}</Text> : null}

      {!loading ? (
        <>
          <Surface style={styles.photoCard}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={
                avatarUri ? COPY.profilePhotoChange : COPY.profilePhotoAdd
              }
              onPress={() => void pickPhoto()}
              style={styles.avatarHit}
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="camera" size={28} color={colors.ink} />
                </View>
              )}
            </Pressable>
            <TextButton
              title={avatarUri ? COPY.profilePhotoChange : COPY.profilePhotoAdd}
              onPress={() => void pickPhoto()}
            />
            {avatarUri ? (
              <TextButton title={COPY.profilePhotoRemove} onPress={() => void removePhoto()} />
            ) : null}
          </Surface>

          <Surface style={styles.formCard}>
            <Controller
              control={control}
              name="fullName"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label={`${COPY.profileNameLabel} *`}
                  value={value}
                  onChangeText={onChange}
                  error={errors.fullName?.message}
                  autoCapitalize="words"
                />
              )}
            />

            <Text style={styles.label}>{COPY.profileEmailLabel} *</Text>
            <Text style={styles.value}>
              {email.length > 0 ? email : COPY.profileEmailEmpty}
            </Text>
            <Text style={styles.hint}>{COPY.profileEmailReadonly}</Text>
            {isAdminEmail(email) ? (
              <View style={styles.badge}>
                <Text style={styles.badgeText}>{COPY.profileAdminBadge}</Text>
              </View>
            ) : null}

            <Controller
              control={control}
              name="phone"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label={COPY.profilePhoneLabel}
                  value={value}
                  onChangeText={onChange}
                  error={errors.phone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />

            <Controller
              control={control}
              name="dateOfBirth"
              render={({ field: { value, onChange } }) => (
                <DatePicker
                  label={COPY.profileDobLabel}
                  value={value}
                  onChange={onChange}
                  error={errors.dateOfBirth?.message}
                  maximumDate={todayLocalDate()}
                  minimumDate={dateFromYmd(1920, 1, 1)}
                />
              )}
            />
            <Text style={styles.computed}>
              {COPY.profileAgeLabel}: {displayAge(dateOfBirth ?? "")}
            </Text>

            <Controller
              control={control}
              name="sex"
              render={({ field: { value, onChange } }) => (
                <RadioGroup
                  label={COPY.profileGenderLabel}
                  options={SEX_OPTIONS}
                  value={value}
                  onChange={onChange}
                  error={errors.sex?.message}
                />
              )}
            />

            <Controller
              control={control}
              name="bloodType"
              render={({ field: { value, onChange } }) => (
                <SelectPicker
                  label={COPY.profileBloodLabel}
                  options={BLOOD_TYPE_OPTIONS}
                  value={value}
                  onChange={onChange}
                  error={errors.bloodType?.message}
                  placeholder="Select"
                />
              )}
            />

            <Controller
              control={control}
              name="heightCm"
              render={({ field: { value, onChange } }) => (
                <NumberInput
                  label={COPY.profileHeightLabel}
                  value={value}
                  onChangeText={onChange}
                  error={errors.heightCm?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="weightKg"
              render={({ field: { value, onChange } }) => (
                <NumberInput
                  label={COPY.profileWeightLabel}
                  value={value}
                  onChangeText={onChange}
                  error={errors.weightKg?.message}
                />
              )}
            />
            <Text style={styles.computed}>
              {COPY.profileBmiLabel}: {displayBmi(heightCm, weightKg)}
            </Text>

            {/*
              Phase D: location fields drive lab-search proximity ranking in
              the book-a-test flow. The book screen still has an inline
              editor for users who go there without visiting this screen —
              this section is the durable place to set them.
            */}
            <Text style={styles.section}>Location</Text>
            <Controller
              control={control}
              name="locationCountry"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Country (ISO)"
                  placeholder="IN, GB, US…"
                  value={value}
                  onChangeText={onChange}
                  error={errors.locationCountry?.message}
                  autoCapitalize="characters"
                  maxLength={2}
                />
              )}
            />
            <Controller
              control={control}
              name="locationPostcode"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label="Postcode / ZIP"
                  placeholder="400001 / SW1A 1AA"
                  value={value}
                  onChangeText={onChange}
                  error={errors.locationPostcode?.message}
                />
              )}
            />

            <Text style={styles.section}>{COPY.profileEmergencyHeading}</Text>
            <Controller
              control={control}
              name="emergencyName"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label={COPY.profileEmergencyName}
                  value={value}
                  onChangeText={onChange}
                  error={errors.emergencyName?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="emergencyPhone"
              render={({ field: { value, onChange } }) => (
                <TextField
                  label={COPY.profileEmergencyPhone}
                  value={value}
                  onChangeText={onChange}
                  error={errors.emergencyPhone?.message}
                  keyboardType="phone-pad"
                />
              )}
            />
            <Controller
              control={control}
              name="emergencyRelationship"
              render={({ field: { value, onChange } }) => (
                <SelectPicker
                  label={COPY.profileEmergencyRelationship}
                  options={EMERGENCY_RELATIONSHIP_OPTIONS}
                  value={value}
                  onChange={onChange}
                  error={errors.emergencyRelationship?.message}
                  placeholder="Select"
                />
              )}
            />

            <Controller
              control={control}
              name="conditions"
              render={({ field: { value, onChange } }) => (
                <CheckboxGroup
                  label={COPY.profileConditionsLabel}
                  options={CONDITION_OPTIONS}
                  values={value}
                  onChange={onChange}
                  error={errors.conditions?.message}
                />
              )}
            />
            <Controller
              control={control}
              name="allergies"
              render={({ field: { value, onChange } }) => (
                <CheckboxGroup
                  label={COPY.profileAllergiesLabel}
                  options={ALLERGY_OPTIONS}
                  values={value}
                  onChange={onChange}
                  error={errors.allergies?.message}
                />
              )}
            />
          </Surface>

          {saveMessage ? <Text style={styles.error}>{saveMessage}</Text> : null}

          <PrimaryButton
            title={COPY.profileSave}
            loading={isSubmitting}
            disabled={isSubmitting || !isDirty}
            onPress={() => void onSave()}
            accessibilityLabel={COPY.profileSave}
          />

          {signOutMessage ? (
            <Text style={styles.error}>{signOutMessage}</Text>
          ) : null}

          <TextButton
            title={COPY.signOut}
            loading={signingOut}
            disabled={signingOut}
            onPress={() => {
              void (async () => {
                setSigningOut(true);
                setSignOutMessage(null);
                try {
                  const result = await signOut();
                  if (!result.ok) {
                    setSignOutMessage(result.message ?? COPY.profileSignOutFailed);
                  }
                } catch (error) {
                  setSignOutMessage(
                    messageFromUnknown(error, COPY.profileSignOutFailed),
                  );
                } finally {
                  setSigningOut(false);
                }
              })();
            }}
          />
        </>
      ) : null}

      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  topRow: {
    flexDirection: "row",
    alignItems: "center",
  },
  back: {
    // Pulled into the gutter so the glyph, not its 44pt hit area, lines up
    // with the headline under it.
    marginLeft: -12,
  },
  body: {
    marginTop: spacing.mdSm,
    ...typography.body,
    color: colors.inkSoft,
  },
  error: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: CLAY,
  },
  note: {
    marginTop: spacing.mdSm,
    ...typography.label,
    color: AMBER,
  },
  photoCard: {
    marginTop: spacing.md,
    alignItems: "center",
  },
  avatarHit: {
    minWidth: tapTarget,
    minHeight: tapTarget,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
  },
  // The stand-in for a photo is the same moss tint an InitialDisc sits on, so
  // an empty avatar reads as part of the system rather than as a hole.
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: radius.pill,
    backgroundColor: colors.mossTint,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    marginTop: spacing.md,
    marginBottom: spacing.md,
  },
  label: {
    marginTop: spacing.base,
    ...typography.label,
    color: colors.inkSoft,
  },
  value: {
    marginTop: spacing.micro,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    lineHeight: 23,
    color: colors.ink,
  },
  hint: {
    marginTop: spacing.micro,
    ...typography.label,
    // Not `inkFaint`: that only clears its contrast on headline words 24px
    // and up, and this is a 13px line of body copy.
    color: colors.inkSoft,
  },
  computed: {
    marginTop: spacing.sm,
    ...typography.label,
    // The one text-safe green — a derived value, not an editable field.
    color: colors.mossDeep,
  },
  section: {
    marginTop: spacing.md,
    ...typography.title,
    color: colors.ink,
  },
  badge: {
    marginTop: spacing.mdSm,
    alignSelf: "flex-start",
    backgroundColor: colors.mossTint,
    borderRadius: radius.pill,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    ...typography.label,
    color: status.withinRange.text,
  },
});
