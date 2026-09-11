import { List, Show, useTable } from "@refinedev/antd";
import { DateField, NumberField, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { Table, Typography } from "antd";

type OrderItemRecord = {
  id: string;
  order_id: string;
  product_id?: string;
  product_name: string;
  unit_price: number;
  quantity: number;
  created_at?: string;
};

/** Line items for packing/shipping — read-only on Day 2. */
export function OrderItemList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List title="Order line items">
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="order_id" title="Order ID" width={280} />
        <Table.Column dataIndex="product_name" title="Product" />
        <Table.Column dataIndex="unit_price" title="Unit price" />
        <Table.Column dataIndex="quantity" title="Qty" />
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

export function OrderItemShow() {
  const { query } = useShow<OrderItemRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Line item ID</Typography.Title>
      <TextField value={record?.id} />
      <Typography.Title level={5}>Order ID</Typography.Title>
      <TextField value={record?.order_id} />
      <Typography.Title level={5}>Product ID</Typography.Title>
      <TextField value={record?.product_id} />
      <Typography.Title level={5}>Product name</Typography.Title>
      <TextField value={record?.product_name} />
      <Typography.Title level={5}>Unit price</Typography.Title>
      <NumberField value={record?.unit_price} />
      <Typography.Title level={5}>Quantity</Typography.Title>
      <NumberField value={record?.quantity} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
    </Show>
  );
}
