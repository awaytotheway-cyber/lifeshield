import {
  Create,
  Edit,
  EditButton,
  List,
  useForm,
  useTable,
} from "@refinedev/antd";
import { usePermissions } from "@refinedev/core";
import { Alert, Form, Input, Space, Switch, Table, Tag } from "antd";
import { Navigate } from "react-router-dom";

import { canEditClinicalThresholds } from "../../utility/canEditClinicalThresholds";

type AppCopyRecord = {
  copy_key: string;
  value: string;
  description?: string | null;
  is_regulatory: boolean;
  updated_at?: string;
};

function useCanEdit() {
  const { data: role } = usePermissions<string>({});
  return canEditClinicalThresholds(role);
}

/** Onboarding and shared screen text, keyed to lib/copy.ts. */
export function AppCopyList() {
  const canEdit = useCanEdit();
  const { tableProps } = useTable<AppCopyRecord>({
    syncWithLocation: true,
    sorters: { initial: [{ field: "copy_key", order: "asc" }] },
  });

  return (
    <List title="Onboarding copy" canCreate={canEdit}>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Edits reach the app within about 5 minutes"
        description="Each row overrides one piece of text in the app. Clear a value and the app falls back to the wording built into the release."
      />
      <Table {...tableProps} rowKey="copy_key" scroll={{ x: true }}>
        <Table.Column dataIndex="copy_key" title="Key" width={200} />
        <Table.Column dataIndex="value" title="Text shown to patient" />
        <Table.Column dataIndex="description" title="Where it appears" />
        <Table.Column
          dataIndex="is_regulatory"
          title=""
          width={130}
          render={(value: boolean) =>
            value ? <Tag color="red">Regulatory</Tag> : null
          }
        />
        <Table.Column
          title="Actions"
          width={90}
          render={(_, record: AppCopyRecord) => (
            <Space>
              {canEdit ? (
                <EditButton
                  hideText
                  size="small"
                  recordItemId={record.copy_key}
                />
              ) : null}
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

export function AppCopyCreate() {
  const canEdit = useCanEdit();
  const { formProps, saveButtonProps } = useForm<AppCopyRecord>();

  if (!canEdit) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <Create title="Add copy override" saveButtonProps={saveButtonProps}>
      <Alert
        type="warning"
        showIcon
        style={{ marginBottom: 16 }}
        message="The key must match one the app looks up"
        description="A key the app never asks for has no effect. Existing keys include welcomeTitle, welcomeBody, welcomeContinue and tagline."
      />
      <Form {...formProps} layout="vertical" initialValues={{ is_regulatory: false }}>
        <Form.Item label="Key" name="copy_key" rules={[{ required: true }]}>
          <Input placeholder="welcomeTitle" />
        </Form.Item>
        <Form.Item label="Text" name="value" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="Where it appears" name="description">
          <Input />
        </Form.Item>
        <Form.Item
          label="Regulatory text"
          name="is_regulatory"
          valuePropName="checked"
          extra="Flags this row so editors know the wording has compliance weight."
        >
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
}

export function AppCopyEdit() {
  const canEdit = useCanEdit();
  const { formProps, saveButtonProps, query } = useForm<AppCopyRecord>();
  const record = query?.data?.data;

  if (!canEdit) {
    return <Navigate to="/unauthorized" replace />;
  }

  return (
    <Edit title="Edit copy" saveButtonProps={saveButtonProps}>
      {record?.is_regulatory ? (
        <Alert
          type="error"
          showIcon
          style={{ marginBottom: 16 }}
          message="This is regulatory wording"
          description="This text states what the product is and is not. Have the responsible clinician or governance lead approve any change before saving."
        />
      ) : null}
      <Form {...formProps} layout="vertical">
        <Form.Item label="Key" name="copy_key">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Text" name="value" rules={[{ required: true }]}>
          <Input.TextArea rows={4} />
        </Form.Item>
        <Form.Item label="Where it appears" name="description">
          <Input />
        </Form.Item>
        <Form.Item
          label="Regulatory text"
          name="is_regulatory"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
}
