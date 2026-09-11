import { Edit, List, Show, useForm, useTable } from "@refinedev/antd";
import { DateField, TextField } from "@refinedev/antd";
import { useShow } from "@refinedev/core";
import { App, Form, Input, Select, Table, Typography } from "antd";
import { useNavigate } from "react-router-dom";

import {
  StatusChip,
  labOrderChipKind,
} from "../../components/StatusChip";
import { updateLabOrderStatus } from "../../utility/updateLabOrderStatus";

type LabOrderRecord = {
  id: string;
  user_id: string;
  store_order_id?: string | null;
  order_item_id?: string | null;
  test_order_id?: string | null;
  lab_provider?: string | null;
  external_order_id?: string | null;
  status?: string;
  created_at?: string;
  updated_at?: string;
};

const LAB_STATUSES = [
  { label: "Waiting for manual fulfilment", value: "pending_manual" },
  { label: "Lab order created", value: "created" },
  { label: "Kit dispatched", value: "kit_dispatched" },
  { label: "Sample received", value: "sample_received" },
  { label: "Processing", value: "processing" },
  { label: "Results ready", value: "resulted" },
  { label: "Cancelled", value: "cancelled" },
];

function statusLabel(value: string | undefined): string {
  const match = LAB_STATUSES.find((row) => row.value === value);
  return match?.label ?? value ?? "—";
}

/** Lab fulfilment rows — created after a patient pays for a test. */
export function LabOrderList() {
  const { tableProps } = useTable({
    syncWithLocation: true,
    sorters: { initial: [{ field: "created_at", order: "desc" }] },
  });

  return (
    <List>
      <Typography.Paragraph type="secondary">
        Created automatically when a patient pays for a test. Move status forward
        as you dispatch kits and receive samples. Manual tracking only — no
        courier API yet.
      </Typography.Paragraph>
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="id" title="Lab order ID" width={280} />
        <Table.Column dataIndex="user_id" title="Patient user id" width={280} />
        <Table.Column dataIndex="store_order_id" title="Store order" width={280} />
        <Table.Column dataIndex="lab_provider" title="Provider" />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(value: string) => (
            <StatusChip kind={labOrderChipKind(value)}>
              {statusLabel(value)}
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

/** Update fulfilment status (Edge Function or SQL fallback). */
export function LabOrderEdit() {
  const { message } = App.useApp();
  const navigate = useNavigate();
  const { formProps, saveButtonProps, query } = useForm<LabOrderRecord>({
    redirect: false,
    successNotification: false,
  });

  const { onFinish: _refineSave, ...restFormProps } = formProps;

  const handleFinish = async (values: LabOrderRecord) => {
    if (!values.id || !values.status) {
      return;
    }
    const result = await updateLabOrderStatus(values.id, values.status);
    if (!result.ok) {
      message.error(result.message);
      return;
    }
    message.success(`Status updated to ${statusLabel(result.status)}`);
    navigate(`/lab-orders/show/${values.id}`);
  };

  return (
    <Edit saveButtonProps={saveButtonProps} isLoading={query?.isLoading}>
      <Form
        {...restFormProps}
        layout="vertical"
        onFinish={(values) => {
          void handleFinish(values as LabOrderRecord);
        }}
      >
        <Form.Item label="Lab order ID" name="id">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Patient user id" name="user_id">
          <Input disabled />
        </Form.Item>
        <Form.Item label="Store order" name="store_order_id">
          <Input disabled />
        </Form.Item>
        <Form.Item label="External reference" name="external_order_id">
          <Input disabled />
        </Form.Item>
        <Form.Item
          label="Fulfilment status"
          name="status"
          rules={[{ required: true, message: "Pick a status" }]}
        >
          <Select options={LAB_STATUSES} />
        </Form.Item>
      </Form>
    </Edit>
  );
}

export function LabOrderShow() {
  const { query } = useShow<LabOrderRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Lab order ID</Typography.Title>
      <TextField value={record?.id} />
      <Typography.Title level={5}>Patient user id</Typography.Title>
      <TextField value={record?.user_id} />
      <Typography.Title level={5}>Store order</Typography.Title>
      <TextField value={record?.store_order_id} />
      <Typography.Title level={5}>Order line</Typography.Title>
      <TextField value={record?.order_item_id} />
      <Typography.Title level={5}>Test recommendation</Typography.Title>
      <TextField value={record?.test_order_id} />
      <Typography.Title level={5}>Lab provider</Typography.Title>
      <TextField value={record?.lab_provider} />
      <Typography.Title level={5}>External reference</Typography.Title>
      <TextField value={record?.external_order_id} />
      <Typography.Title level={5}>Status</Typography.Title>
      <StatusChip kind={labOrderChipKind(record?.status)}>
        {statusLabel(record?.status)}
      </StatusChip>
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
      <Typography.Title level={5}>Updated</Typography.Title>
      <DateField value={record?.updated_at} />
    </Show>
  );
}
