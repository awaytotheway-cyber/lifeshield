import { Edit, EditButton, List, useForm, useTable } from "@refinedev/antd";
import { useGetIdentity } from "@refinedev/core";
import {
  Alert,
  Checkbox,
  Form,
  Input,
  Space,
  Table,
  Typography,
} from "antd";

import { StatusChip } from "../../components/StatusChip";

/**
 * User goals — admin read-all + edit only the clinician review fields.
 *
 * The mobile app owns goal creation and editing (title, target, cadence,
 * status). This screen is a review lens: an admin/clinician can toggle
 * `clinician_reviewed`, leave a reviewer_note, and record who reviewed it.
 * The rest of the columns are read-only so a stray edit here can't rewrite
 * a patient's own goal.
 */

type GoalRecord = {
  id: string;
  user_id: string;
  goal_type: string;
  title: string;
  target: { value: number; unit: string; cadence: string } | null;
  start_date: string;
  end_date: string | null;
  status: string;
  source_kind: string;
  source_ref: string | null;
  clinician_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at?: string;
  updated_at?: string;
};

export function GoalList() {
  const { tableProps } = useTable<GoalRecord>({
    syncWithLocation: true,
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="Goals (review)">
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column
          dataIndex="target"
          title="Target"
          render={(target: GoalRecord["target"]) => {
            if (!target) return "—";
            return `${target.value} ${target.unit} · ${target.cadence}`;
          }}
        />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(status: string) => {
            const kind =
              status === "active"
                ? "active"
                : status === "completed"
                  ? "success"
                  : status === "paused"
                    ? "warning"
                    : "inactive";
            return <StatusChip kind={kind}>{status}</StatusChip>;
          }}
        />
        <Table.Column
          dataIndex="clinician_reviewed"
          title="Reviewed"
          render={(reviewed: boolean, record: GoalRecord) =>
            reviewed ? (
              <StatusChip kind="approved">
                {record.reviewed_by ? `by ${record.reviewed_by}` : "yes"}
              </StatusChip>
            ) : (
              <StatusChip kind="draft">no</StatusChip>
            )
          }
        />
        <Table.Column
          dataIndex="user_id"
          title="Patient"
          width={280}
          render={(value: string) =>
            value ? <code style={{ fontSize: 11 }}>{value}</code> : "—"
          }
        />
        <Table.Column
          dataIndex="created_at"
          title="Created"
          render={(value: string) =>
            value ? new Date(value).toLocaleString() : "—"
          }
        />
        <Table.Column
          dataIndex="actions"
          title="Actions"
          fixed="right"
          width={100}
          render={(_: unknown, record: GoalRecord) => (
            <Space size="small">
              <EditButton size="small" recordItemId={record.id}>
                Review
              </EditButton>
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

export function GoalEdit() {
  const { data: identity } = useGetIdentity<{ id: string; email?: string }>();

  const { formProps, saveButtonProps, query } = useForm<GoalRecord>({
    redirect: false,
  });

  const goal = query?.data?.data;

  return (
    <Edit saveButtonProps={saveButtonProps} title="Review goal">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Only the review fields save here"
        description="Target, cadence and status belong to the patient's own goal — edits to those fields on this form are ignored so a review pass never overwrites a patient's log."
      />

      {goal ? (
        <ReadOnlySummary goal={goal} />
      ) : null}

      <Form
        {...formProps}
        layout="vertical"
        onFinish={(values) => {
          const payload = values as Partial<GoalRecord>;
          const wasReviewed = goal?.clinician_reviewed ?? false;
          const isReviewed = Boolean(payload.clinician_reviewed);
          // Stamp who / when when the flip turned on (or the note changed on
          // an already-reviewed row and reviewed_by is empty).
          const now = new Date().toISOString();
          return formProps.onFinish?.({
            clinician_reviewed: isReviewed,
            reviewer_note: (payload.reviewer_note ?? "").toString().trim() || null,
            reviewed_by:
              isReviewed && !wasReviewed
                ? identity?.email ?? identity?.id ?? "admin"
                : (payload.reviewed_by ?? goal?.reviewed_by ?? null),
            reviewed_at:
              isReviewed && !wasReviewed ? now : goal?.reviewed_at ?? null,
          });
        }}
      >
        <Form.Item name="clinician_reviewed" valuePropName="checked">
          <Checkbox>Mark as reviewed by clinician</Checkbox>
        </Form.Item>
        <Form.Item
          label="Reviewer note (optional)"
          name="reviewer_note"
          extra="Shown to the patient on the goal detail screen when they open it. Keep this supportive and specific — 'Great choice; aim for 3 sessions/week this month.'"
        >
          <Input.TextArea rows={4} maxLength={1000} showCount />
        </Form.Item>
        <Form.Item label="Reviewed by" name="reviewed_by">
          <Input disabled placeholder="Stamped when you flip Reviewed on" />
        </Form.Item>
      </Form>
    </Edit>
  );
}

function ReadOnlySummary({ goal }: { goal: GoalRecord }) {
  return (
    <Space direction="vertical" style={{ marginBottom: 24, width: "100%" }}>
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {goal.title}
      </Typography.Title>
      <Typography.Text type="secondary">
        Patient <code>{goal.user_id}</code>
      </Typography.Text>
      <div>
        <Typography.Text strong>Target:</Typography.Text>{" "}
        {goal.target
          ? `${goal.target.value} ${goal.target.unit} · ${goal.target.cadence}`
          : "—"}
      </div>
      <div>
        <Typography.Text strong>Window:</Typography.Text> {goal.start_date}
        {goal.end_date ? ` → ${goal.end_date}` : " → open-ended"}
      </div>
      <div>
        <Typography.Text strong>Status:</Typography.Text> {goal.status}
        {goal.source_kind !== "self" ? ` · from ${goal.source_kind}` : ""}
      </div>
    </Space>
  );
}
