import { Alert, Button, Card, Typography } from "antd";
import { Link } from "react-router-dom";

/**
 * Shown when someone signs in with Supabase but has no staff_roles row.
 */
export function UnauthorizedPage() {
  return (
    <div className="ls-unauthorized">
      <Card style={{ maxWidth: 520, width: "100%" }}>
        <Typography.Title level={3} className="ls-page-title">
          Not authorized
        </Typography.Title>
        <Alert
          type="warning"
          showIcon
          message="This account cannot use the admin panel yet."
          description={
            <>
              You need a row in the <code>staff_roles</code> table in Supabase
              (for example role <strong>owner</strong> or <strong>admin</strong>
              ). Ask the project owner to add one for your user id, then sign in
              again.
            </>
          }
          style={{ marginBottom: 16 }}
        />
        <Button type="primary">
          <Link to="/login">Back to sign in</Link>
        </Button>
      </Card>
    </div>
  );
}
