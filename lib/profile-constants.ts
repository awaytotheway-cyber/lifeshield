/**
 * Profile / settings option lists — edit here to change dropdowns later.
 */
export const BLOOD_TYPE_OPTIONS = [
  { value: "a_pos", label: "A+" },
  { value: "a_neg", label: "A-" },
  { value: "b_pos", label: "B+" },
  { value: "b_neg", label: "B-" },
  { value: "ab_pos", label: "AB+" },
  { value: "ab_neg", label: "AB-" },
  { value: "o_pos", label: "O+" },
  { value: "o_neg", label: "O-" },
  { value: "unknown", label: "Prefer not to say" },
] as const;

export const CONDITION_OPTIONS = [
  { value: "diabetes", label: "Diabetes" },
  { value: "thyroid", label: "Thyroid condition" },
  { value: "hypertension", label: "High blood pressure" },
  { value: "heart", label: "Heart condition" },
  { value: "asthma", label: "Asthma / breathing" },
  { value: "autoimmune", label: "Autoimmune condition" },
  { value: "cancer_history", label: "Personal cancer history" },
  { value: "other", label: "Other (tell your clinician)" },
  { value: "none", label: "None of these" },
] as const;

export const ALLERGY_OPTIONS = [
  { value: "penicillin", label: "Penicillin" },
  { value: "sulfa", label: "Sulfa drugs" },
  { value: "aspirin_nsaids", label: "Aspirin / NSAIDs" },
  { value: "latex", label: "Latex" },
  { value: "food", label: "Food allergies" },
  { value: "other", label: "Other" },
  { value: "none", label: "No known allergies" },
] as const;

export const EMERGENCY_RELATIONSHIP_OPTIONS = [
  { value: "partner", label: "Partner / spouse" },
  { value: "parent", label: "Parent" },
  { value: "child", label: "Child" },
  { value: "sibling", label: "Sibling" },
  { value: "friend", label: "Friend" },
  { value: "other", label: "Other" },
] as const;

export const PROFILE_FAQ = [
  {
    id: "what-is-prescope",
    question: "What is PRESCOPE?",
    answer:
      "PRESCOPE is a lifestyle awareness tool. It helps you organise health and lifestyle answers and suggested tests. It does not diagnose, detect, or treat any condition.",
  },
  {
    id: "who-sees-data",
    question: "Who can see my answers?",
    answer:
      "By default only you can read your own rows (Supabase Row Level Security). Assigned clinicians using the admin tools may see what you share for review. We never put a service-role key in the app.",
  },
  {
    id: "export-delete",
    question: "Can I export or delete my data?",
    answer:
      "Yes. Settings → Data & Privacy lets you export a JSON copy of your own tables. Account deletion is requested from the same area; a human admin completes the final Auth removal.",
  },
  {
    id: "notifications",
    question: "How do reminders work?",
    answer:
      "Follow-up reminders can run on this device. Remote push needs a development or store build (not Expo Go). You can change toggles under Settings → Notifications.",
  },
  {
    id: "symptoms",
    question: "What if I notice new symptoms?",
    answer:
      "Use urgent care or your usual clinician. PRESCOPE has a Pathway B exit for reported symptoms and is not an emergency service.",
  },
] as const;
