import { zodResolver } from "@hookform/resolvers/zod";
import { Image } from "expo-image";
import * as ImagePicker from "expo-image-picker";
import { Redirect, useRouter } from "expo-router";
import { useCallback, useEffect, useState } from "react";
import { Controller, useForm, useWatch } from "react-hook-form";
import { StyleSheet, Text, View } from "react-native";
import { Feather } from "@expo/vector-icons";

import { PrimaryButton, TextButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { CheckboxGroup } from "@/components/ui/CheckboxGroup";
import { Chip } from "@/components/ui/Chip";
import { DatePicker } from "@/components/ui/DatePicker";
import { NumberInput } from "@/components/ui/NumberInput";
import { PressScale } from "@/components/ui/PressScale";
import { RadioGroup } from "@/components/ui/RadioGroup";
import { Screen } from "@/components/ui/Screen";
import { ScreenHeader } from "@/components/ui/ScreenHeader";
import { SectionTitle } from "@/components/ui/SectionTitle";
import { SelectPicker } from "@/components/ui/SelectPicker";
import { StaticSkeleton } from "@/components/ui/StaticSkeleton";
import { TextField } from "@/components/ui/TextField";
import { Toast } from "@/components/ui/Toast";
import { isAdminEmail, SEX_OPTIONS } from "@/lib/constants";
import { COPY } from "@/lib/copy";
import { dateFromYmd, todayLocalDate } from "@/lib/datetime";
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
import { Colors, Gap, Space, typeStyle } from "@/lib/theme";
import { useAuthStore } from "@/stores/auth-store";
import { useTriageStore } from "@/stores/triage-store";

/** One derived, read-only number — big and orange, per Section 8. */
function DerivedReadout({ label, value }: { label: string; value: string }) {
  return (
    <View style={styles.derived}>
      <Text style={styles.derivedLabel}>{label}</Text>
      <Text style={styles.derivedValue}>{value}</Text>
    </View>
  );
}

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
    <Screen scroll>
      <ScreenHeader
        title={COPY.profileTitle}
        subtitle={COPY.profileBody}
        onBack={() => router.replace(routes.settings)}
        backLabel="Back to settings"
      />

      {loading ? <StaticSkeleton rows={4} /> : null}
      {loadMessage ? <Text style={styles.error}>{loadMessage}</Text> : null}
      {migrationNote ? <Text style={styles.note}>{migrationNote}</Text> : null}

      {!loading ? (
        <>
          <Card style={styles.photoCard}>
            <PressScale
              accessibilityRole="button"
              accessibilityLabel={
                avatarUri ? COPY.profilePhotoChange : COPY.profilePhotoAdd
              }
              onPress={() => void pickPhoto()}
              haptic="light"
            >
              {avatarUri ? (
                <Image
                  source={{ uri: avatarUri }}
                  style={styles.avatar}
                  contentFit="cover"
                />
              ) : (
                <View style={styles.avatarPlaceholder}>
                  <Feather name="camera" size={28} color={Colors.orange} />
                </View>
              )}
            </PressScale>
            <TextButton
              title={avatarUri ? COPY.profilePhotoChange : COPY.profilePhotoAdd}
              onPress={() => void pickPhoto()}
            />
            {avatarUri ? (
              <TextButton
                title={COPY.profilePhotoRemove}
                onPress={() => void removePhoto()}
              />
            ) : null}
          </Card>

          <SectionTitle title="About you" />
          <Card>
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

            <View style={styles.readonlyBlock}>
              <Text style={styles.readonlyLabel}>
                {COPY.profileEmailLabel} *
              </Text>
              <Text style={styles.readonlyValue}>
                {email.length > 0 ? email : COPY.profileEmailEmpty}
              </Text>
              <Text style={styles.hint}>{COPY.profileEmailReadonly}</Text>
              {isAdminEmail(email) ? (
                <View style={styles.badge}>
                  <Chip label={COPY.profileAdminBadge} tone="green" />
                </View>
              ) : null}
            </View>

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
          </Card>

          <SectionTitle title="Your numbers" />
          <Card>
            <View style={styles.derivedRow}>
              <DerivedReadout
                label={COPY.profileAgeLabel}
                value={displayAge(dateOfBirth ?? "")}
              />
              <View style={styles.derivedDivider} />
              <DerivedReadout
                label={COPY.profileBmiLabel}
                value={displayBmi(heightCm, weightKg)}
              />
            </View>
          </Card>

          <SectionTitle title={COPY.profileEmergencyHeading} />
          <Card>
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
          </Card>

          <SectionTitle title="Health background" />
          <Card>
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
          </Card>

          {saveMessage ? <Text style={styles.error}>{saveMessage}</Text> : null}

          <View style={styles.footer}>
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
                      setSignOutMessage(
                        result.message ?? COPY.profileSignOutFailed,
                      );
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
          </View>
        </>
      ) : null}

      <Toast message={toast} onHide={() => setToast(null)} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  error: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.red,
  },
  note: {
    ...typeStyle("secondary"),
    marginTop: Space.md,
    color: Colors.amber,
  },
  photoCard: {
    alignItems: "center",
  },
  avatar: {
    width: 104,
    height: 104,
    borderRadius: 52,
  },
  avatarPlaceholder: {
    width: 104,
    height: 104,
    borderRadius: 52,
    backgroundColor: Colors.orangeTint,
    alignItems: "center",
    justifyContent: "center",
  },
  readonlyBlock: {
    marginTop: Space.lg,
  },
  readonlyLabel: {
    ...typeStyle("cardTitle"),
    marginBottom: Gap.labelToField,
    color: Colors.ink,
  },
  readonlyValue: {
    ...typeStyle("body"),
    color: Colors.ink,
  },
  hint: {
    ...typeStyle("secondary"),
    marginTop: Space.xs,
    color: Colors.muted,
  },
  badge: {
    marginTop: Space.sm,
  },
  derivedRow: {
    flexDirection: "row",
    alignItems: "stretch",
  },
  derived: {
    flex: 1,
  },
  derivedDivider: {
    width: StyleSheet.hairlineWidth,
    backgroundColor: Colors.line,
    marginHorizontal: Space.md,
  },
  derivedLabel: {
    ...typeStyle("secondary"),
    color: Colors.muted,
  },
  derivedValue: {
    ...typeStyle("dataBig"),
    marginTop: Space.xs,
    color: Colors.orange,
  },
  footer: {
    marginTop: Gap.beforeFooter,
  },
});
