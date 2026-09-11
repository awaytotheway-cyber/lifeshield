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
import { DateField, NumberField, TextField } from "@refinedev/antd";
import { usePermissions, useShow } from "@refinedev/core";
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Table,
  Typography,
} from "antd";
import { Navigate } from "react-router-dom";

import { StatusChip, thresholdChipKind } from "../../components/StatusChip";
import { canEditClinicalThresholds } from "../../utility/canEditClinicalThresholds";

type ClinicalThresholdRecord = {
  key: string;
  value: number;
  label?: string;
  status?: "confirmed" | "assumed";
  updated_at?: string;
};

const STATUS_OPTIONS = [
  {
    label: "Confirmed — agreed with clinician / source document",
    value: "confirmed",
  },
  {
    label: "Assumed — placeholder until clinician confirms",
    value: "assumed",
  },
];

/** Plain labels so non-coders know what each row controls. */
const KEY_HELP: Record<string, string> = {
  fastingInsulin_elevated:
    "Used when fasting insulin lab results are checked (μIU/mL).",
  bmi_obesityThreshold:
    "BMI above this number can trigger stool-analysis rules from questionnaire weight.",
  tsh_subclinicalHypo:
    "TSH above this value can trigger urinary iodine / thyroid-related rules.",
  liverEnzyme_altAstElevated:
    "ALT/AST above this value pairs with Gilbert syndrome in heavy-metal logic.",
};

function StatusTag({ value }: { value?: string }) {
  const label =
    value === "confirmed"
      ? "Confirmed"
      : value === "assumed"
        ? "Assumed"
        : "Unknown";
  return <StatusChip kind={thresholdChipKind(value)}>{label}</StatusChip>;
}

function useCanEditThresholds() {
  const { data: role } = usePermissions<string>({});
  return canEditClinicalThresholds(role);
}

/** List all clinical cut-offs. Clinicians see read-only; owner/admin can edit. */
export function ClinicalThresholdList() {
  const canEdit = useCanEditThresholds();
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "key", order: "asc" }] },
  });

  return (
    <List title="Clinical thresholds" canCreate={canEdit}>
      {!canEdit ? (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Read-only for your role"
          description="You can view the cut-offs used by the rules engine. Only owner or admin can change values."
        />
      ) : (
        <Alert
          type="info"
          showIcon
          className="mb-4"
          message="Changes apply to new rule runs"
          description="After you save here, the mobile app loads these numbers from the database (with a code fallback if offline)."
        />
      )}

      <Table {...tableProps} rowKey="key" scroll={{ x: true }}>
        <Table.Column dataIndex="key" title="Key" sorter width={220} />
        <Table.Column
          dataIndex="label"
          title="Plain description"
          render={(value: string, record: ClinicalThresholdRecord) =>
            value ?? KEY_HELP[record.key] ?? "—"
          }
        />
        <Table.Column dataIndex="value" title="Value" sorter />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(value: string) => <StatusTag value={value} />}
        />
        <Table.Column
          dataIndex="updated_at"
          title="Last updated"
          render={(value: string) =>
            value ? new Date(value).toLocaleString() : "—"
          }
        />
        <Table.Column
          title="Actions"
          render={(_, record: ClinicalThresholdRecord) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.key} />
              {canEdit ? (
                <EditButton hideText size="small" recordItemId={record.key} />
              ) : null}
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

/** Add a new threshold key (owner/admin only). */
export function ClinicalThresholdCreate() {
  const canEdit = useCanEditThresholds();
  const { formProps, saveButtonProps } = useForm();

  if (!canEdit) {
    return <Navigate to="/clinical-thresholds" replace />;
  }

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Key (internal name — do not change after save)"
          name="key"
          rules={[{ required: true, message: "Key is required" }]}
          extra="Use snake_case, e.g. tsh_subclinicalHypo. Must match the mobile rules engine."
        >
          <Input />
        </Form.Item>
        <Form.Item
          label="Plain description"
          name="label"
          rules={[{ required: true, message: "Please add a plain description" }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          label="Value"
          name="value"
          rules={[{ required: true, message: "Value is required" }]}
        >
          <InputNumber className="w-full" min={0} step={0.1} />
        </Form.Item>
        <Form.Item
          label="Status"
          name="status"
          initialValue="assumed"
          rules={[{ required: true }]}
        >
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Create>
  );
}

/** Edit an existing threshold (owner/admin only). */
export function ClinicalThresholdEdit() {
  const canEdit = useCanEditThresholds();
  const { formProps, saveButtonProps } = useForm();

  if (!canEdit) {
    return <Navigate to="/clinical-thresholds" replace />;
  }

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Key" name="key">
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Plain description"
          name="label"
          rules={[{ required: true, message: "Please add a plain description" }]}
        >
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item
          label="Value"
          name="value"
          rules={[{ required: true, message: "Value is required" }]}
        >
          <InputNumber className="w-full" min={0} step={0.1} />
        </Form.Item>
        <Form.Item label="Status" name="status" rules={[{ required: true }]}>
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Edit>
  );
}

/** Read-only detail view (all staff roles). */
export function ClinicalThresholdShow() {
  const { query } = useShow<ClinicalThresholdRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Key</Typography.Title>
      <TextField value={record?.key} />
      <Typography.Title level={5}>Plain description</Typography.Title>
      <TextField value={record?.label} />
      {record?.key && KEY_HELP[record.key] ? (
        <Typography.Paragraph type="secondary">
          {KEY_HELP[record.key]}
        </Typography.Paragraph>
      ) : null}
      <Typography.Title level={5}>Value</Typography.Title>
      <NumberField value={record?.value} />
      <Typography.Title level={5}>Status</Typography.Title>
      <StatusTag value={record?.status} />
      <Typography.Title level={5}>Last updated</Typography.Title>
      <DateField value={record?.updated_at} />
    </Show>
  );
}
