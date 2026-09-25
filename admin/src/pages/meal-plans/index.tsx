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
 * User meal plans — admin read-all + edit only the clinician review fields.
 *
 * Same pattern as admin/src/pages/goals: the mobile app owns creation and
 * editing of the actual plan; this screen is a review lens. The form only
 * saves `clinician_reviewed`, `reviewer_note`, `reviewed_by`, `reviewed_at`.
 */

type MealSlotEntry = {
  slot: string;
  recipe_id: string;
  recipe_slug: string;
  recipe_name: string;
};

type MealPlanRecord = {
  id: string;
  user_id: string;
  title: string;
  start_date: string;
  end_date: string;
  plan: { days?: Array<{ date: string; meals?: MealSlotEntry[] }> } | null;
  preferences: {
    slots?: string[];
    avoid_tags?: string[];
    prefer_tags?: string[];
  } | null;
  status: string;
  source_kind: string;
  clinician_reviewed: boolean;
  reviewed_by: string | null;
  reviewed_at: string | null;
  reviewer_note: string | null;
  created_at?: string;
  updated_at?: string;
};

function countMeals(record: MealPlanRecord): number {
  const days = record.plan?.days ?? [];
  return days.reduce((sum, day) => sum + (day.meals?.length ?? 0), 0);
}

export function MealPlanList() {
  const { tableProps } = useTable<MealPlanRecord>({
    syncWithLocation: true,
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="Meal plans (review)">
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column
          title="Range"
          render={(_: unknown, record: MealPlanRecord) =>
            `${record.start_date} → ${record.end_date}`
          }
        />
        <Table.Column
          title="Meals"
          render={(_: unknown, record: MealPlanRecord) => {
            const meals = countMeals(record);
            const days = record.plan?.days?.length ?? 0;
            return `${days}d · ${meals} meals`;
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
                  : "inactive";
            return <StatusChip kind={kind}>{status}</StatusChip>;
          }}
        />
        <Table.Column
          dataIndex="clinician_reviewed"
          title="Reviewed"
          render={(reviewed: boolean, record: MealPlanRecord) =>
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
          render={(_: unknown, record: MealPlanRecord) => (
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

export function MealPlanEdit() {
  const { data: identity } = useGetIdentity<{ id: string; email?: string }>();
  const { formProps, saveButtonProps, query } = useForm<MealPlanRecord>({
    redirect: false,
  });
  const row = query?.data?.data;

  return (
    <Edit saveButtonProps={saveButtonProps} title="Review meal plan">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Only the review fields save here"
        description="The plan itself belongs to the patient. This form only writes clinician_reviewed / reviewer_note / reviewed_by / reviewed_at."
      />

      {row ? <PlanReadOnly row={row} /> : null}

      <Form
        {...formProps}
        layout="vertical"
        onFinish={(values) => {
          const payload = values as Partial<MealPlanRecord>;
          const wasReviewed = row?.clinician_reviewed ?? false;
          const isReviewed = Boolean(payload.clinician_reviewed);
          const now = new Date().toISOString();
          return formProps.onFinish?.({
            clinician_reviewed: isReviewed,
            reviewer_note:
              (payload.reviewer_note ?? "").toString().trim() || null,
            reviewed_by:
              isReviewed && !wasReviewed
                ? identity?.email ?? identity?.id ?? "admin"
                : (payload.reviewed_by ?? row?.reviewed_by ?? null),
            reviewed_at:
              isReviewed && !wasReviewed ? now : row?.reviewed_at ?? null,
          });
        }}
      >
        <Form.Item name="clinician_reviewed" valuePropName="checked">
          <Checkbox>Mark as reviewed by clinician</Checkbox>
        </Form.Item>
        <Form.Item
          label="Reviewer note (optional)"
          name="reviewer_note"
          extra="Rendered on the patient's meal-plan detail screen. Point out any macro-nutrient concerns, missing food groups, or interactions with their medications."
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

function PlanReadOnly({ row }: { row: MealPlanRecord }) {
  const days = row.plan?.days ?? [];
  const totalMeals = countMeals(row);
  const preferTags = row.preferences?.prefer_tags ?? [];
  const avoidTags = row.preferences?.avoid_tags ?? [];
  return (
    <Space direction="vertical" style={{ marginBottom: 24, width: "100%" }}>
      <Typography.Title level={4} style={{ marginBottom: 4 }}>
        {row.title}
      </Typography.Title>
      <Typography.Text type="secondary">
        Patient <code>{row.user_id}</code>
      </Typography.Text>
      <div>
        <Typography.Text strong>Range:</Typography.Text> {row.start_date} →{" "}
        {row.end_date} ({days.length} days · {totalMeals} meals)
      </div>
      {preferTags.length > 0 ? (
        <div>
          <Typography.Text strong>Prefer:</Typography.Text>{" "}
          {preferTags.join(", ")}
        </div>
      ) : null}
      {avoidTags.length > 0 ? (
        <div>
          <Typography.Text strong>Avoid:</Typography.Text>{" "}
          {avoidTags.join(", ")}
        </div>
      ) : null}
    </Space>
  );
}
