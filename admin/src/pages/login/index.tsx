import { AuthPage } from "@refinedev/antd";

import { ConfigWarning } from "../../components/ConfigWarning";
import { colors } from "../../theme/tokens";

/**
 * Sign-in screen with a visible warning when admin/.env is missing or invalid.
 */
export function AdminLoginPage() {
  return (
    <div className="ls-login">
      <div style={{ maxWidth: 480, margin: "0 auto", padding: "32px 16px 0" }}>
        <ConfigWarning />
      </div>
      <AuthPage
        type="login"
        title={
          <div>
            <div className="ls-login-title">PRESCOPE</div>
            <div className="ls-login-subtitle">Admin — clinician and ops</div>
          </div>
        }
        wrapperProps={{
          style: {
            background: colors.cream,
            minHeight: "calc(100vh - 80px)",
          },
        }}
        contentProps={{
          style: {
            borderRadius: 16,
            boxShadow: "0 2px 12px rgba(13, 74, 92, 0.08)",
          },
        }}
        formProps={{
          initialValues: { email: "", password: "" },
        }}
      />
    </div>
  );
}
