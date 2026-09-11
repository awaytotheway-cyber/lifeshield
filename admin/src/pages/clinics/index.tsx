import {
  Create,
  Edit,
  List,
  Show,
  useForm,
  useTable,
} from "@refinedev/antd";
import { BooleanField, DateField, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Form, Input, Switch, Table, Typography } from "antd";

import {
  StatusChip,
  booleanActiveChip,
} from "../../components/StatusChip";

type ClinicRecord = {
  id: string;
  name: string;
  address?: string;
  city?: string;
  phone?: string;
  email?: string;
  offers_home_collection?: boolean;
  operating_hours?: string;
  active?: boolean;
  created_at?: string;
};

/** List all clinics. */
export function ClinicList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "name", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id">
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column dataIndex="city" title="City" />
        <Table.Column dataIndex="phone" title="Phone" />
        <Table.Column
          dataIndex="offers_home_collection"
          title="Home collection"
          render={(value: boolean) =>
            value ? (
              <StatusChip kind="info">Home collection</StatusChip>
            ) : (
              <StatusChip kind="inactive">Clinic only</StatusChip>
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

/** Create a new clinic. */
export function ClinicCreate() {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Address" name="address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="City" name="city">
          <Input />
        </Form.Item>
        <Form.Item label="Phone" name="phone">
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input type="email" />
        </Form.Item>
        <Form.Item
          label="Offers home collection"
          name="offers_home_collection"
          valuePropName="checked"
          initialValue={false}
        >
          <Switch />
        </Form.Item>
        <Form.Item label="Operating hours" name="operating_hours">
          <Input placeholder="e.g. Mon–Fri 8am–6pm" />
        </Form.Item>
        <Form.Item
          label="Active"
          name="active"
          valuePropName="checked"
          initialValue={true}
        >
          <Switch />
        </Form.Item>
      </Form>
    </Create>
  );
}

/** Edit an existing clinic. */
export function ClinicEdit() {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <Form.Item
          label="Name"
          name="name"
          rules={[{ required: true, message: "Name is required" }]}
        >
          <Input />
        </Form.Item>
        <Form.Item label="Address" name="address">
          <Input.TextArea rows={2} />
        </Form.Item>
        <Form.Item label="City" name="city">
          <Input />
        </Form.Item>
        <Form.Item label="Phone" name="phone">
          <Input />
        </Form.Item>
        <Form.Item label="Email" name="email">
          <Input type="email" />
        </Form.Item>
        <Form.Item
          label="Offers home collection"
          name="offers_home_collection"
          valuePropName="checked"
        >
          <Switch />
        </Form.Item>
        <Form.Item label="Operating hours" name="operating_hours">
          <Input />
        </Form.Item>
        <Form.Item label="Active" name="active" valuePropName="checked">
          <Switch />
        </Form.Item>
      </Form>
    </Edit>
  );
}

/** Read-only clinic details. */
export function ClinicShow() {
  const { query } = useShow<ClinicRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Name</Typography.Title>
      <TextField value={record?.name} />
      <Typography.Title level={5}>Address</Typography.Title>
      <TextField value={record?.address} />
      <Typography.Title level={5}>City</Typography.Title>
      <TextField value={record?.city} />
      <Typography.Title level={5}>Phone</Typography.Title>
      <TextField value={record?.phone} />
      <Typography.Title level={5}>Email</Typography.Title>
      <TextField value={record?.email} />
      <Typography.Title level={5}>Home collection</Typography.Title>
      <BooleanField value={record?.offers_home_collection} />
      <Typography.Title level={5}>Operating hours</Typography.Title>
      <TextField value={record?.operating_hours} />
      <Typography.Title level={5}>Active</Typography.Title>
      <BooleanField value={record?.active} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
    </Show>
  );
}