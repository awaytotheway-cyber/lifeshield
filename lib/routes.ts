import type { Href } from "expo-router";

/**
 * Named routes so screens don't scatter magic strings.
 * `as Href` is only needed until Expo regenerates typed-route types.
 */
export const routes = {
  splash: "/" as Href,
  login: "/(auth)/login" as Href,
  register: "/(auth)/register" as Href,
  welcome: "/(onboarding)/welcome" as Href,
  disclaimer: "/(onboarding)/disclaimer" as Href,
  terms: "/(onboarding)/consent-terms" as Href,
  consentPrivacy: "/(onboarding)/consent-privacy" as Href,
  home: "/(main)/home" as Href,
  questionnaire: "/(main)/questionnaire" as Href,
  qDemographics: "/(main)/questionnaire/demographics" as Href,
  qReproductive: "/(main)/questionnaire/reproductive" as Href,
  qRadiation: "/(main)/questionnaire/radiation" as Href,
  qComorbidities: "/(main)/questionnaire/comorbidities" as Href,
  qFamilyHistory: "/(main)/questionnaire/family-history" as Href,
  qPersonal: "/(main)/questionnaire/personal" as Href,
  qLifestyle: "/(main)/questionnaire/lifestyle" as Href,
  qStress: "/(main)/questionnaire/stress" as Href,
  qDiet: "/(main)/questionnaire/diet" as Href,
  qPriorScreening: "/(main)/questionnaire/prior-screening" as Href,
  results: "/(main)/(results)" as Href,
  labResults: "/(main)/(results)/lab-results" as Href,
  resultDetail: "/(main)/(results)/result-detail" as Href,
  enterResults: "/(main)/(results)/enter-results" as Href,
  plan: "/(main)/(plan)" as Href,
  planItem: "/(main)/(plan)/intervention" as Href,
  followUp: "/(main)/(followup)" as Href,
  followUpSymptomRecheck: "/(main)/(followup)/symptom-recheck" as Href,
  store: "/(main)/(store)" as Href,
  storeProduct: "/(main)/(store)/product" as Href,
  storeCart: "/(main)/(store)/cart" as Href,
  storeCheckout: "/(main)/(store)/checkout" as Href,
  orders: "/(main)/(orders)" as Href,
  more: "/(main)/(settings)" as Href,
  clinicalTermPreview: "/(main)/clinical-term-preview" as Href,
  profile: "/(main)/(settings)/profile" as Href,
  settings: "/(main)/(settings)" as Href,
  settingsNotifications: "/(main)/(settings)/notifications" as Href,
  settingsPrivacy: "/(main)/(settings)/privacy" as Href,
  settingsHelp: "/(main)/(settings)/help" as Href,
  settingsAbout: "/(main)/(settings)/about" as Href,
  settingsDeleteAccount: "/(main)/(settings)/delete-account" as Href,
  settingsConsents: "/(main)/(settings)/consents" as Href,
  appointments: "/(main)/(settings)/appointments" as Href,
  prescriptions: "/(main)/(settings)/prescriptions" as Href,
  notificationsInbox: "/(main)/(settings)/notifications-inbox" as Href,
  symptomCheck: "/(main)/(triage)/symptom-check" as Href,
  consentBrca: "/(main)/(consent)/brca" as Href,
  consentCtc: "/(main)/(consent)/ctc" as Href,
  consentSnp: "/(main)/(consent)/snp" as Href,
  pathwayB: "/pathway-b" as Href,
  goals: "/(main)/(goals)" as Href,
  goalsNew: "/(main)/(goals)/new" as Href,
  reminders: "/(main)/(reminders)" as Href,
  remindersNew: "/(main)/(reminders)/new" as Href,
} as const;

export function resultDetailHref(id: string): Href {
  return `/(main)/(results)/result-detail?id=${encodeURIComponent(id)}` as Href;
}

export function planItemHref(id: string): Href {
  return `/(main)/(plan)/intervention?id=${encodeURIComponent(id)}` as Href;
}

export function followUpSymptomHref(id: string): Href {
  return `/(main)/(followup)/symptom-recheck?id=${encodeURIComponent(id)}` as Href;
}

export function productHref(id: string): Href {
  return `/(main)/(store)/product?id=${encodeURIComponent(id)}` as Href;
}

export function orderPlacedHref(orderId: string): Href {
  return `/(main)/(orders)?placed=1&orderId=${encodeURIComponent(orderId)}` as Href;
}

export function goalHref(id: string): Href {
  return `/(main)/(goals)/goal?id=${encodeURIComponent(id)}` as Href;
}

export function reminderHref(id: string): Href {
  return `/(main)/(reminders)/reminder?id=${encodeURIComponent(id)}` as Href;
}

/**
 * Deep-link to the New Goal screen with fields prefilled from an intervention.
 * The screen validates on save, so if any param is missing or malformed the
 * user simply sees the empty form.
 */
export function goalsNewFromInterventionHref(prefill: {
  goal_type: string;
  title: string;
  target: { value: number; unit: string; cadence: "daily" | "weekly" | "once" };
  source_ref: string;
}): Href {
  const params = new URLSearchParams({
    goal_type: prefill.goal_type,
    title: prefill.title,
    target_value: String(prefill.target.value),
    target_unit: prefill.target.unit,
    cadence: prefill.target.cadence,
    source_kind: "intervention",
    source_ref: prefill.source_ref,
  });
  return `/(main)/(goals)/new?${params.toString()}` as Href;
}

export function orderDetailHref(orderId: string): Href {
  return `/(main)/(orders)/order?id=${encodeURIComponent(orderId)}` as Href;
}
