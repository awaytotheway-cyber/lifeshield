import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { Pressable, StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { MenuButton } from "@/components/navigation/MenuButton";
import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { DatePicker } from "@/components/ui/DatePicker";
import { GlassCard } from "@/components/ui/GlassCard";
import { NumberInput } from "@/components/ui/NumberInput";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextField } from "@/components/ui/TextField";
import { Toast } from "@/components/ui/Toast";
import { isAdminEmail, SEX_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
import { colors, radius, spacing, tapTarget } from "@/lib/design-tokens";
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
import { fontFamily } from "@/lib/typography";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

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
    <Screen scroll contentPadding={spacing.screenX}>
      <View style={styles.topRow}>
        <MenuButton />
        <View style={styles.headerFlex}>
          <ScreenHeader
            title={COPY.profileTitle}
            onBack={() => router.replace(routes.settings)}
            backLabel="Back to settings"
          />
        </View>
      </View>
      <Text style={styles.body}>{COPY.profileBody}</Text>

      {loading ? <StaticSkeleton rows={4} /> : null}
      {loadMessage ? <Text style={styles.error}>{loadMessage}</Text> : null}
      {migrationNote ? <Text style={styles.note}>{migrationNote}</Text> : null}

      {!loading ? (
        <>
          <GlassCard intensity="card" style={styles.photoCard}>
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
                  <Feather name="camera" size={28} color={colors.primaryBlue} />
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
          </GlassCard>

          <GlassCard intensity="card" style={styles.formCard}>
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
          </GlassCard>

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
  headerFlex: {
    flex: 1,
  },
  body: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 15,
    lineHeight: 24,
    color: colors.slate,
  },
  error: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    color: colors.coral,
  },
  note: {
    marginTop: 12,
    fontFamily: fontFamily.body,
    fontSize: 13,
    lineHeight: 20,
    color: colors.amber,
  },
  photoCard: {
    marginTop: spacing.md,
    alignItems: "center",
    padding: spacing.base,
  },
  avatarHit: {
    minWidth: tapTarget,
    minHeight: tapTarget,
  },
  avatar: {
    width: 96,
    height: 96,
    borderRadius: 48,
  },
  avatarPlaceholder: {
    width: 96,
    height: 96,
    borderRadius: 48,
    backgroundColor: colors.lightTeal,
    alignItems: "center",
    justifyContent: "center",
  },
  formCard: {
    marginTop: spacing.md,
    padding: spacing.base,
    marginBottom: spacing.md,
  },
  label: {
    marginTop: 16,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    letterSpacing: 0.2,
    color: colors.slate,
  },
  value: {
    marginTop: 4,
    fontFamily: fontFamily.bodySemi,
    fontSize: 17,
    color: colors.charcoal,
  },
  hint: {
    marginTop: 4,
    fontFamily: fontFamily.body,
    fontSize: 12,
    color: colors.mist,
  },
  computed: {
    marginTop: 8,
    fontFamily: fontFamily.bodyMedium,
    fontSize: 14,
    color: colors.primaryBlue,
  },
  section: {
    marginTop: 24,
    fontFamily: fontFamily.displaySemi,
    fontSize: 18,
    color: colors.deepNavy,
  },
  badge: {
    marginTop: 12,
    alignSelf: "flex-start",
    backgroundColor: colors.sageLight,
    borderRadius: radius.chip,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  badgeText: {
    fontFamily: fontFamily.bodyMedium,
    fontSize: 12,
    color: colors.sage,
  },
});
