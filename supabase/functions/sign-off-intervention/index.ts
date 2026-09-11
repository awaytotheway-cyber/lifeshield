// THIS IS AN EDGE FUNCTION (TypeScript), not SQL.
// Deploy: supabase functions deploy sign-off-intervention
//
// Clinicians approve / decline / edit plan rows and finalise a patient plan.
// The service-role key lives in Deno.env only — never in the admin browser.

import { createClient } from "jsr:@supabase/supabase-js@2";

import { sendPushForUser } from "./send-push-core.ts";

type SignOffAction = "approve" | "decline" | "edit" | "finalise_plan";

const ALLOWED_ACTIONS = new Set<SignOffAction>([
  "approve",
  "decline",
  "edit",
  "finalise_plan",
]);

const UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

function isLocalDevOrigin(origin: string): boolean {
  return /^https?:\/\/(localhost|127\.0\.0\.1)(:\d+)?$/i.test(origin);
}

// Admin panel (Vite on localhost:5173) sends a preflight OPTIONS first.
function corsHeaders(req: Request): Record<string, string> {
  const origin = req.headers.get("Origin") ?? "";
  return {
    "Access-Control-Allow-Origin": isLocalDevOrigin(origin) ? origin : "*",
    "Access-Control-Allow-Headers":
      "authorization, x-client-info, apikey, content-type, x-supabase-api-version, prefer",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Max-Age": "86400",
    "Content-Type": "application/json",
    Vary: "Origin",
  };
}

function jsonResponse(
  req: Request,
  body: unknown,
  status: number,
): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: corsHeaders(req),
  });
}

function readBearerToken(req: Request): string | null {
  const header = req.headers.get("Authorization") ?? "";
  const match = header.match(/^Bearer\s+(.+)$/i);
  const token = match?.[1]?.trim();
  return token && token.length > 0 ? token : null;
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (!value || typeof value !== "object" || Array.isArray(value)) {
    return null;
  }
  return value as Record<string, unknown>;
}

function readOptionalText(value: unknown): string | null {
  if (value == null || typeof value !== "string") {
    return null;
  }
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

async function callerCanSignOff(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
): Promise<boolean> {
  const { data: staffRows, error: staffError } = await adminClient
    .from("staff_roles")
    .select("role")
    .eq("user_id", userId)
    .maybeSingle();

  if (staffError) {
    throw staffError;
  }

  const role = staffRows?.role;
  if (role === "owner" || role === "admin") {
    return true;
  }

  if (role !== "clinician") {
    return false;
  }

  const { data: doctor, error: doctorError } = await adminClient
    .from("doctors")
    .select("can_sign_off, active")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (doctorError) {
    throw doctorError;
  }

  return Boolean(doctor?.can_sign_off);
}

async function callerSignOffLabel(
  adminClient: ReturnType<typeof createClient>,
  userId: string,
  email: string | undefined,
): Promise<string> {
  const { data: doctor } = await adminClient
    .from("doctors")
    .select("name")
    .eq("auth_user_id", userId)
    .eq("active", true)
    .maybeSingle();

  if (doctor?.name && String(doctor.name).trim().length > 0) {
    return String(doctor.name).trim();
  }

  return (email ?? "clinician").trim().toLowerCase();
}

async function clinicianCanViewPatient(
  adminClient: ReturnType<typeof createClient>,
  patientUserId: string,
): Promise<boolean> {
  const { data, error } = await adminClient.rpc("clinician_can_view_patient", {
    p_patient_user_id: patientUserId,
  });

  if (error) {
    throw error;
  }

  return Boolean(data);
}

Deno.serve(async (req) => {
  try {
    if (req.method === "OPTIONS") {
      return new Response(null, { status: 204, headers: corsHeaders(req) });
    }

    if (req.method !== "POST") {
      return jsonResponse(req, { error: "Use POST" }, 405);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL");
    const anonKey = Deno.env.get("SUPABASE_ANON_KEY");
    const serviceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY");

    if (!supabaseUrl || !anonKey || !serviceRoleKey) {
      return jsonResponse(
        req,
        {
          error:
            "Server is missing Supabase secrets. Set SUPABASE_SERVICE_ROLE_KEY in Edge Function secrets.",
        },
        500,
      );
    }

    const jwt = readBearerToken(req);
    if (!jwt) {
      return jsonResponse(req, { error: "Please sign in first." }, 401);
    }

    const authClient = createClient(supabaseUrl, anonKey, {
      global: { headers: { Authorization: `Bearer ${jwt}` } },
    });
    const { data: userData, error: userError } = await authClient.auth.getUser(jwt);
    if (userError || !userData.user) {
      return jsonResponse(
        req,
        { error: "Your session is not valid. Please sign in again." },
        401,
      );
    }

    const callerId = userData.user.id;
    const adminClient = createClient(supabaseUrl, serviceRoleKey);

    const allowed = await callerCanSignOff(adminClient, callerId);
    if (!allowed) {
      return jsonResponse(
        req,
        { error: "This account is not allowed to sign off plans." },
        403,
      );
    }

    let body: unknown;
    try {
      body = await req.json();
    } catch {
      return jsonResponse(req, { error: "Send JSON with an action field." }, 400);
    }

    const payload = asRecord(body);
    const actionRaw = readOptionalText(payload?.action);
    if (!actionRaw || !ALLOWED_ACTIONS.has(actionRaw as SignOffAction)) {
      return jsonResponse(
        req,
        { error: "action must be approve, decline, edit, or finalise_plan." },
        400,
      );
    }

    const action = actionRaw as SignOffAction;
    const interventionId = readOptionalText(payload?.intervention_id);
    const patientUserId = readOptionalText(payload?.patient_user_id);
    const dosageNote = readOptionalText(payload?.dosage_note);
    const signOffLabel = await callerSignOffLabel(
      adminClient,
      callerId,
      userData.user.email,
    );

    const { data: staffRow } = await adminClient
      .from("staff_roles")
      .select("role")
      .eq("user_id", callerId)
      .maybeSingle();
    const isAdminStaff =
      staffRow?.role === "owner" || staffRow?.role === "admin";

    if (action === "finalise_plan") {
      if (!patientUserId || !UUID_RE.test(patientUserId)) {
        return jsonResponse(req, { error: "patient_user_id must be a valid id." }, 400);
      }

      if (!isAdminStaff) {
        const canView = await clinicianCanViewPatient(adminClient, patientUserId);
        if (!canView) {
          return jsonResponse(
            req,
            { error: "You are not allowed to finalise this patient plan." },
            403,
          );
        }
      }

      const { count: draftCount, error: draftError } = await adminClient
        .from("interventions")
        .select("id", { count: "exact", head: true })
        .eq("user_id", patientUserId)
        .eq("status", "draft");

      if (draftError) {
        throw draftError;
      }

      if ((draftCount ?? 0) > 0) {
        return jsonResponse(
          req,
          { error: "Approve or decline every draft item before finalising." },
          400,
        );
      }

      const { data: activated, error: activateError } = await adminClient
        .from("interventions")
        .update({ status: "active" })
        .eq("user_id", patientUserId)
        .eq("status", "clinician_approved")
        .select("id");

      if (activateError) {
        throw activateError;
      }

      // Notify patient — never block finalise if push fails or no token exists.
      let push: Awaited<ReturnType<typeof sendPushForUser>> | undefined;
      try {
        push = await sendPushForUser(
          adminClient,
          patientUserId,
          "plan_approved",
        );
      } catch {
        push = undefined;
      }

      return jsonResponse(
        req,
        {
          data: {
            action: "finalise_plan",
            patient_user_id: patientUserId,
            activated_count: activated?.length ?? 0,
          },
          push,
        },
        200,
      );
    }

    if (!interventionId || !UUID_RE.test(interventionId)) {
      return jsonResponse(req, { error: "intervention_id must be a valid id." }, 400);
    }

    const { data: row, error: rowError } = await adminClient
      .from("interventions")
      .select("id, user_id, status")
      .eq("id", interventionId)
      .maybeSingle();

    if (rowError) {
      throw rowError;
    }

    if (!row) {
      return jsonResponse(req, { error: "Intervention not found." }, 404);
    }

    if (!isAdminStaff) {
      const canView = await clinicianCanViewPatient(adminClient, row.user_id);
      if (!canView) {
        return jsonResponse(
          req,
          { error: "You are not allowed to review this patient." },
          403,
        );
      }
    }

    if (action === "approve") {
      if (row.status !== "draft") {
        return jsonResponse(
          req,
          { error: "Only draft interventions can be approved." },
          400,
        );
      }

      const { data, error } = await adminClient
        .from("interventions")
        .update({
          status: "clinician_approved",
          approved_by: signOffLabel,
          approved_at: new Date().toISOString(),
        })
        .eq("id", interventionId)
        .select("id, status")
        .single();

      if (error) {
        throw error;
      }

      return jsonResponse(req, { data: { action: "approve", ...data } }, 200);
    }

    if (action === "decline") {
      if (row.status !== "draft") {
        return jsonResponse(
          req,
          { error: "Only draft interventions can be declined." },
          400,
        );
      }

      const { data, error } = await adminClient
        .from("interventions")
        .update({ status: "declined" })
        .eq("id", interventionId)
        .select("id, status")
        .single();

      if (error) {
        throw error;
      }

      return jsonResponse(req, { data: { action: "decline", ...data } }, 200);
    }

    if (action === "edit") {
      if (row.status !== "draft" && row.status !== "clinician_approved") {
        return jsonResponse(
          req,
          { error: "This intervention can no longer be edited." },
          400,
        );
      }

      const { data, error } = await adminClient
        .from("interventions")
        .update({ description: dosageNote })
        .eq("id", interventionId)
        .select("id, description")
        .single();

      if (error) {
        throw error;
      }

      return jsonResponse(req, { data: { action: "edit", ...data } }, 200);
    }

    return jsonResponse(req, { error: "Unknown action." }, 400);
  } catch (error) {
    return jsonResponse(req, { error: String(error) }, 500);
  }
});
