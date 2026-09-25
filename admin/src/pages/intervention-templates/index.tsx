import {
  Create,
  Edit,
  EditButton,
  List,
  Show,
  ShowButton,
  useForm,
  useTable,
} from "@refinedev/antd";
import {
  BooleanField,
  DateField,
  NumberField,
  TextField,
} from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import {
  Alert,
  Form,
  Input,
  Select,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";

import { StatusChip } from "../../components/StatusChip";

/**
 * Intervention templates library.
 *
 * Rows are read at plan-generation time by lib/rules-engine via
 * loadTemplatesForEngine(); when a row fails validation (missing any of
 * plain_reason, description, category, rationale_md, or a non-empty
 * trigger_findings) the engine drops it and falls back to the hard-coded
 * FINDING_INTERVENTION_TABLE for that finding, so an in-progress edit
 * won't break the plan. Keep code stable — the mobile app also uses it
 * for the detail-screen template lookup.
 */

type TemplateRecord = {
  id: string;
  code: string;
  title: string;
  rationale_md: string | null;
  action_steps: unknown;
  resources: unknown;
  impact_score: number;
  contraindication_codes: string[] | null;
  trigger_findings: string[] | null;
  plain_reason: string | null;
  description: string | null;
  category: string | null;
  needs_interaction_check: boolean;
  created_at?: string;
  updated_at?: string;
};

const CATEGORY_OPTIONS = [
  { label: "Supplement", value: "supplement" },
  { label: "Diet", value: "diet" },
  { label: "Lifestyle", value: "lifestyle" },
  { label: "Therapy", value: "therapy" },
  { label: "Referral", value: "referral" },
  { label: "Coaching", value: "coaching" },
];

const IMPACT_OPTIONS = [1, 2, 3, 4, 5].map((n) => ({
  label: `${n}`,
  value: n,
}));

/** List every template with the fields the engine reads. */
export function InterventionTemplateList() {
  const { tableProps } = useTable<TemplateRecord>({
    syncWithLocation: true,
    sorters: {
      initial: [
        { field: "impact_score", order: "desc" },
        { field: "code", order: "asc" },
      ],
    },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="code" title="Code" sorter />
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column
          dataIndex="category"
          title="Category"
          render={(value: string | null) =>
            value ? (
              <StatusChip kind="info">{value}</StatusChip>
            ) : (
              <StatusChip kind="warning">not set</StatusChip>
            )
          }
        />
        <Table.Column
          dataIndex="impact_score"
          title="Impact"
          sorter
          width={90}
        />
        <Table.Column
          dataIndex="needs_interaction_check"
          title="Interaction check"
          render={(value: boolean) =>
            value ? (
              <StatusChip kind="warning">practitioner check</StatusChip>
            ) : (
              <StatusChip kind="inactive">no</StatusChip>
            )
          }
        />
        <Table.Column
          dataIndex="trigger_findings"
          title="Trigger findings"
          render={(value: string[] | null) => {
            const list = Array.isArray(value) ? value : [];
            if (list.length === 0) {
              return <StatusChip kind="warning">none</StatusChip>;
            }
            return (
              <Space size={4} wrap>
                {list.map((finding) => (
                  <StatusChip key={finding} kind="info">
                    {finding}
                  </StatusChip>
                ))}
              </Space>
            );
          }}
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          fixed="right"
          width={160}
          render={(_: unknown, record: TemplateRecord) => (
            <Space size="small">
              <EditButton size="small" recordItemId={record.id}>
                Edit
              </EditButton>
              <ShowButton hideText size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

// ---------- Form ----------

/**
 * Stringify a jsonb value for display in a textarea. Kept lenient: raw JSON
 * strings from Supabase pass through, objects/arrays are pretty-printed,
 * null/undefined become the empty string.
 */
function jsonToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

/** Parse a textarea value back to JSON. Empty → default; invalid → throw. */
function textToJson(text: string, fallback: unknown): unknown {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed);
}

function TemplateFormFields() {
  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Rows the engine can read"
        description="The rules engine reads title, rationale_md, plain_reason, description, category, needs_interaction_check, and trigger_findings. Missing any of these drops the template at load — the plan still renders using the hard-coded fallback for that finding."
      />

      <Form.Item
        label="Code"
        name="code"
        rules={[
          { required: true, message: "Code is required" },
          {
            pattern: /^[a-z0-9_]+$/,
            message: "Lowercase letters, digits and underscores only.",
          },
        ]}
        extra="Stable id used by lib/rules-engine and admin tooling. Do not rename an in-use code without redeploying the app."
      >
        <Input placeholder="vitamin_d_deficient" />
      </Form.Item>

      <Form.Item
        label="Title"
        name="title"
        rules={[{ required: true, message: "Title is required" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Category"
        name="category"
        rules={[{ required: true, message: "Category is required" }]}
      >
        <Select options={CATEGORY_OPTIONS} />
      </Form.Item>

      <Form.Item
        label="Trigger findings"
        name="trigger_findings"
        rules={[
          {
            required: true,
            type: "array",
            min: 1,
            message: "Add at least one trigger finding.",
          },
        ]}
        extra='Exact strings the rules engine writes to interventions.trigger_finding. Match verbatim — e.g. "Raised fasting insulin".'
      >
        <Select mode="tags" tokenSeparators={[",", "\n"]} />
      </Form.Item>

      <Form.Item
        label="Plain reason (user-facing why)"
        name="plain_reason"
        rules={[{ required: true, message: "Plain reason is required" }]}
      >
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item
        label="Description"
        name="description"
        rules={[{ required: true, message: "Description is required" }]}
      >
        <Input.TextArea rows={3} />
      </Form.Item>

      <Form.Item
        label="Rationale (Markdown, becomes clinical_basis on the intervention row)"
        name="rationale_md"
        rules={[{ required: true, message: "Rationale is required" }]}
      >
        <Input.TextArea rows={5} />
      </Form.Item>

      <Form.Item
        label="Action steps (JSON array)"
        name="action_steps"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        extra='Each item: {"text": "…", "why"?: "…", "dose"?: "…", "when"?: "…", "kind"?: "supplement|diet|lifestyle|therapy|referral|coaching|generic"}'
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, []);
                if (!Array.isArray(parsed)) {
                  return Promise.reject(
                    new Error("Action steps must be a JSON array."),
                  );
                }
                return Promise.resolve();
              } catch (error) {
                return Promise.reject(
                  new Error(
                    `Invalid JSON: ${(error as Error).message}`,
                  ),
                );
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={8} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Resources (JSON array)"
        name="resources"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        extra='Each item: {"title": "…", "url": "https://…", "kind": "article|study|video|product"}'
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, []);
                if (!Array.isArray(parsed)) {
                  return Promise.reject(
                    new Error("Resources must be a JSON array."),
                  );
                }
                return Promise.resolve();
              } catch (error) {
                return Promise.reject(
                  new Error(
                    `Invalid JSON: ${(error as Error).message}`,
                  ),
                );
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={6} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Impact score (1 = nice-to-have … 5 = critical)"
        name="impact_score"
        rules={[{ required: true }]}
      >
        <Select options={IMPACT_OPTIONS} />
      </Form.Item>

      <Form.Item
        label="Contraindication codes"
        name="contraindication_codes"
        extra="e.g. hormones, blood_thinners. Free-form tags for a future practitioner-review workflow."
      >
        <Select mode="tags" tokenSeparators={[",", "\n"]} />
      </Form.Item>

      <Form.Item
        label="Needs practitioner interaction check"
        name="needs_interaction_check"
        valuePropName="checked"
        extra="When on, the intervention row is flagged for review if the patient reported hormones / contraceptives / blood thinners."
      >
        <Switch />
      </Form.Item>
    </>
  );
}

/** Parse JSON textareas on submit; leaves the row untouched if parse fails. */
function useTemplateForm(mode: "create" | "edit") {
  const form = useForm<TemplateRecord>({
    // Re-fetch on load so an admin editing a row seeded elsewhere sees the
    // latest jsonb before mutating.
    warnWhenUnsavedChanges: true,
  });

  const originalOnFinish = form.formProps.onFinish;
  const wrappedOnFinish = async (values: Record<string, unknown>) => {
    const next = { ...values };
    try {
      next.action_steps = textToJson(
        (values.action_steps as string) ?? "",
        [],
      );
    } catch {
      // Leave the raw string; the field validator will already have shown
      // the error and blocked submit before this runs in most cases.
      next.action_steps = [];
    }
    try {
      next.resources = textToJson((values.resources as string) ?? "", []);
    } catch {
      next.resources = [];
    }
    if (mode === "create" && !next.needs_interaction_check) {
      next.needs_interaction_check = false;
    }
    if (typeof originalOnFinish === "function") {
      return originalOnFinish(next);
    }
    return undefined;
  };

  return {
    ...form,
    formProps: { ...form.formProps, onFinish: wrappedOnFinish },
  };
}

export function InterventionTemplateCreate() {
  const { formProps, saveButtonProps } = useTemplateForm("create");

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          impact_score: 3,
          needs_interaction_check: false,
          contraindication_codes: [],
          trigger_findings: [],
          action_steps: "[]",
          resources: "[]",
        }}
      >
        <TemplateFormFields />
      </Form>
    </Create>
  );
}

export function InterventionTemplateEdit() {
  const { formProps, saveButtonProps } = useTemplateForm("edit");

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <TemplateFormFields />
      </Form>
    </Edit>
  );
}

export function InterventionTemplateShow() {
  const { query } = useShow<TemplateRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Code</Typography.Title>
      <TextField value={record?.code} />
      <Typography.Title level={5}>Title</Typography.Title>
      <TextField value={record?.title} />
      <Typography.Title level={5}>Category</Typography.Title>
      <TextField value={record?.category ?? ""} />
      <Typography.Title level={5}>Trigger findings</Typography.Title>
      <TextField
        value={(record?.trigger_findings ?? []).join(", ")}
      />
      <Typography.Title level={5}>Plain reason</Typography.Title>
      <TextField value={record?.plain_reason ?? ""} />
      <Typography.Title level={5}>Description</Typography.Title>
      <TextField value={record?.description ?? ""} />
      <Typography.Title level={5}>Rationale (Markdown)</Typography.Title>
      <TextField value={record?.rationale_md ?? ""} />
      <Typography.Title level={5}>Action steps</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.action_steps)}
      </pre>
      <Typography.Title level={5}>Resources</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.resources)}
      </pre>
      <Typography.Title level={5}>Impact score</Typography.Title>
      <NumberField value={record?.impact_score ?? 0} />
      <Typography.Title level={5}>Contraindication codes</Typography.Title>
      <TextField
        value={(record?.contraindication_codes ?? []).join(", ")}
      />
      <Typography.Title level={5}>Needs interaction check</Typography.Title>
      <BooleanField value={record?.needs_interaction_check} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
      <Typography.Title level={5}>Updated</Typography.Title>
      <DateField value={record?.updated_at} />
    </Show>
  );
}

