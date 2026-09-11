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
  Form,
  Input,
  InputNumber,
  Select,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";

import {
  StatusChip,
  booleanActiveChip,
} from "../../components/StatusChip";

type ProductRecord = {
  id: string;
  product_type: "supplement" | "test";
  plain_name: string;
  plain_description?: string;
  clinical_name: string;
  linked_finding?: string;
  test_tier?: number;
  price: number;
  currency?: string;
  requires_consent?: boolean;
  active?: boolean;
  created_at?: string;
};

const PRODUCT_TYPES = [
  { label: "Supplement", value: "supplement" },
  { label: "Test", value: "test" },
];

const TEST_TIERS = [
  { label: "Tier 1", value: 1 },
  { label: "Tier 2", value: 2 },
  { label: "Tier 3", value: 3 },
  { label: "Tier 4", value: 4 },
];

/** Catalog of tests and supplements (Phase 3 products table). */
export function ProductList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "plain_name", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column
          dataIndex="product_type"
          title="Type"
          render={(value: string) => (
            <StatusChip kind="info">{value}</StatusChip>
          )}
        />
        <Table.Column dataIndex="plain_name" title="Plain name" sorter />
        <Table.Column dataIndex="clinical_name" title="Clinical name" />
        <Table.Column dataIndex="test_tier" title="Tier" />
        <Table.Column
          dataIndex="price"
          title="Price"
          render={(value: number, record: ProductRecord) =>
            `${record.currency ?? "INR"} ${value}`
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
        <Table.Column
          title="Actions"
          dataIndex="actions"
          fixed="right"
          width={160}
          render={(_, record: ProductRecord) => (
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

function ProductFormFields() {
  return (
    <>
      <Form.Item
        label="Product type"
        name="product_type"
        rules={[{ required: true }]}
      >
        <Select options={PRODUCT_TYPES} />
      </Form.Item>
      <Form.Item
        label="Plain name (patient-facing)"
        name="plain_name"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="Plain description" name="plain_description">
        <Input.TextArea rows={3} />
      </Form.Item>
      <Form.Item
        label="Clinical name (internal)"
        name="clinical_name"
        rules={[{ required: true }]}
      >
        <Input />
      </Form.Item>
      <Form.Item label="Linked finding" name="linked_finding">
        <Input />
      </Form.Item>
      <Form.Item label="Test tier (tests only)" name="test_tier">
        <Select options={TEST_TIERS} allowClear placeholder="Leave empty for supplements" />
      </Form.Item>
      <Form.Item
        label="Price"
        name="price"
        rules={[{ required: true, message: "Price is required" }]}
      >
        <InputNumber min={0} style={{ width: "100%" }} />
      </Form.Item>
      <Form.Item label="Currency" name="currency" initialValue="INR">
        <Input />
      </Form.Item>
      <Form.Item
        label="Requires consent"
        name="requires_consent"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
      <Form.Item label="Active in store" name="active" valuePropName="checked">
        <Switch />
      </Form.Item>
    </>
  );
}

export function ProductCreate() {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{ active: true, currency: "INR" }}
      >
        <ProductFormFields />
      </Form>
    </Create>
  );
}

/** Edit price, names, and active flag — main Day 2 verification path. */
export function ProductEdit() {
  const { formProps, saveButtonProps } = useForm();

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <ProductFormFields />
      </Form>
    </Edit>
  );
}

export function ProductShow() {
  const { query } = useShow<ProductRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Type</Typography.Title>
      <TextField value={record?.product_type} />
      <Typography.Title level={5}>Plain name</Typography.Title>
      <TextField value={record?.plain_name} />
      <Typography.Title level={5}>Description</Typography.Title>
      <TextField value={record?.plain_description} />
      <Typography.Title level={5}>Clinical name</Typography.Title>
      <TextField value={record?.clinical_name} />
      <Typography.Title level={5}>Linked finding</Typography.Title>
      <TextField value={record?.linked_finding} />
      <Typography.Title level={5}>Test tier</Typography.Title>
      <NumberField value={record?.test_tier} />
      <Typography.Title level={5}>Price</Typography.Title>
      <NumberField value={record?.price} />
      <Typography.Title level={5}>Currency</Typography.Title>
      <TextField value={record?.currency} />
      <Typography.Title level={5}>Requires consent</Typography.Title>
      <BooleanField value={record?.requires_consent} />
      <Typography.Title level={5}>Active</Typography.Title>
      <BooleanField value={record?.active} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
    </Show>
  );
}
