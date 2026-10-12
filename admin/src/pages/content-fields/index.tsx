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
import { usePermissions, useShow } from "@refinedev/core";
import {
  Alert,
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Tag,
  Typography,
} from "antd";
import { Navigate } from "react-router-dom";

import { canEditClinicalThresholds } from "../../utility/canEditClinicalThresholds";

type ContentOption = { value: string; label: string };

type ContentFieldRecord = {
  id: string;
  section: string;
  field_key: string;
  label: string;
  help_text?: string | null;
  field_type: string;
  options?: ContentOption[];
  sort_order: number;
  required: boolean;
  is_locked: boolean;
  locked_reason?: string | null;
  is_active: boolean;
  updated_at?: string;
};

const SECTIONS = [
  { label: "1. Demographics", value: "demographics" },
  { label: "2. Reproductive & menstrual", value: "reproductive_menstrual" },
  { label: "3. Radiation & occupation", value: "radiation_occupational" },
  { label: "4. Other conditions", value: "comorbidities" },
  { label: "5. Family history", value: "family_history" },
  { label: "6. Personal history", value: "personal_history" },
  { label: "7. Lifestyle", value: "lifestyle" },
  { label: "8. Stress", value: "stress" },
  { label: "9. Diet & environment", value: "diet_environment" },
  { label: "10. Prior screening", value: "prior_screening" },
];

const FIELD_TYPES = [
  { label: "Yes / No", value: "yes_no" },
  { label: "Yes / No / Not sure", value: "yes_no_unsure" },
  { label: "Choose one", value: "single_select" },
  { label: "Choose several", value: "multi_select" },
  { label: "Short text", value: "text" },
  { label: "Number", value: "number" },
];

function useCanEdit() {
  const { data: role } = usePermissions<string>({});
  return canEditClinicalThresholds(role);
}

function LockTag({ record }: { record: ContentFieldRecord }) {
  if (!record.is_locked) {
    return <Tag color="green">Added by admin</Tag>;
  }
  const clinical = (record.locked_reason ?? "").startsWith("rules engine");
  const safety = (record.locked_reason ?? "").startsWith("SAFETY");
  if (safety) {
    return <Tag color="red">Safety rule</Tag>;
  }
  return <Tag color={clinical ? "orange" : "default"}>
    {clinical ? "Feeds a test rule" : "Built in"}
  </Tag>;
}

/**
 * Questions shown in the mobile questionnaire.
 *
 * Built-in rows ship with the app: their wording is editable here, their
 * structure is frozen by a database trigger. Rows you add render in the app
 * under "Additional questions" and are fully editable.
 */
export function ContentFieldList() {
  const canEdit = useCanEdit();
  const { tableProps } = useTable<ContentFieldRecord>({
    syncWithLocation: true,
    sorters: {
      initial: [
        { field: "section", order: "asc" },
        { field: "sort_order", order: "asc" },
      ],
    },
  });

  return (
    <List title="Questionnaire questions" canCreate={canEdit}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Edits reach the app within about 5 minutes"
        description="The app re-reads this list every 5 minutes and whenever someone reopens it. If this database is unreachable the app falls back to the wording built into the release, so a change here can never blank out a question."
      />
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="Some questions are locked"
        description={
          <>
            Questions tagged <Tag color="orange">Feeds a test rule</Tag> or{" "}
            <Tag color="red">Safety rule</Tag> are read by the clinical rules
            engine by name. You can reword them and rename their answer
            options, but the key, answer type, and option values are frozen —
            changing those would silently stop a test recommendation (or a
            safety block) from firing. The database rejects those edits.
          </>
        }
      />

      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column
          dataIndex="section"
          title="Section"
          width={200}
          render={(value: string) =>
            SECTIONS.find((s) => s.value === value)?.label ?? value
          }
        />
        <Table.Column dataIndex="label" title="Question" />
        <Table.Column
          dataIndex="field_type"
          title="Answer type"
          width={150}
          render={(value: string) =>
            FIELD_TYPES.find((t) => t.value === value)?.label ?? value
          }
        />
        <Table.Column
          title="Kind"
          width={150}
          render={(_, record: ContentFieldRecord) => <LockTag record={record} />}
        />
        <Table.Column dataIndex="sort_order" title="Order" width={80} />
        <Table.Column
          title="Actions"
          width={110}
          render={(_, record: ContentFieldRecord) => (
            <Space>
              <ShowButton hideText size="small" recordItemId={record.id} />
              {canEdit ? (
                <EditButton hideText size="small" recordItemId={record.id} />
              ) : null}
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

function OptionsField() {
  return (
    <Form.List name="options">
      {(fields, { add, remove }) => (
        <>
          {fields.map((field) => (
            <Space key={field.key} align="baseline" style={{ display: "flex" }}>
              <Form.Item
                {...field}
                name={[field.name, "value"]}
                label="Stored value"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="yes" />
              </Form.Item>
              <Form.Item
                {...field}
                name={[field.name, "label"]}
                label="Shown to patient"
                rules={[{ required: true, message: "Required" }]}
              >
                <Input placeholder="Yes" />
              </Form.Item>
              <Typography.Link onClick={() => remove(field.name)}>
                Remove
              </Typography.Link>
            </Space>
          ))}
          <Form.Item>
            <Typography.Link onClick={() => add()}>+ Add option</Typography.Link>
          </Form.Item>
        </>
      )}
    </Form.List>
  );
}

export function ContentFieldCreate() {
  const canEdit = useCanEdit();
  const { formProps, saveButtonProps } = useForm<ContentFieldRecord>();

  if (!canEdit) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <Create title="Add a question" saveButtonProps={saveButtonProps}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="New questions render under “Additional questions”"
        description="The app shows questions you add at the end of the section you choose. Answers are saved with the rest of that section but are not read by the clinical rules engine — they are for information only."
      />
      <Form {...formProps} layout="vertical" initialValues={{ sort_order: 100, required: false, is_active: true, options: [] }}>
        <Form.Item label="Section" name="section" rules={[{ required: true }]}>
          <Select options={SECTIONS} />
        </Form.Item>
        <Form.Item
          label="Field key"
          name="field_key"
          rules={[
            { required: true },
            {
              pattern: /^[a-z0-9_]+$/,
              message: "Lower case letters, numbers and underscores only",
            },
          ]}
          extra="Internal name for this answer. Cannot be changed later."
        >
          <Input placeholder="e.g. uses_well_water" />
        </Form.Item>
        <Form.Item label="Question" name="label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Helper text" name="help_text">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Answer type" name="field_type" rules={[{ required: true }]}>
          <Select options={FIELD_TYPES} />
        </Form.Item>
        <Typography.Paragraph type="secondary">
          Options — only used by “Choose one” and “Choose several”.
        </Typography.Paragraph>
        <OptionsField />
        <Form.Item label="Order in section" name="sort_order">
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item label="Required" name="required" valuePropName="checked">
          <Switch />
        </Form.Item>
        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
}

export function ContentFieldEdit() {
  const canEdit = useCanEdit();
  const { formProps, saveButtonProps, query } =
    useForm<ContentFieldRecord>();
  const record = query?.data?.data;
  const locked = Boolean(record?.is_locked);

  if (!canEdit) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <Edit title="Edit question" saveButtonProps={saveButtonProps}>
      {locked ? (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 16 }}
          message="This question is built into the app"
          description={
            <>
              <div>
                You can change the wording and the option labels. The field
                key, answer type, option values, and active state are frozen.
              </div>
              {record?.locked_reason ? (
                <div style={{ marginTop: 8 }}>
                  <strong>Why: </strong>
                  {record.locked_reason}
                </div>
              ) : null}
            </>
          }
        />
      ) : null}

      <Form {...formProps} layout="vertical">
        <Form.Item label="Section" name="section">
          <Select options={SECTIONS} disabled={locked} />
        </Form.Item>
        <Form.Item label="Field key" name="field_key">
          <Input disabled={locked} />
        </Form.Item>
        <Form.Item label="Question" name="label" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Helper text" name="help_text">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="Answer type" name="field_type">
          <Select options={FIELD_TYPES} disabled={locked} />
        </Form.Item>
        <Typography.Paragraph type="secondary">
          {locked
            ? "You may reword each option. Stored values are frozen."
            : "Options — only used by “Choose one” and “Choose several”."}
        </Typography.Paragraph>
        <Form.List name="options">
          {(fields, { add, remove }) => (
            <>
              {fields.map((field) => (
                <Space key={field.key} align="baseline" style={{ display: "flex" }}>
                  <Form.Item {...field} name={[field.name, "value"]} label="Stored value">
                    <Input disabled={locked} />
                  </Form.Item>
                  <Form.Item {...field} name={[field.name, "label"]} label="Shown to patient">
                    <Input />
                  </Form.Item>
                  {locked ? null : (
                    <Typography.Link onClick={() => remove(field.name)}>
                      Remove
                    </Typography.Link>
                  )}
                </Space>
              ))}
              {locked ? null : (
                <Form.Item>
                  <Typography.Link onClick={() => add()}>
                    + Add option
                  </Typography.Link>
                </Form.Item>
              )}
            </>
          )}
        </Form.List>
        <Form.Item label="Order in section" name="sort_order">
          <InputNumber min={0} />
        </Form.Item>
        <Form.Item label="Required" name="required" valuePropName="checked">
          <Switch disabled={locked} />
        </Form.Item>
        <Form.Item label="Active" name="is_active" valuePropName="checked">
          <Switch disabled={locked} />
        </Form.Item>
      </Form>
    </Edit>
  );
}

export function ContentFieldShow() {
  const { query } = useShow<ContentFieldRecord>();
  const record = query?.data?.data;

  return (
    <Show title="Question" isLoading={query?.isLoading}>
      <Typography.Title level={5}>Question</Typography.Title>
      <Typography.Text>{record?.label ?? "—"}</Typography.Text>

      <Typography.Title level={5}>Section</Typography.Title>
      <Typography.Text>
        {SECTIONS.find((s) => s.value === record?.section)?.label ??
          record?.section ??
          "—"}
      </Typography.Text>

      <Typography.Title level={5}>Field key</Typography.Title>
      <Typography.Text code>{record?.field_key ?? "—"}</Typography.Text>

      <Typography.Title level={5}>Answer type</Typography.Title>
      <Typography.Text>
        {FIELD_TYPES.find((t) => t.value === record?.field_type)?.label ??
          record?.field_type ??
          "—"}
      </Typography.Text>

      <Typography.Title level={5}>Kind</Typography.Title>
      {record ? <LockTag record={record} /> : null}

      {record?.locked_reason ? (
        <>
          <Typography.Title level={5}>Why it is locked</Typography.Title>
          <Typography.Text>{record.locked_reason}</Typography.Text>
        </>
      ) : null}

      <Typography.Title level={5}>Options</Typography.Title>
      {record?.options?.length ? (
        <ul>
          {record.options.map((option: ContentOption) => (
            <li key={option.value}>
              <Typography.Text code>{option.value}</Typography.Text> —{" "}
              {option.label}
            </li>
          ))}
        </ul>
      ) : (
        <Typography.Text>—</Typography.Text>
      )}
    </Show>
  );
}
