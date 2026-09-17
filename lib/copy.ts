/**
 * All user-facing sentences live here.
 * To reword a screen later, change the text in this file only.
 *
 * Never say the app diagnoses, detects, or treats anything.
 */
export const COPY = {
  appName: "PRESCOPE",
  tagline: "A lifestyle awareness tool — not a diagnostic or medical app.",
  loadingApp: "Loading PRESCOPE…",

  missingKeys:
    "Add your Supabase Project URL and anon public key to the .env file, then restart the app. For a standalone APK built in the cloud, set the same values as EAS secrets (see docs/BUILD-APK.md).",

  splashSubtitle: "Lifestyle awareness, made simple.",

  loginTitle: "Welcome back",
  loginSubtitle: "Sign in to continue your PRESCOPE journey.",
  loginButton: "Log in",
  loginToRegister: "New here? Create an account",
  forgotPassword: "Forgot password",
  forgotPasswordNeedEmail: "Enter your email first, then tap Forgot password.",
  forgotPasswordSent:
    "Check your email for a reset link. Then come back here and log in with your new password.",
  authLoading: "Loading…",

  registerTitle: "Create your account",
  registerSubtitle:
    "Any valid email works — no invite list. We’ll use this email to save your answers privately. You can change your mind later.",
  registerButton: "Create account",
  registerToLogin: "Already have an account? Log in",
  registerEmailExists:
    "That email already has an account. Tap “Already have an account? Log in” instead of registering again.",
  registerEmailConfirm:
    "Check your email to confirm the account. For local testing you can turn off “Confirm email” in Supabase → Authentication → Providers → Email.",
  registerRedirectUrl:
    "Sign-up is blocked because this website address is not allowed. In Supabase: Authentication → URL Configuration. Set Site URL to http://localhost:8081 and add Redirect URLs: http://localhost:8081 and http://localhost:8081/** . Then try again.",
  registerRateLimit:
    "Supabase asked us to wait a moment (too many sign-up emails). Wait about a minute, then try again. If the email is already registered, tap Log in instead.",
  registerPasswordPolicy:
    "That password does not meet the project rules. Use at least 8 characters. If it still fails, check Authentication → Providers → Email (password requirements) in Supabase.",

  onboardingSkip: "Skip",

  welcomeTitle: "Understand your lifestyle picture",
  welcomeBody:
    "You’ll answer a few questions about health and lifestyle. PRESCOPE then shows tests that may be worth discussing with a practitioner.",
  welcomeContinue: "Continue",

  disclaimerTitle: "This is not medical advice",
  disclaimerBody:
    "PRESCOPE is a lifestyle awareness tool. It does not diagnose, detect, or treat any condition, and it does not replace a qualified health professional.\n\nIf you have new symptoms, pain, or anything that worries you, speak to a clinician or local urgent care. In an emergency, use your local emergency number.",
  disclaimerButton: "I understand",

  termsTitle: "Your answers stay private",
  termsBody:
    "By continuing you agree that:\n\n• Your answers are stored in your PRESCOPE account so you can pick up later.\n• Only you can see your own data (privacy rules are on by default).\n• PRESCOPE is a lifestyle awareness tool, not a medical service.\n• You can ask us to delete your account later.\n\nThis is a Phase 1 summary. A fuller legal document can replace this text later.",
  termsCheckbox: "I agree to the terms and privacy summary",
  termsButton: "Get started",
  termsNeedCheck: "Tick the box to continue.",

  consentGateTitle: "Before we begin, we need your agreement",
  consentGateCollectsTitle: "What Prescope collects and why",
  consentGateCollectsIntro:
    "Prescope asks questions about your health, lifestyle, family history, and habits to help you understand your personal risk profile. Here is what we collect and how we handle it:",
  consentGateAnswersTitle: "Your answers",
  consentGateAnswersBody:
    "We store your questionnaire responses securely so we can generate personalised screening recommendations. Your answers are encrypted and only you and your assigned practitioner can see them.",
  consentGateResultsTitle: "Test results",
  consentGateResultsBody:
    "If you order screening tests, your results are stored securely and reviewed by a licensed practitioner before you receive your plan.",
  consentGateGeneticTitle: "Genetic data (only if you consent separately)",
  consentGateGeneticBody:
    "If you choose to undergo BRCA1/2 or SNP genetic testing, we will ask for your separate consent at that stage. Genetic data receives the highest level of protection and is never shared with insurers or employers.",
  consentGatePaymentTitle: "Payment information",
  consentGatePaymentBody:
    "Payments are processed by Stripe. We never see or store your card number.",
  consentGateNeverTitle: "What we never do",
  consentGateNeverBody:
    "We never sell your data. We never use your health information for advertising. We never share your data with third parties for their marketing purposes.",
  consentGateControlTitle: "Your control",
  consentGateControlBody:
    "You can view, correct, export, or delete your data at any time from the app settings. You can withdraw consent for genetic data processing at any time.",
  consentGateReadPrivacy: "Read the complete Privacy Policy",
  consentGateReadTerms: "Read the complete Terms of Use",
  consentGateCheckPolicy:
    "I have read and agree to Prescope's Privacy Policy and Terms of Use",
  consentGateCheckHealth:
    "I understand that Prescope collects sensitive health data including medical history, lifestyle information, and (if I separately consent) genetic data, as described above",
  consentGateContinue: "Continue",
  consentGateDecline: "Decline",
  consentGateNeedBoth: "Tick both boxes to continue.",
  consentGateDeclineTitle: "We understand.",
  consentGateDeclineBody:
    "Prescope requires your agreement to collect and process health data in order to function. Without it, the app cannot provide screening recommendations.\n\nYou can close the app now and return anytime to accept.",
  consentGateCloseApp: "Close app",
  consentGateGoBack: "Go back",
  consentGateLegalError:
    "We couldn't open the full document. Check your connection and try again.",

  homeSignedIn:
    "You’re in. After the safety check, you’ll see three short consent screens, then the questionnaire.",
  homeNextConsents:
    "Next step: three short consents (inherited risk gene check, early cell check, personal genetics panel). Agree on each to continue. This does not order a test.",
  homeNextQuestionnaire:
    "Next step: the 10-part questionnaire. All sections are ready. Your answers save as you go.",
  homeNextResults:
    "Questionnaire done. Next: look at the suggested tests to discuss with a practitioner. This is not a diagnosis.",
  homeNextLabResults:
    "Suggested tests are ready. Next: open your results in plain language when they are saved. This is not a diagnosis.",
  homeNextPlan:
    "Your results are in. Next: open the draft plan. A practitioner reviews this before anything is confirmed. This is not a diagnosis and not an instruction.",
  homeNextStore:
    "Your plan is ready. Next: browse the store and add recommended items to your cart. Safety checks run before you can pay.",
  homeNextFollowUp:
    "You have placed an order. Next: open follow-up for re-tests and the symptom re-check. This is not a diagnosis.",
  homeContinueConsents: "Continue consents",
  homeOpenQuestionnaire: "Open questionnaire",
  homeOpenResults: "View suggested tests",
  homeOpenLabResults: "View my results",
  homeOpenPlan: "See my plan.",
  homeOpenFollowUp: "Open follow-up",
  homeClinicalTermPreview: "Preview wording (admin)",
  homeEnterResults: "Enter a lab result (admin)",
  homeJourneyTitle: "Your journey",
  homeStepSafety: "Safety check",
  homeStepConsents: "Consents (3)",
  homeStepQuestionnaire: "Questionnaire",
  homeStepTests: "Tests",
  homeStepLabResults: "Results",
  homeStepPlan: "Plan",
  homeStepOrderTrack: "Order & track",
  homeStepFollowUp: "Follow-up",
  homeStepDone: "Done",
  homeStepNext: "You are here",
  homeStepWaiting: "Waiting",
  homePrimaryHint: "One next step:",
  homeAlsoAvailable: "Also available",
  signOut: "Sign out",

  clinicalTermPreviewTitle: "Wording preview",
  clinicalTermPreviewBody:
    "This is how every test name will look later: everyday words on top, one short explanation, then the exact medical name. This is a sample only — not a result, not a diagnosis, and not a recommendation.",
  clinicalTermPreviewBack: "Back to Home",

  setupTables:
    "Your login worked, but the database tables are not set up yet. In Supabase, open SQL Editor, paste the contents of supabase/schema.sql, and click Run.",
  missingProfile:
    "Your login worked, but your profile row is missing. PRESCOPE tried to create it. If this keeps happening, paste supabase/schema.sql into the SQL Editor and Run it (that also recreates the signup trigger).",

  triageTitle: "Before we begin",
  triageBody:
    "We need to ask one important question to make sure this service is right for you right now.",
  triageAwareness:
    "PRESCOPE is a lifestyle awareness tool. It does not diagnose, detect, or treat any condition. If you are unsure, choose Yes.",
  triageNeedAll: "Answer Yes or No to all three questions to continue.",
  triageContinue: "Save answers",
  triageSaveFailed:
    "We couldn’t save your answers. Please try again. Don’t continue until this works — it’s a safety step.",
  triageYes: "Yes",
  triageNo: "No",

  pathwayBTitle: "Let's get you the right care",
  pathwayBBody:
    "Based on your answers, seeing a doctor soon is the right next step. This app will be here when you're ready to return.\n\nContact a doctor, nurse, or local urgent care. If this feels like an emergency, use your local emergency number.",
  pathwayBLockedNote:
    "The questionnaire is paused on purpose. You can’t go back to change these answers. This screen stays after you close and reopen PRESCOPE.",
  pathwayBFindDoctor: "Find a doctor",
  pathwayBSavePlace: "Save my place",
  pathwayBSaved:
    "Your answers are already saved. You can close PRESCOPE and come back to this screen.",
  pathwayBFindDoctorHint:
    "Use your usual clinic, GP, or local urgent care. PRESCOPE cannot book an appointment.",

  questionnaireStubTitle: "Questionnaire",
  questionnaireStubBody:
    "Finish the three consent screens first. Then you’ll land here.",

  consentTitle: "A short consent before you continue",
  consentIntro:
    "PRESCOPE is a lifestyle awareness tool. It does not diagnose, detect, or treat any condition. Agreeing here only means you are comfortable continuing. It does not book or run a test.",
  consentAgree: "I agree — continue",
  consentDecline: "I don’t agree",
  consentDeclined:
    "That’s okay. Without this agreement, PRESCOPE cannot open the questionnaire.",
  consentDeclinedHint:
    "You can stay here, go to Home, or sign out from More. You can agree later if you change your mind.",
  consentGoHome: "Go to Home",
  consentSaveFailed:
    "We couldn’t save this consent. Please try again. Don’t continue until it saves.",
  consentBrcaBody:
    "This consent is about a possible inherited-risk gene check that a practitioner might discuss later. You are not being tested in this app.",
  consentCtcBody:
    "This consent is about a possible blood-based cell check that a practitioner might discuss later. You are not being tested in this app.",
  consentSnpBody:
    "This consent is about a possible saliva/swab genetics panel that a practitioner might discuss later. You are not being tested in this app.",

  hubTitle: "Questionnaire",
  hubBody:
    "Ten short sections. Your progress is saved to your account. Tap a section to fill it in or edit it.",
  hubComingNext:
    "This section isn’t available yet.",
  hubStatusDone: "Done",
  hubStatusNotStarted: "Not started",
  hubLoadFailed:
    "We couldn’t load your questionnaire progress. Pull away and come back, or try again in a moment.",
  hubProgressLabel: "Sections completed",
  hubBack: "Back to list",
  sectionSave: "Save & continue",
  sectionSaveAnswers: "Save answers",
  sectionCompleteSubtitle: "You're {current} of {total} done. Keep going.",
  whyWeAsk: "Why do we ask this?",
  whyWeAskHint: "Opens a short explanation",
  whyWeAskClose: "Close",
  whyAskFamily:
    "Family patterns help us suggest which tests to discuss with a practitioner. This is lifestyle awareness, not a diagnosis.",
  whyAskReproductive:
    "Period, pregnancy, and contraceptive history can change which lifestyle checks are worth discussing. You can skip details that do not apply.",
  whyAskPersonal:
    "Smoking, alcohol, and similar habits are used only to suggest lifestyle checks. They are not used to judge you, and they do not diagnose anything.",
  whyAskThyroid:
    "Active autoimmune thyroid disease is a safety question. It can change whether iodine-related suggestions are appropriate.",
  whyAskEthnicity:
    "Background can change how some measurements are discussed later. Choose what feels right, or prefer not to say.",
  sectionSaveFailed:
    "We couldn’t save this section. Please try again. Your other answers are still on this screen.",
  sectionLoadFailed:
    "We couldn’t load your previous answers. You can still fill the form in.",
  sectionNeedFix: "Please check the highlighted fields.",
  reproductiveNeedSection1:
    "Please finish section 1 first (the questions about you). We need to know the sex you chose so we only ask period and pregnancy questions when they apply.",
  reproductiveGoSection1: "Go to section 1",
  reproductiveMaleSkip:
    "These period, pregnancy, and menopause questions don’t apply based on the sex you chose. You can still continue. Next is a short safety question about nipple discharge, skin changes, or a new lump.",
  menoStatusLabel: "Menopausal status (Pre / Peri / Post)",
  menoPreExplain: "Periods still happening in a usual pattern",
  menoPeriExplain:
    "Change years — periods becoming irregular, heading toward stopping",
  menoPostExplain:
    "Periods have stopped for a long time (about a year or more)",
  contraceptiveUseLabel: "Do you use contraception?",
  menstrualRegularityLabel: "Are your periods regular?",
  placeOfWorkLabel: "What does your usual workplace look like?",
  placeOfWorkHint:
    "For example: office, home, factory, outdoors, hospital, shop.",
  commuteToCityLabel:
    "Do you travel into a busy town or city for work or study?",
  commuteMethodLabel: "How do you usually travel?",
  commuteMethodHint: "For example: bus, car, train, walk, cycle.",
  commuteDurationLabel: "About how long does that trip take?",
  commuteDurationHint:
    "One way is fine. Open the clock (like setting an alarm) and pick hours and minutes.",
  pollutantExposureLabel:
    "Do you often breathe fumes, dust, or dirty air at work or where you live?",
  vehicleExhaustLabel: "Are you often around car or lorry exhaust?",
  occupationLabel: "What is your job or usual work?",
  nightShiftLabel: "Do you work nights (or have you in the past)?",
  iodineSourcesLabel:
    "Where do you usually get iodine in your food? (choose all that apply)",
  interruptTitle: "A quick safety pause",
  interruptQuestion:
    "Have you recently noticed any nipple discharge, breast skin changes, or a new lump?",
  interruptBody:
    "This is not a diagnosis. If you answer Yes, PRESCOPE will pause so you can speak to a clinician in person.",
  interruptYes: "Yes — pause and get in-person advice",
  interruptNo: "No — continue",
  interruptNeedAnswer: "Please choose Yes or No to continue.",
  interruptLockFailed:
    "We couldn’t lock this safety step. Please try again. Don’t continue until it saves.",
  bmiLabel: "BMI (calculated)",
  bmiHint: "This number is calculated from height and weight. It is not a diagnosis.",
  ageLabel: "Age (calculated)",
  whrLabel: "Waist-to-hip ratio (calculated)",
  obesityBmiHint:
    "Your measurements suggest a BMI of 30 or above. You can still choose Yes or No — this is only a reminder, not a diagnosis.",
  addRelative: "Add another relative",
  removeRelative: "Remove",
  familyRelativeLabel: "Relative",
  familyAgeLabel: "Age at diagnosis",
  pickDate: "Pick a date",
  pickTime: "Pick a time",
  pickerDone: "Done",
  dateInvalid: "That date doesn’t exist. Pick another day.",
  datePickerLegacy:
    "Your old answer was “{value}”. Pick a date on the calendar to update it.",
  timePickerLegacy:
    "Your old answer was “{value}”. Pick hours and minutes on the clock to update it.",
  radiationDatesHint: "An approximate day is enough — use the calendar.",
  pickOption: "Choose one",
  tooltipHowToMeasure: "How to measure",
  tooltipWhatsAUnit: "What’s a unit?",
  packYearsLabel: "Pack-years (calculated)",
  packYearsHint:
    "This is cigarettes per day × years smoked, divided by 20. It is a lifestyle number, not a diagnosis.",
  stressExactView:
    "Do you tend to view stress as harmful, or as something you can learn and grow from?",
  stressExactReachOut:
    "When under stress, do you reach out to other people, pets, or your community for support and connection?",
  stressFramingNote:
    "These answers help frame a stress-coping plan. They are not about blame or causation.",
  sectionSubmitResults: "Save and see recommendations",
  addMammogram: "Add another mammogram",
  removeMammogram: "Remove",
  resultsTitle: "Suggested tests to discuss",
  resultsBody:
    "These are lifestyle-awareness suggestions from a fixed checklist — not a diagnosis, and not a test order. Take this list to a qualified practitioner.",
  resultsEmptyHeading: "Your suggestions will appear here",
  resultsEmpty:
    "Finish the last questionnaire section to generate this list. Take it to a qualified practitioner — it is not a diagnosis or a booked test.",
  labResultsEmptyHeading: "Your results will appear here",
  labResultsEmpty:
    "Your results will appear here once your tests are back. A clinician adds them in everyday words. This is information, not a diagnosis.",
  resultsLoadFailed:
    "We couldn’t load your suggestions. Please try again in a moment.",
  resultsSaveFailed:
    "Your last section saved, but we couldn’t save the suggestion list. Please try again.",
  resultsReasonLabel: "Why this is on the list",
  resultsStatusSuggested:
    "Suggested to discuss — not a diagnosis, not a booked test, and not a result.",
  resultsStatusOther:
    "Saved as a suggestion only. This is not a diagnosis and it does not detect or treat anything.",
  resultsRetry: "Try loading again",
  resultsOpenQuestionnaire: "Open questionnaire",
  resultsOpenLabResults: "View my results",
  resultsActionDiscuss:
    "One next step: take this list to a qualified practitioner. PRESCOPE does not book, run, or interpret tests.",
  resultsGroupWatching: "Worth watching",
  resultsGroupRange: "Within range",
  resultsChipDiscuss: "Worth discussing",
  resultsBackHome: "Back to Home",
  labResultsTitle: "Your results",
  labResultsSummary:
    "Your results are in. Here's what they mean in plain language.",
  labResultsLoadFailed:
    "We couldn’t load your results. Please try again in a moment.",
  labResultsRetry: "Try loading again",
  labResultsSeePlan: "See my plan.",
  labResultsOpenDetail: "Read more",
  labChipWithinRange: "Within range",
  labChipWorthWatching: "Worth watching",
  labChipNeedsAttention: "Needs attention",
  labChipNegative: "Reported as negative",
  labChipUnspecified: "Saved — no flag yet",
  labResultDetailTitle: "This result",
  labResultDetailLoadFailed:
    "We couldn’t load this result. Please go back and try again.",
  labResultDetailMissing:
    "We couldn’t find this result on your account. It may belong to someone else, or it may have been removed.",
  labResultValueLabel: "Value",
  labResultUnitLabel: "Unit",
  labResultRangeLabel: "Reference range",
  labResultNoValue: "No value was saved for this row.",
  labResultNoRange: "No reference range was saved.",
  labResultPdf: "Open the lab PDF",
  labResultPdfFailed:
    "We couldn’t open that file. Ask your clinician for another copy.",
  labResultNotDiagnosis:
    "This is information, not a diagnosis. PRESCOPE does not detect or treat any condition.",
  labResultBack: "Back to my results",
  labMeaningNormal:
    "What this means for you: this reading sits in the usual range the lab listed. A practitioner can still talk it through with you. This is information, not a diagnosis.",
  labMeaningWatching:
    "What this means for you: this reading sits a bit outside the usual range. That is worth discussing with a practitioner. This is information, not a diagnosis.",
  labMeaningCritical:
    "What this means for you: this flag means a clinician should look at this promptly. Please contact a qualified practitioner. This is information, not a diagnosis.",
  labMeaningPositive:
    "What this means for you: the report marked this as positive. Take it to a qualified practitioner. This is information, not a diagnosis.",
  labMeaningNegative:
    "What this means for you: the report marked this as negative (not found on that test). A practitioner can still explain the context. This is information, not a diagnosis.",
  labMeaningUnspecified:
    "What this means for you: the value is saved so you and a practitioner can read it together. This is information, not a diagnosis.",
  planTitle: "Your draft plan",
  planTitleApproved: "Your plan — practitioner approved",
  planTitleFinalised: "Your plan",
  planBanner:
    "Your practitioner is reviewing this plan. That is a good next step — they are looking after you.",
  planEmptyHeading: "Your plan is on its way",
  planEmpty:
    "Your practitioner is reviewing your results. We'll notify you when your plan is ready.",
  planBannerApproved:
    "Some items are approved. Your practitioner will finalise the full plan soon. Approved supplements can be ordered from the store.",
  planBannerFinalised:
    "Your practitioner has finalised this plan. Discuss it with them — you can order approved supplements from the store.",
  planBody:
    "These are draft ideas from a fixed checklist, written so you can discuss them. They are not instructions, not a diagnosis, and they do not detect or treat anything.",
  planLoadFailed:
    "We couldn’t load your draft plan. Please try again in a moment.",
  planGenerateFailed:
    "We couldn’t refresh the draft plan. Please try again. Nothing new was saved if you see this message.",
  planNeedSql:
    "The app could not save your draft plan. In Supabase → SQL Editor, paste supabase/phase2-schema.sql and click Run. Then tap Refresh draft plan again.",
  planRetry: "Try loading again",
  planRefresh: "Refresh draft plan",
  planWhyLabel: "Why you’re seeing this",
  planClinicalBasis: "Clinical basis (exact protocol wording)",
  planClinicalBasisHide: "Hide clinical basis",
  planNeedsCheck: "Needs practitioner check",
  planOpenDetail: "Read the full draft idea",
  planGroupFood: "Food & drink",
  planGroupSupplements: "Supplements",
  planGroupHabits: "Daily habits",
  planGroupFollowUp: "Follow-up tests",
  planGroupReferrals: "See a specialist",
  planStatusDraft: "Draft — pending practitioner review",
  planStatusPending: "Pending practitioner review",
  planStatusReviewed:
    "A practitioner has looked at this. It is still information to discuss — not an instruction.",
  planBackResults: "Back to my results",
  planOpenFollowUp: "Open follow-up",
  planDetailTitle: "This draft idea",
  planDetailWhat: "What this draft is about",
  planDetailFinding: "Exact finding that led to this draft",
  planDetailReview: "Review status",
  planDetailNotInstruction:
    "This is a draft idea for discussion. It is not an instruction, not a diagnosis, and it does not detect or treat anything.",
  planDetailMissing:
    "We couldn’t find this draft idea on your account. It may have been refreshed. Go back to the plan list.",
  planDetailLoadFailed:
    "We couldn’t load this draft idea. Please go back and try again.",
  planDetailBack: "Back to my plan",
  followUpTitle: "Follow-up",
  followUpBody:
    "A simple list of check-ins: a symptom re-check, suggested re-tests, and a draft-plan review. This is a reminder list, not a diagnosis, and it does not detect or treat anything.",
  followUpEmptyHeading: "You're all caught up",
  followUpEmpty:
    "You're all caught up. Check back after your next test.",
  followUpLoading: "Loading your follow-up list…",
  followUpSeedNow: "Set up my first check-in",
  followUpLoadFailed:
    "We couldn’t load your follow-up list. Please try again in a moment.",
  followUpSaveFailed:
    "We couldn’t update that follow-up. Please try again. The rest of the list is still here.",
  followUpNeedSql:
    "The app could not save a follow-up row. In Supabase → SQL Editor, paste supabase/phase2-schema.sql and click Run. Then open Follow-up again.",
  followUpRetry: "Try loading again",
  followUpDoSymptom: "Do the symptom check",
  followUpMarkDone: "Mark done",
  followUpTypeSymptom: "Symptom re-check",
  followUpTypeRetest: "Re-test",
  followUpTypeReview: "Review",
  followUpTypeCoaching: "Check-in",
  followUpDueToday: "Due today",
  followUpDueOn: "Due",
  followUpSymptomNote:
    "Same safety question as before. Yes still pauses PRESCOPE so you can speak to a clinician. This is not a diagnosis.",
  followUpReviewNote:
    "A reminder to look at your draft plan with a practitioner. The plan is not an instruction.",
  followUpRetestNote:
    "A reminder that a suggested test may be worth discussing again later. This does not book a test.",
  followUpRemindersAsk:
    "PRESCOPE can remind you on this phone. No messages are sent from a server. You can say no — the list still works.",
  followUpRemindersAllow: "Allow reminders on this phone",
  followUpRemindersOn:
    "Phone reminders are on for upcoming items. This is a local reminder only, not a diagnosis.",
  followUpRemindersDenied:
    "Reminders are off. Your list still works — nothing is lost.",
  followUpRemindersUnavailable:
    "Phone reminders are not available on this device. Your list still works.",
  followUpReminderTitle: "PRESCOPE follow-up",
  followUpReminderBody:
    "This is a reminder only — not a diagnosis, and not medical advice.",
  followUpSymptomReminderTitle: "PRESCOPE safety check-in",
  followUpSymptomReminderBody:
    "A reminder to do the symptom check-in. This is not a diagnosis.",
  followUpPushExpoGo:
    "Push messages need a development build. Expo Go can still use on-phone reminders.",
  followUpPushRegistered: "This phone can receive PRESCOPE reminders.",
  followUpPushDenied:
    "Notification permission is off. On-phone reminders and your list still work.",
  followUpPushUnavailable:
    "Remote push is not available on this device. Your follow-up list still works.",
  followUpBackHome: "Back to Home",
  enterResultsViewDashboard: "View my results",
  enterResultsSavedOtherUser:
    "Saved for another account. That person will see it after they sign in. You will only see rows saved against your own user id.",
  enterResultsTitle: "Enter a lab result",
  enterResultsBody:
    "This screen is for a clinician or admin. It saves a result as information for the person to read later. It is not a diagnosis, and it does not detect or treat anything.",
  enterResultsDenied:
    "You can’t enter results from this account. Only a listed clinician or admin can add lab numbers. If you expected access, ask the founder to add your email to the admin list.",
  enterResultsGoHome: "Go to Home",
  enterResultsSave: "Save this result",
  enterResultsSaved:
    "Saved. If you used your own user id, tap View my results. You can also check Supabase → Table Editor → test_results. This is information, not a diagnosis.",
  enterResultsSaveFailed:
    "We couldn’t save this result. Please try again. Nothing was written if you see this message.",
  enterResultsNotDeployed:
    "The save-reviewed-result function is not on your Supabase project yet. Ask your developer to deploy it (see supabase/functions/save-reviewed-result/README.md).",
  enterResultsNeedFunctionAndRpc:
    "We couldn’t save this result. The Edge Function is not deployed AND the SQL save helper is missing. In Supabase → SQL Editor, paste supabase/phase2-schema.sql and click Run. Then try Save again. (Deploying the Edge Function is optional once that SQL has been run.)",
  enterResultsNeedFix: "Please check the highlighted fields.",
  enterResultsTestLabel: "Which test is this result for?",
  enterResultsValueLabel: "Result value",
  enterResultsValueHint: "The number or short text from the lab report (for example 6.2).",
  enterResultsUnitLabel: "Unit (optional)",
  enterResultsUnitHint: "For example mU/L or nmol/L. Leave blank if the report has no unit.",
  enterResultsRangeLabel: "Reference range (optional)",
  enterResultsRangeHint: "The lab’s usual range, for example 2–8. This is not a diagnosis.",
  enterResultsFlagLabel: "Flag (optional)",
  enterResultsUserIdLabel: "Whose results are these? (user id)",
  enterResultsUserIdHint:
    "For founder testing, leave your own id so you can see the row. Later a clinician would paste a patient’s user id from the profiles table.",
  enterResultsOrderIdLabel: "Linked suggestion id (optional)",
  enterResultsOrderIdHint:
    "Paste a test_orders row id if this result belongs to a suggested test. Leave blank if you are not sure.",
  enterResultsCsvTitle: "Or paste several rows (CSV)",
  enterResultsCsvHint:
    "First line must be headings. Columns: test_name,plain_name,result_value,result_unit,reference_range,flag. test_name must be a dictionary key such as fastingInsulin. Optional columns: user_id,test_order_id.",
  enterResultsCsvLabel: "CSV text",
  enterResultsCsvImport: "Save pasted CSV rows",
  enterResultsCsvEmpty: "Paste some CSV first, including the heading row.",
  enterResultsCsvPartial:
    "Some rows saved and some did not. Scroll up for the message. Check Table Editor → test_results.",
  enterResultsForbidden:
    "This account is not allowed to enter results. Sign in with the admin email if you are the founder.",
  pathwayBNoSubmit:
    "The questionnaire is paused, so suggestions cannot be generated from here.",


  moreTitle: "More",
  moreBody:
    "Your profile, privacy tools, and account options. The questionnaire stays closed until you agree to all three consents.",
  drawerSubtitle: "Jump to a section of your journey",
  drawerClose: "Close menu",
  drawerCurrent: "Here",
  drawerReorder: "Reorder menu",
  drawerReorderDone: "Done reordering",
  profileTitle: "My profile",
  profileBody:
    "Only your name and email are required. Everything else is optional and helps clinicians understand your context — PRESCOPE does not diagnose or treat.",
  profileNameLabel: "Name",
  profileEmailLabel: "Email",
  profileEmailReadonly: "Email comes from your login and cannot be changed here.",
  profilePhoneLabel: "Phone (optional)",
  profileDobLabel: "Date of birth",
  profileAgeLabel: "Age",
  profileGenderLabel: "Gender",
  profileBloodLabel: "Blood type (optional)",
  profileHeightLabel: "Height (cm)",
  profileWeightLabel: "Weight (kg)",
  profileBmiLabel: "BMI (calculated)",
  profileEmergencyHeading: "Emergency contact (optional)",
  profileEmergencyName: "Contact name",
  profileEmergencyPhone: "Contact phone",
  profileEmergencyRelationship: "Relationship",
  profileConditionsLabel: "Health conditions (optional)",
  profileAllergiesLabel: "Allergies (optional)",
  profilePhotoAdd: "Add photo",
  profilePhotoChange: "Change photo",
  profilePhotoRemove: "Remove photo",
  profilePhotoDenied: "Photo access was not granted. You can still save your profile without a photo.",
  profilePhotoFailed: "We couldn’t open the photo picker. Try again, or skip the photo.",
  profileSave: "Save changes",
  profileSavedToast: "Profile saved",
  profileNameRequired: "Please enter your name before saving.",
  profileNeedsMigration:
    "Some newer profile fields need a one-time database update. In Supabase → SQL Editor, paste supabase/migrations/20260913_profile_settings_fields.sql and Run. Name and basic details still save.",
  profileNameEmpty:
    "No name saved yet. Add your name below and tap Save.",
  profileEmailEmpty: "No email on this session. Try signing in again.",
  profileAdminBadge: "Admin",
  profileLoadFailed:
    "We couldn’t load your profile. You can still sign out from here.",
  profileSaveFailed: "We couldn’t save your profile. Please try again.",
  profileSignOutFailed: "We couldn’t sign you out. Please try again.",
  settingsTitle: "Settings",
  settingsBody: "Notifications, privacy, help, and about PRESCOPE.",
  settingsOpenProfile: "My profile",
  settingsOpenNotifications: "Notifications",
  settingsOpenPrivacy: "Data & privacy",
  settingsOpenHelp: "Help & support",
  settingsOpenAbout: "About",
  settingsOpenMenu: "Open main menu",
  settingsNotifyTitle: "Notifications",
  settingsNotifyBody:
    "Choose what PRESCOPE may remind you about. Remote push needs a development or store build; on-phone reminders still work when permission is on.",
  settingsNotifyReminders: "Follow-up reminders",
  settingsNotifyResults: "When reviewed results are ready",
  settingsNotifyPlan: "When a plan is reviewed",
  settingsNotifyMarketing: "Product tips (optional)",
  settingsNotifyTime: "Preferred reminder time",
  settingsNotifyTimeHint: "Used for on-device follow-up reminders when possible.",
  settingsNotifyTimeInvalid: "Pick a valid time (HH:MM).",
  settingsNotifySave: "Save notification preferences",
  settingsNotifySaved: "Notification preferences saved",
  settingsNotifySaveFailed:
    "We couldn’t save notification preferences. Please try again.",
  settingsNotifySystem: "Open system notification settings",
  settingsNotifySystemFailed:
    "We couldn’t open system settings. Change notification permission in your phone Settings app.",
  privacyTitle: "Data & privacy",
  privacyBody:
    "Your data travels over HTTPS. Each person only sees their own rows (Row Level Security). We do not claim device-level encryption beyond what your phone and Supabase already provide.",
  privacyExport: "Export my data (JSON)",
  privacyExportShareTitle: "Share PRESCOPE export",
  privacyExportDone: "Export ready — use the share sheet or Downloads.",
  privacyExportFailed: "We couldn’t export your data. Please try again.",
  privacyConsents: "View my consents",
  privacyRetention:
    "We keep account data while your account is active. After a deletion request is completed, Auth and related rows are removed by an admin.",
  privacyPolicyLink: "Open privacy policy",
  privacyTermsLink: "Open terms of use",
  privacyDelete: "Request account deletion",
  privacyDeleteNeedsSql:
    "Account deletion requests need a one-time SQL setup. Paste supabase/migrations/20260913_profile_settings_fields.sql in the Supabase SQL Editor and Run, then try again.",
  privacyDeleteFailed: "We couldn’t submit your deletion request. Please try again.",
  privacyDeleteTitle: "Request account deletion",
  privacyDeleteBody:
    "This sends a deletion request to your PRESCOPE project. An admin must finish removing the Auth user in the Supabase dashboard — the app cannot do that alone (no service-role key on the device). Export your data first if you want a copy.",
  privacyDeleteReason: "Optional reason",
  privacyDeleteConfirm: "Submit deletion request",
  privacyDeleteSubmitted:
    "Request submitted. An admin will complete removal in Supabase → Authentication → Users. You can sign out now.",
  privacyDeleteWarning: "This cannot be undone once an admin completes it.",
  helpTitle: "Help & support",
  helpBody: "Short answers and how to reach us. PRESCOPE is not an emergency service.",
  helpContact: "Contact support",
  helpContactBody: "Email support@prescope.app with your account email. We aim to reply within a few business days.",
  helpTutorials: "Quick tips",
  helpTutorialsBody:
    "1) Finish consents before the questionnaire.\n2) Save each section as you go.\n3) Suggested tests appear on Results after the last section.\n4) New symptoms mid-journey open Pathway B — follow local urgent care.",
  helpFeedback: "Send feedback",
  helpFeedbackBody: "Tell us what felt confusing or helpful. Email feedback@prescope.app.",
  aboutTitle: "About PRESCOPE",
  aboutBody:
    "PRESCOPE is a lifestyle awareness tool. It does not diagnose, detect, or treat any condition.",
  aboutVersion: "Version",
  aboutWhatsNew: "What’s new",
  aboutWhatsNewBody:
    "Profile & settings hub, side menu, data export, and clearer privacy wording. Blue glass design system.",
  aboutCompany: "Prescope",
  aboutOss: "Open-source notices",
  aboutOssBody:
    "Built with Expo, React Native, NativeWind, Supabase JS, and other open-source libraries. Full license texts ship with each package in node_modules.",
  appointmentsTitle: "Appointments",
  appointmentsEmptyHeading: "No appointments yet",
  appointmentsEmptyBody:
    "Clinic booking is not connected in this build. Use your usual clinic or GP to book. When booking is added, appointments will show up here.",
  prescriptionsTitle: "Prescriptions",
  prescriptionsEmptyHeading: "No prescriptions here",
  prescriptionsEmptyBody:
    "PRESCOPE does not prescribe medicines. This screen is ready for future clinician-shared lists. Ask your clinician about any medicines you take.",
  notifInboxTitle: "Notifications",
  notifInboxEmptyHeading: "You’re all caught up",
  notifInboxEmptyBody:
    "Reminders and status updates will appear here when available. You can change preferences under Settings → Notifications.",
  consentsSettingsTitle: "Your consents",
  consentsSettingsBody:
    "These are the consent ticks stored for your account. You can re-read the wording from onboarding and the sequential consent screens.",
  consentsSettingsEmpty: "No consent rows yet. Finish onboarding to record them.",
  consentsSettingsLoadFailed: "We couldn’t load consents. Please try again.",
  hubOpenResults: "View suggested tests",

  storeTitle: "Store",
  storeBody:
    "Browse supplements and tests linked to your draft plan. This is a lifestyle awareness tool — nothing here diagnoses, detects, or treats a condition.",
  storeRecommended: "Based on your results",
  storeRecommendedEmpty:
    "Nothing matched your draft plan yet. Finish your plan or refresh it, then come back. You can still browse the full catalog below.",
  storeFullCatalog: "Full catalog",
  storeEmpty:
    "The product catalog is empty. In Supabase → SQL Editor, paste supabase/phase3-schema.sql and click Run to create and seed the products table.",
  storeNeedSql:
    "The store tables are missing. In Supabase → SQL Editor, paste supabase/phase3-schema.sql and click Run, then open the store again.",
  storeLoadFailed:
    "We couldn’t load the store. Please try again in a moment.",
  storeContextFailed:
    "We couldn’t load your safety checks for the store. Please try again.",
  storeRetry: "Try loading again",
  storeAdd: "Add",
  storeAdded: "Added to your cart.",
  storeAddFailed:
    "We couldn’t add that item. Please try again. Your cart is unchanged if you see this message.",
  storeNeedsCheck:
    "Needs practitioner check before ordering",
  storeBlockedGeneric:
    "This item can’t be added to your cart right now.",
  storeOpenProduct: "View details",
  storeViewCart: "View cart",
  storeViewCartWithCount: "View cart ({count})",
  storeBrowseStore: "Browse store",
  storeBackHome: "Back to Home",
  storeBackStore: "Back to store",
  storeBackCart: "Back to cart",
  storeGoConsent: "Complete consent first",
  storeProductMissing:
    "We couldn’t find that product. It may have been removed from the catalog.",
  homeOpenStore: "Browse store",
  homeOpenOrders: "Order & track",
  planBrowseStore: "Browse store",
  productClinicalBasis: "Clinical basis (from the protocol)",
  productNoBasis: "No linked finding saved for this item.",
  productAddToCart: "Add to cart",
  cartTitle: "Your cart",
  cartBody:
    "Review items before checkout. Prices shown here are for reference — tap Checkout to confirm the server-side total.",
  cartEmpty:
    "Your cart is empty. Open the store and tap Add on an item you want to discuss ordering.",
  cartLoadFailed:
    "We couldn’t load your cart. Please try again in a moment.",
  cartUpdateFailed:
    "We couldn’t update your cart. Please try again.",
  cartTotal: "Running total (display only)",
  cartTotalNote:
    "This total is for display only. Payment uses server-side prices on checkout.",
  cartCheckout: "Checkout",
  cartRemove: "Remove from cart",
  cartQuantity: "Qty",
  cartIncrease: "Increase quantity",
  cartDecrease: "Decrease quantity",
  cartRemovedBlocked:
    "Some items were removed because your safety status changed (for example consent or thyroid answers).",
  checkoutTitle: "Checkout",
  checkoutBody:
    "Review your cart, then pay securely. Prices are confirmed on the server — the phone never sets the charge amount. This is not a diagnosis and not a test order.",
  checkoutPay: "Pay securely",
  checkoutProcessing: "Processing payment…",
  checkoutSavingOrder: "Saving your order…",
  checkoutEmptyCart:
    "Your cart is empty. Add items from the store before paying.",
  checkoutIntentFailed:
    "We couldn’t start payment. Please try again in a moment.",
  checkoutFunctionMissing:
    "The create-payment-intent function is not on your Supabase project yet. Ask your developer to deploy it (see supabase/functions/create-payment-intent/README.md) and set STRIPE_SECRET_KEY. Your cart is saved.",
  checkoutStripeKeyMissing:
    "Add your Stripe publishable key to .env when ready (EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY=pk_test_…). Checkout still works for browsing — payment is disabled until then.",
  checkoutStripeSecretMissing:
    "Stripe is not set up on the server yet. Add STRIPE_SECRET_KEY in Supabase → Edge Functions → Secrets, then deploy create-payment-intent. Your cart is saved.",
  checkoutPaymentCancelled:
    "Payment was cancelled. Your cart is unchanged — tap Pay to try again.",
  checkoutPaymentFailed:
    "Payment didn’t go through. Your cart is saved — please try again.",
  checkoutSheetInitFailed:
    "We couldn’t open the payment screen. Please try again in a moment.",
  checkoutOrderSaveFailed:
    "Payment went through but we couldn’t save your order. Please contact support with your payment confirmation. Your cart may still have these items.",
  checkoutOrderNeedRpc:
    "Payment went through but the order could not be saved. In Supabase → SQL Editor, re-run supabase/phase3-schema.sql (it adds create_order_from_cart), then contact support if the charge appears on your card.",
  checkoutWebUnsupported:
    "Stripe Payment Sheet works on a phone (Expo Go or a dev build). Use the iOS or Android app to pay — your cart stays saved here.",
  checkoutSuccessTitle: "Order placed",
  checkoutSuccessBody:
    "Thank you. Your payment was received and your order is being prepared. Stripe’s server webhook will double-check payment when you deploy it — until then this screen is optimistic.",
  checkoutViewOrder: "View order",
  checkoutRetryPay: "Try payment again",
  checkoutTestTotal: "Test payment total",
  checkoutTesting: "Checking server total…",
  checkoutServerTotalSuccess:
    "Server total: {amount} — ready for Stripe Payment Sheet",
  checkoutDay5Note:
    "If payment fails, your cart stays saved. You can leave and come back anytime. Test orders start manual lab fulfilment after payment.",
  labOrdersNeedSql:
    "Lab fulfilment is not set up yet. In Supabase → SQL Editor, run supabase/phase4-day5-lab-orders.sql, then open your order again.",
  labOrdersCreateFailed:
    "Your order was saved but we could not start lab fulfilment. Our team can still see your purchase — tap View order or contact support.",
  labOrdersLoadFailed:
    "We could not load lab fulfilment status. Please try again in a moment.",
  labOrdersCreatedNote:
    "Test fulfilment has been queued. Our team will prepare your sample kit.",
  labOrdersCreatePartial:
    "Your order is saved. Lab fulfilment will be linked when the server helper is deployed.",
  ordersTitle: "Your orders",
  ordersBody:
    "Track supplement and test orders from the store. Status updates when fulfilment moves forward.",
  ordersWebhookNote:
    "Payment shows as paid after checkout. When you deploy the Stripe webhook, the server reconciles with Stripe automatically.",
  ordersEmpty:
    "No orders yet. Add items from the store and complete checkout to see them here.",
  ordersLoadFailed:
    "We couldn’t load your orders. Please try again in a moment.",
  ordersPlacedBanner: "Your order was placed successfully.",
  ordersTapForDetail: "Tap an order for items and tracking",
  orderDetailTitle: "Order details",
  orderTimelineTitle: "Tracking",
  orderPaymentLabel: "Payment",
  orderFulfilmentLabel: "Fulfilment",
  orderMissing:
    "We couldn’t find that order on your account.",
  orderStatusPaidPreparing: "Paid — being prepared",
  orderStatusPending: "Payment pending",
  orderStatusFailed: "Payment failed",
  orderStatusRefunded: "Refunded",
  orderStatusCancelled: "Cancelled",
  orderStatusShipped: "Shipped",
  orderStatusSampleKitOnWay: "Sample kit on the way",
  orderStatusDelivered: "Delivered",
  orderStatusSampleCollected: "Sample collected",
  orderStatusOther: "Order saved",
  orderTimelinePlaced: "Order placed",
  orderTimelinePlacedDetail: "Placed on {date}",
  orderTimelinePlacedDetailNoDate: "Your order was saved",
  orderTimelinePaymentPending: "Payment pending",
  orderTimelinePaymentPendingDetail:
    "Waiting for payment confirmation from Stripe.",
  orderTimelinePaymentConfirmed: "Payment confirmed",
  orderTimelinePaymentConfirmedDetail:
    "Stripe confirmed your payment (or checkout marked it paid optimistically).",
  orderTimelinePaymentFailed: "Payment failed",
  orderTimelinePaymentFailedDetail:
    "This payment did not go through. Contact support if you were charged.",
  orderTimelinePreparing: "Being prepared",
  orderTimelinePreparingDetail:
    "Your items are being picked and packed (or your test kit is being prepared).",
  orderTimelineShipped: "Shipped",
  orderTimelineShippedDetail: "Your order is on the way.",
  orderTimelineSampleKit: "Sample kit on the way",
  orderTimelineSampleKitDetail:
    "Your test kit is on the way. Follow the instructions inside when it arrives.",
  orderTimelineDelivered: "Delivered",
  orderTimelineDeliveredDetail: "Your order was delivered.",
  orderTimelineSampleCollected: "Sample collected",
  orderTimelineSampleCollectedDetail:
    "Your sample was collected — results will follow your lab’s timeline.",
  orderTimelineCancelled: "Cancelled",
  orderTimelineCancelledDetail: "This order was cancelled.",
  orderItemsLabel: "Items in this order",
  orderBackOrders: "Back to orders",
  orderBackStore: "Back to store",
  orderBackHome: "Back to Home",

  // ——— Phase 5 Wave A: guided test booking ———
  // Warm, specific, one clear next step. Never implies the test diagnoses
  // anything — it is information the user and their clinician look at together.
  bookingStartTitle: "Book your tests",
  bookingStartBody:
    "You have tests worth doing. Let\u2019s get them in the diary \u2014 it takes about two minutes, and you can change the time later.",
  bookingWhereLabel: "Where are you?",
  bookingPostcodeLabel: "Your postcode",
  bookingPostcodeHint:
    "We use this only to find labs near you. It is not shared with anyone.",
  bookingPostcodeInvalid:
    "That does not look like a postcode yet. Check it and try again \u2014 or carry on and we will show you every lab we work with.",
  bookingModalityLabel: "How would you like to do it?",
  bookingModalityClinic: "Visit a lab",
  bookingModalityClinicDetail:
    "A nurse takes the sample. Usually quicker to get results, and better if you would rather someone else did it.",
  bookingModalityHomeKit: "Home test kit",
  bookingModalityHomeKitDetail:
    "Posted to you, done in your own time, posted back. No appointment, no travelling.",
  bookingModalityHomeKitUnavailable:
    "One of your tests needs a nurse to take the sample, so this set is lab-only.",
  bookingContinue: "Find labs near me",
  bookingTestsHeading: "What you are booking",

  bookingProvidersTitle: "Choose a lab",
  bookingProvidersBody:
    "Prices and next available times are live. Nothing is charged until you confirm.",
  bookingProvidersEmptyHeading: "No labs near that postcode yet",
  bookingProvidersEmptyBody:
    "We are still adding partners in your area. Try a nearby postcode, or order a home kit instead \u2014 it works anywhere we post to.",
  bookingProviderNoSlots: "No free times in the next three weeks",
  bookingProviderNextSlot: "Next free",
  bookingProviderHomeCollection: "Home collection available",
  bookingProviderChoose: "See times",
  bookingClinicsFailed:
    "We could not load the labs just now. Check your connection and try again.",

  bookingSlotsTitle: "Pick a time",
  bookingSlotsBody:
    "Times are in your own timezone. You can move or cancel this later without calling anyone.",
  bookingSlotsEmptyHeading: "Nothing free in the next three weeks",
  bookingSlotsEmptyBody:
    "This lab is fully booked for now. Try another lab, or a home kit.",
  bookingSlotsFailed:
    "We could not load the times just now. Check your connection and try again.",
  bookingSlotsRetry: "Try again",

  bookingPrepTitle: "Before your test",
  bookingPrepBody:
    "Getting these right means the sample works first time. We will remind you the day before too.",
  bookingPrepCriticalHeading: "Please read \u2014 these ones matter",
  bookingPrepAckLabel: "I have read how to prepare",
  bookingPrepAckRequired:
    "Have a read of the steps above and tick the box, then we can confirm.",
  bookingPrepConfirm: "Confirm booking",

  bookingKitTitle: "Where shall we send it?",
  bookingKitBody:
    "Your kit arrives in a plain box with everything you need, including a prepaid return envelope.",
  bookingKitAddressLabel: "Address",
  bookingKitAddressHint: "House or flat number, street, and town.",
  bookingKitConfirm: "Send me a kit",
  bookingAddressNeeded:
    "We need an address and a postcode to post the kit to you.",
  bookingKitFailed:
    "We could not order the kit just now. Nothing has been charged \u2014 please try again.",

  bookingConfirmedTitle: "You are booked",
  bookingConfirmedBody:
    "It is in your diary. We will remind you the day before, and again a couple of hours before.",
  bookingConfirmedKitBody:
    "Your kit is on its way. We will let you know when it has been posted.",
  bookingConfirmedPrepHeading: "Remember",
  bookingConfirmedDone: "Back to Home",
  bookingConfirmedSeeAppointments: "See my appointments",

  bookingFailed:
    "We could not confirm that booking. Nothing has been charged \u2014 please try again.",
  bookingSlotTaken:
    "Someone took that time while you were deciding \u2014 that happens. Pick another one and we will get you booked.",
  bookingSlotPast: "That time has already passed. Pick another one.",
  bookingSlotGone:
    "That time is no longer being offered. Pick another one and we will get you booked.",
  bookingNotSignedIn: "Please sign in again, then pick your time.",
  bookingNeedSql:
    "Booking is not set up on this database yet. Run supabase/phase5-booking.sql in the Supabase SQL Editor, then try again.",

  bookingsLoadFailed:
    "We could not load your appointments just now. Check your connection and try again.",
  bookingCancelTitle: "Cancel this appointment?",
  bookingCancel: "Cancel appointment",
  bookingCancelConfirm: "Yes, cancel it",
  bookingCancelKeep: "Keep it",
  bookingCancelled: "Cancelled. You can book again whenever you are ready.",
  bookingCancelFailed:
    "We could not cancel that just now. Please try again, or contact us if it keeps failing.",
  bookingNotCancellable:
    "This one is too close to the time to cancel in the app. Contact the lab directly and they will sort it out.",
  bookingUpcomingHeading: "Coming up",
  bookingPastHeading: "Earlier",
  bookingKindClinic: "Lab visit",
  bookingKindHomeKit: "Home kit",
  bookingOpenBooking: "Book a test",

  bookingPrepLoadFailed:
    "We could not load the preparation steps just now. Please try again \u2014 it is worth getting these right before you book.",

  resultsBookTests: "Book these tests",
} as const;
