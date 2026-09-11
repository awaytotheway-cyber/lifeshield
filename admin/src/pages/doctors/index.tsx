import {
  Create,
  Edit,
  List,
  Show,
  useForm,
  useSelect,
  useTable,
} from "@refinedev/antd";
import { BooleanField, DateField, NumberField, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Form, Input, InputNumber, Select, Switch, Table, Typography } from "antd";

import {
  StatusChip,
  booleanActiveChip,
} from "../../components/StatusChip";

type DoctorRecord = {
  id: string;
  name: string;
  auth_user_id?: string;
  qualifications?: string;
  specialty?: string;
  clinic_id?: string;
  can_sign_off?: boolean;
  consultation_fee?: number;
  active?: boolean;
  created_at?: string;
};

/** List practitioners linked to clinics. */
export function DoctorList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "name", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column dataIndex="specialty" title="Specialty" />
        <Table.Column dataIndex="clinic_id" title="Clinic ID" />
        <Table.Column
          dataIndex="can_sign_off"
          title="Can sign off"
          render={(value: boolean) =>
            value ? (
              <StatusChip kind="approved">Can sign off</StatusChip>
            ) : (
              <StatusChip kind="draft">View only</StatusChip>
            )
          }
        />
        <Table.Column
          dataIndex="active"
          title="Active"
          render={(value: boolean) => {
            const chip = booleanActiveChip(value);
            return <StatusChip kind={chip.kind}>{chip.label}</StatusChip>;
          }}
        />
      </Table>
    </List>
  );
}

function DoctorFormFields() {
  const { selectProps: clinicSelectProps } = useSelect({
    resource: "clinics",
    optionLabel: "name",
    optionValue: "id",
  });

  return (
    <>
      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: "Name is required" }]}
      >
        <Input />
      </Form.Item>
      <Form.Item
        label="Auth user id (optional)"
        name="auth_user_id"
        tooltip="UUID from Supabase Authentication — links this doctor to a login"
      >
        <Input placeholder="00000000-0000-0000-0000-000000000000" />
      </Form.Item>
      <Form.Item label="Qualifications" name="qualifications">
        <Input />
      </Form.Item>
      <Form.Item label="Specialty" name="specialty">
        <Input />
      </Form.Item>
      <Form.Item label="Clinic" name="clinic_id">
        <Select {...clinicSelectProps} allowClear placeholder="Select a clinic" />
      </Form.Item>
      <Form.Item
        label="Can sign off plans"
        name="can_sign_off"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item label="Consultation fee" name="consultation_fee">
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Active" name="active" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
}

export function DoctorCreate() {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical" initialValues={{ active: true }}>
        <DoctorFormFields />
      </Form>
    </Create>
  );
}

export function DoctorEdit() {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <DoctorFormFields />
      </Form>
    </Edit>
  );
}

export function DoctorShow() {
  const { query } = useShow<DoctorRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Name</Typography.Title>
      <TextField value={record?.name} />
      <Typography.Title level={5}>Auth user id</Typography.Title>
      <TextField value={record?.auth_user_id} />
      <Typography.Title level={5}>Qualifications</Typography.Title>
      <TextField value={record?.qualifications} />
      <Typography.Title level={5}>Specialty</Typography.Title>
      <TextField value={record?.specialty} />
      <Typography.Title level={5}>Clinic id</Typography.Title>
      <TextField value={record?.clinic_id} />
      <Typography.Title level={5}>Can sign off</Typography.Title>
      <BooleanField value={record?.can_sign_off} />
      <Typography.Title level={5}>Consultation fee</Typography.Title>
      <NumberField value={record?.consultation_fee} />
      <Typography.Title level={5}>Active</Typography.Title>
      <BooleanField value={record?.active} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
    </Show>
  );
}
