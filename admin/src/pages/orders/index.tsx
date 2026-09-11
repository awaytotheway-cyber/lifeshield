import { Edit, List, Show, useForm, useTable } from "@refinedev/antd";
import { DateField, NumberField, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Form, Input, Select, Table, Typography } from "antd";

import {
  StatusChip,
  fulfilmentChipKind,
  paymentChipKind,
} from "../../components/StatusChip";

type OrderRecord = {
  id: string;
  user_id: string;
  total_amount: number;
  currency?: string;
  payment_status?: string;
  payment_provider?: string;
  payment_ref?: string;
  fulfilment_status?: string;
  created_at?: string;
};

const FULFILMENT_STATUSES = [
  { label: "Awaiting payment", value: "awaiting_payment" },
  { label: "Processing", value: "processing" },
  { label: "Shipped", value: "shipped" },
  { label: "Delivered", value: "delivered" },
  { label: "Sample collected", value: "sample_collected" },
  { label: "Cancelled", value: "cancelled" },
];

const PAYMENT_STATUSES = [
  { label: "Pending", value: "pending" },
  { label: "Paid", value: "paid" },
  { label: "Failed", value: "failed" },
  { label: "Refunded", value: "refunded" },
];

/** All store orders — admin can open and update fulfilment. */
export function OrderList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="id" title="Order ID" width={280} />
        <Table.Column dataIndex="user_id" title="Patient user id" width={280} />
        <Table.Column
          dataIndex="total_amount"
          title="Total"
          render={(value: number, record: OrderRecord) =>
            `${record.currency ?? "INR"} ${value}`
          }
        />
        <Table.Column
          dataIndex="payment_status"
          title="Payment"
          render={(value: string) => (
            <StatusChip kind={paymentChipKind(value)}>{value ?? "—"}</StatusChip>
          )}
        />
        <Table.Column
          dataIndex="fulfilment_status"
          title="Fulfilment"
          render={(value: string) => (
            <StatusChip kind={fulfilmentChipKind(value)}>
              {value ?? "—"}
            </StatusChip>
          )}
        />
        <Table.Column
          dataIndex="created_at"
          title="Created"
          render={(value: string) =>
            value ? new Date(value).toLocaleString() : "—"
          }
        />
      </Table>
    </List>
  );
}

/**
 * Edit fulfilment (and payment status for support).
 * Other fields are read-only on this screen.
 */
export function OrderEdit() {
  const { formProps, saveButtonProps, query } = useForm<OrderRecord>();

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={query?.isLoading}>
      <Form {...formProps} layout="vertical">
        <Form.Item label="Order ID" name="id">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Patient user id" name="user_id">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Total amount" name="total_amount">
          <Input disabled addonBefore={formProps.initialValues?.currency ?? "INR"} />
        </Form.Item>
        <Form.Item label="Payment status" name="payment_status">
          <Select options={PAYMENT_STATUSES} />
        </Form.Item>
        <Form.Item
          label="Fulfilment status"
          name="fulfilment_status"
          rules={[{ required: true }]}
        >
          <Select options={FULFILMENT_STATUSES} />
        </Form.Item>
        <Form.Item label="Payment provider" name="payment_provider">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Payment reference" name="payment_ref">
          <Input disabled />
        </Form.Item>
      </Form>
    </Edit>
  );
}

export function OrderShow() {
  const { query } = useShow<OrderRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Order ID</Typography.Title>
      <TextField value={record?.id} />
      <Typography.Title level={5}>Patient user id</Typography.Title>
      <TextField value={record?.user_id} />
      <Typography.Title level={5}>Total</Typography.Title>
      <NumberField value={record?.total_amount} />
      <Typography.Title level={5}>Currency</Typography.Title>
      <TextField value={record?.currency} />
      <Typography.Title level={5}>Payment status</Typography.Title>
      <TextField value={record?.payment_status} />
      <Typography.Title level={5}>Fulfilment status</Typography.Title>
      <TextField value={record?.fulfilment_status} />
      <Typography.Title level={5}>Payment provider</Typography.Title>
      <TextField value={record?.payment_provider} />
      <Typography.Title level={5}>Payment reference</Typography.Title>
      <TextField value={record?.payment_ref} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
    </Show>
  );
}
