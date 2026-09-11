/**
 * Supabase auth + staff_roles gate for the admin panel.
 *
 * A valid Supabase login is NOT enough — the user must also have a row in
 * staff_roles (owner, admin, clinician, or clinic_staff). Without it we show
 * a friendly "not authorized" page instead of admin data.
 */
import type { AuthProvider } from "@refinedev/core";

import { formatAuthError } from "./utility/formatAuthError";
import {
  getStaffRoleForUser,
  isSupabaseConfigured,
  supabaseClient,
} from "./utility/supabaseClient";

const authProvider: AuthProvider = {
  login: async ({ email, password }) => {
    if (!isSupabaseConfigured) {
      return {
        success: false,
        error: formatAuthError(new Error("Supabase is not configured")),
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.signInWithPassword({
        email,
        password,
      });

      if (error) {
        return {
          success: false,
          error: formatAuthError(error),
        };
      }

      if (!data.user) {
        return {
          success: false,
          error: new Error("Sign-in did not return a user. Please try again."),
        };
      }

      const staffRole = await getStaffRoleForUser(data.user.id);

      if (!staffRole) {
        await supabaseClient.auth.signOut();
        return {
          success: false,
          redirectTo: "/unauthorized",
          error: new Error(
            "Your account signed in, but you are not authorized for the admin panel.",
          ),
        };
      }

      return {
        success: true,
        redirectTo: "/",
      };
    } catch (err) {
      return {
        success: false,
        error: formatAuthError(err),
      };
    }
  },

  logout: async () => {
    try {
      const { error } = await supabaseClient.auth.signOut();
      if (error) {
        return { success: false, error };
      }
      return { success: true, redirectTo: "/login" };
    } catch (err) {
      return {
        success: false,
        error: err instanceof Error ? err : new Error("Sign-out failed."),
      };
    }
  },

  check: async () => {
    if (!isSupabaseConfigured) {
      return {
        authenticated: false,
        redirectTo: "/login",
        error: formatAuthError(new Error("Supabase is not configured")),
      };
    }

    try {
      const { data, error } = await supabaseClient.auth.getSession();

      if (error || !data.session) {
        return {
          authenticated: false,
          redirectTo: "/login",
        };
      }

      const staffRole = await getStaffRoleForUser(data.session.user.id);

      if (!staffRole) {
        return {
          authenticated: false,
          redirectTo: "/unauthorized",
          logout: true,
        };
      }

      return { authenticated: true };
    } catch {
      return {
        authenticated: false,
        redirectTo: "/login",
      };
    }
  },

  getPermissions: async () => {
    try {
      const { data } = await supabaseClient.auth.getUser();
      if (!data.user) return null;

      const staffRole = await getStaffRoleForUser(data.user.id);
      return staffRole?.role ?? null;
    } catch {
      return null;
    }
  },

  getIdentity: async () => {
    try {
      const { data } = await supabaseClient.auth.getUser();
      if (!data.user) return null;

      const staffRole = await getStaffRoleForUser(data.user.id);

      return {
        id: data.user.id,
        name: data.user.email ?? "Staff user",
        role: staffRole?.role,
      };
    } catch {
      return null;
    }
  },

  onError: async (error) => {
    if (error?.status === 401 || error?.status === 403) {
      return {
        logout: true,
        redirectTo: "/login",
        error,
      };
    }

    return { error };
  },
};

export default authProvider;
