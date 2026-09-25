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
  Alert,
  Form,
  Input,
  InputNumber,
  Space,
  Switch,
  Table,
  Typography,
} from "antd";

import { StatusChip } from "../../components/StatusChip";

/**
 * Labs library CRUD (Phase D).
 *
 * Read by the mobile booking screen (app/(main)/(orders)/book.tsx) via
 * lib/labs-io. Rows land in lib/lab-search's proximity ranking; the two
 * denormalised columns country + postcode drive the tier score, so keep
 * them filled and canonical (ISO alpha-2, no whitespace in postcode).
 * The full address goes in the address jsonb for display; the mobile
 * detail view doesn't render it today but Phase L journey / bookings
 * history will.
 */

type LabRecord = {
  id: string;
  provider_code: string;
  name: string;
  address: unknown;
  postcode: string | null;
  country: string | null;
  price: number | null;
  currency: string;
  availability: unknown;
  contact: unknown;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export function LabList() {
  const { tableProps } = useTable<LabRecord>({
    syncWithLocation: true,
    sorters: {
      initial: [
        { field: "country", order: "asc" },
        { field: "name", order: "asc" },
      ],
    },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column
          dataIndex="provider_code"
          title="Provider"
          render={(value: string) => (
            <StatusChip kind="info">{value || "manual"}</StatusChip>
          )}
        />
        <Table.Column
          dataIndex="country"
          title="Country"
          sorter
          render={(value: string | null) =>
            value ? (
              <StatusChip kind="info">{value}</StatusChip>
            ) : (
              <StatusChip kind="inactive">—</StatusChip>
            )
          }
        />
        <Table.Column
          dataIndex="postcode"
          title="Postcode"
          render={(value: string | null) => value ?? "—"}
        />
        <Table.Column
          title="Price"
          render={(_: unknown, record: LabRecord) =>
            record.price !== null && record.price !== undefined
              ? `${record.currency} ${record.price}`
              : "—"
          }
        />
        <Table.Column
          dataIndex="active"
          title="Active"
          render={(value: boolean) =>
            value ? (
              <StatusChip kind="active">active</StatusChip>
            ) : (
              <StatusChip kind="inactive">hidden</StatusChip>
            )
          }
        />
        <Table.Column
          title="Actions"
          dataIndex="actions"
          fixed="right"
          width={160}
          render={(_: unknown, record: LabRecord) => (
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

// ---------- Form ----------

function jsonToText(value: unknown): string {
  if (value === null || value === undefined) return "";
  if (typeof value === "string") return value;
  try {
    return JSON.stringify(value, null, 2);
  } catch {
    return "";
  }
}

function textToJson(text: string, fallback: unknown): unknown {
  const trimmed = (text ?? "").trim();
  if (!trimmed) return fallback;
  return JSON.parse(trimmed);
}

function LabFormFields() {
  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="How the mobile app uses these"
        description={
          <>
            <code>country</code> (ISO alpha-2, uppercase — IN / GB / US) plus{" "}
            <code>postcode</code> drive proximity ranking in lib/lab-search.
            Leave both blank for a mail-in / country-wide lab that shows for
            everyone. <code>address</code> is a jsonb like{" "}
            <code>{`{ "street": "...", "city": "...", "region": "..." }`}</code>.
            <code>availability</code> is free-form like{" "}
            <code>{`{ "home_collection": true, "walk_in": true }`}</code>.
            <code>contact</code> is{" "}
            <code>{`{ "phone": "...", "email": "...", "website": "..." }`}</code>.
          </>
        }
      />

      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: "Name is required" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item
        label="Provider code"
        name="provider_code"
        rules={[
          { required: true, message: "Provider code is required" },
          {
            pattern: /^[a-z0-9_]+$/,
            message: "Lowercase letters, digits and underscores only.",
          },
        ]}
        initialValue="manual"
        extra="'manual' means the admin coordinates fulfilment out-of-band. A live provider maps to a name lib/lab-provider knows how to talk to."
      >
        <Input placeholder="manual" />
      </Form.Item>

      <Space size="middle" style={{ display: "flex" }}>
        <Form.Item
          label="Country (ISO alpha-2)"
          name="country"
          normalize={(value: string | null | undefined) =>
            value ? value.toUpperCase().trim() : null
          }
          rules={[
            {
              pattern: /^[A-Z]{2}$/,
              message: "Two uppercase letters (e.g. IN, GB, US), or leave blank.",
            },
          ]}
          style={{ flex: 1 }}
        >
          <Input placeholder="IN / GB / US" maxLength={2} />
        </Form.Item>
        <Form.Item label="Postcode" name="postcode" style={{ flex: 2 }}>
          <Input placeholder="400001 / SW1A 1AA" />
        </Form.Item>
      </Space>

      <Space size="middle" style={{ display: "flex" }}>
        <Form.Item label="Price (headline)" name="price" style={{ flex: 1 }}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item
          label="Currency"
          name="currency"
          initialValue="INR"
          style={{ flex: 1 }}
        >
          <Input />
        </Form.Item>
      </Space>

      <Form.Item
        label="Address (JSON object)"
        name="address"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, {});
                if (
                  !parsed ||
                  typeof parsed !== "object" ||
                  Array.isArray(parsed)
                ) {
                  return Promise.reject(
                    new Error("Address must be a JSON object."),
                  );
                }
                return Promise.resolve();
              } catch (error) {
                return Promise.reject(
                  new Error(`Invalid JSON: ${(error as Error).message}`),
                );
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={5} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Availability (JSON object)"
        name="availability"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, {});
                if (
                  !parsed ||
                  typeof parsed !== "object" ||
                  Array.isArray(parsed)
                ) {
                  return Promise.reject(
                    new Error("Availability must be a JSON object."),
                  );
                }
                return Promise.resolve();
              } catch (error) {
                return Promise.reject(
                  new Error(`Invalid JSON: ${(error as Error).message}`),
                );
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={4} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Contact (JSON object)"
        name="contact"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, {});
                if (
                  !parsed ||
                  typeof parsed !== "object" ||
                  Array.isArray(parsed)
                ) {
                  return Promise.reject(
                    new Error("Contact must be a JSON object."),
                  );
                }
                return Promise.resolve();
              } catch (error) {
                return Promise.reject(
                  new Error(`Invalid JSON: ${(error as Error).message}`),
                );
              }
            },
          },
        ]}
      >
        <Input.TextArea rows={4} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Active (visible in the mobile booking flow)"
        name="active"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </>
  );
}

function useLabForm(mode: "create" | "edit") {
  const form = useForm<LabRecord>({ warnWhenUnsavedChanges: true });

  const originalOnFinish = form.formProps.onFinish;
  const wrappedOnFinish = async (values: Record<string, unknown>) => {
    const next = { ...values };
    try {
      next.address = textToJson((values.address as string) ?? "", {});
    } catch {
      next.address = {};
    }
    try {
      next.availability = textToJson(
        (values.availability as string) ?? "",
        {},
      );
    } catch {
      next.availability = {};
    }
    try {
      next.contact = textToJson((values.contact as string) ?? "", {});
    } catch {
      next.contact = {};
    }
    // Normalise blanks to null so the CHECK constraint on country doesn't
    // trip on an empty string.
    if (typeof next.country === "string" && next.country.trim() === "") {
      next.country = null;
    }
    if (typeof next.postcode === "string" && next.postcode.trim() === "") {
      next.postcode = null;
    }
    if (mode === "create" && next.active === undefined) {
      next.active = true;
    }
    if (typeof originalOnFinish === "function") {
      return originalOnFinish(next);
    }
    return undefined;
  };

  return {
    ...form,
    formProps: { ...form.formProps, onFinish: wrappedOnFinish },
  };
}

export function LabCreate() {
  const { formProps, saveButtonProps } = useLabForm("create");

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          active: true,
          currency: "INR",
          provider_code: "manual",
          address: "{}",
          availability: "{}",
          contact: "{}",
        }}
      >
        <LabFormFields />
      </Form>
    </Create>
  );
}

export function LabEdit() {
  const { formProps, saveButtonProps } = useLabForm("edit");

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <LabFormFields />
      </Form>
    </Edit>
  );
}

export function LabShow() {
  const { query } = useShow<LabRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Name</Typography.Title>
      <TextField value={record?.name} />
      <Typography.Title level={5}>Provider code</Typography.Title>
      <TextField value={record?.provider_code} />
      <Typography.Title level={5}>Country</Typography.Title>
      <TextField value={record?.country ?? ""} />
      <Typography.Title level={5}>Postcode</Typography.Title>
      <TextField value={record?.postcode ?? ""} />
      <Typography.Title level={5}>Price</Typography.Title>
      {record?.price !== null && record?.price !== undefined ? (
        <NumberField value={record.price} />
      ) : (
        <TextField value="—" />
      )}
      <Typography.Title level={5}>Currency</Typography.Title>
      <TextField value={record?.currency ?? ""} />
      <Typography.Title level={5}>Address</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.address)}
      </pre>
      <Typography.Title level={5}>Availability</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.availability)}
      </pre>
      <Typography.Title level={5}>Contact</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.contact)}
      </pre>
      <Typography.Title level={5}>Active</Typography.Title>
      <BooleanField value={record?.active} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
      <Typography.Title level={5}>Updated</Typography.Title>
      <DateField value={record?.updated_at} />
    </Show>
  );
}
