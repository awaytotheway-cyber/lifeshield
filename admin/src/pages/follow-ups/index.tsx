import {
  Create,
  Edit,
  EditButton,
  List,
  useForm,
  useTable,
} from "@refinedev/antd";
import { Alert, Form, Input, Select, Space, Table } from "antd";

import { StatusChip } from "../../components/StatusChip";

/**
 * Follow-ups — where a reviewer sets WHEN a patient is re-checked.
 *
 * The protocol re-checks the markers that were abnormal, at an interval set at
 * review. The app proposes a re-test for each abnormal marker with a default
 * interval; a re-test added here, with the same title ("Re-test: <marker>"),
 * is left alone by the app, so the date chosen at review is the one the
 * patient sees. Owner / admin staff can write; clinicians can read.
 */

type FollowUpRecord = {
  id: string;
  user_id: string;
  type: "retest" | "review" | "symptom_check" | "coaching";
  title: string;
  plain_note: string | null;
  due_date: string;
  status: "pending" | "completed" | "missed" | "rescheduled";
  created_at?: string;
};

const TYPE_OPTIONS = [
  { value: "retest", label: "Re-test" },
  { value: "review", label: "Review" },
  { value: "coaching", label: "Check-in" },
];

const STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "completed", label: "Completed" },
  { value: "missed", label: "Missed" },
  { value: "rescheduled", label: "Rescheduled" },
];

export function FollowUpList() {
  const { tableProps } = useTable<FollowUpRecord>({
    syncWithLocation: true,
    sorters: { initial: [{ field: "due_date", order: "asc" }] },
  });

  return (
    <List title="Follow-ups">
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="title" title="Title" />
        <Table.Column dataIndex="type" title="Type" />
        <Table.Column dataIndex="due_date" title="Due" />
        <Table.Column
          dataIndex="status"
          title="Status"
          render={(status: string) => (
            <StatusChip kind={status === "completed" ? "success" : "active"}>
              {status}
            </StatusChip>
          )}
        />
        <Table.Column
          dataIndex="user_id"
          title="Patient"
          width={280}
          render={(value: string) =>
            value ? <code style={{ fontSize: 11 }}>{value}</code> : "—"
          }
        />
        <Table.Column
          dataIndex="plain_note"
          title="Note"
          render={(value: string | null) => value ?? "—"}
        />
        <Table.Column
          dataIndex="actions"
          title="Actions"
          fixed="right"
          width={100}
          render={(_: unknown, record: FollowUpRecord) => (
            <Space size="small">
              <EditButton size="small" recordItemId={record.id} />
            </Space>
          )}
        />
      </Table>
    </List>
  );
}

export function FollowUpCreate() {
  const { formProps, saveButtonProps } = useForm<FollowUpRecord>();

  return (
    <Create saveButtonProps={saveButtonProps} title="Add a follow-up">
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="Use the same title the app uses for a re-test"
        description="For a re-test of one marker, title it “Re-test: <the marker's everyday name>”. The app then keeps your date instead of proposing its own default."
      />
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{ type: "retest", status: "pending" }}
      >
        <Form.Item
          label="Patient (profile id)"
          name="user_id"
          rules={[{ required: true }]}
        >
          <Input placeholder="00000000-0000-0000-0000-000000000000" />
        </Form.Item>
        <Form.Item label="Type" name="type" rules={[{ required: true }]}>
          <Select options={TYPE_OPTIONS} />
        </Form.Item>
        <Form.Item label="Title" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Due date" name="due_date" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item label="Note shown to the patient" name="plain_note">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Create>
  );
}

export function FollowUpEdit() {
  const { formProps, saveButtonProps } = useForm<FollowUpRecord>({
    redirect: "list",
  });

  return (
    <Edit saveButtonProps={saveButtonProps} title="Edit follow-up">
      <Form {...formProps} layout="vertical">
        <Form.Item label="Title" name="title" rules={[{ required: true }]}>
          <Input />
        </Form.Item>
        <Form.Item label="Due date" name="due_date" rules={[{ required: true }]}>
          <Input type="date" />
        </Form.Item>
        <Form.Item label="Note shown to the patient" name="plain_note">
          <Input.TextArea rows={3} />
        </Form.Item>
        <Form.Item label="Status" name="status">
          <Select options={STATUS_OPTIONS} />
        </Form.Item>
      </Form>
    </Edit>
  );
}
