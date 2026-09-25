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
  // Phase E — supplement-only. Left optional so a "test"-typed product
  // saves without touching these.
  contraindication_codes?: string[];
  subscription_options?: unknown;
  supporting_studies?: unknown;
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

      <Alert
        type="info"
        showIcon
        style={{ marginTop: 16, marginBottom: 16 }}
        message="Supplement-only fields (Phase E)"
        description={
          <>
            <code>contraindication_codes</code> match against
            public.medications so the mobile detail can flag interactions.
            Common tags: <code>hormones</code>, <code>blood_thinners</code>.
            <br />
            <code>subscription_options</code>:{" "}
            <code>{`{ "intervals": ["monthly","quarterly"], "discount_percent": 10 }`}</code>.
            <br />
            <code>supporting_studies</code>:{" "}
            <code>{`[{ "title": "...", "url": "https://...", "source": "NEJM", "year": 2019 }]`}</code>.
            <br />
            Safe to leave empty on test-typed products — nothing renders.
          </>
        }
      />

      <Form.Item
        label="Contraindication codes"
        name="contraindication_codes"
        extra="Free-form tags. Matched against the user's medications' contraindication_codes."
      >
        <Select mode="tags" tokenSeparators={[",", "\n"]} />
      </Form.Item>

      <Form.Item
        label="Subscription options (JSON object)"
        name="subscription_options"
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
                    new Error("Subscription options must be a JSON object."),
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
        label="Supporting studies (JSON array)"
        name="supporting_studies"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, []);
                if (!Array.isArray(parsed)) {
                  return Promise.reject(
                    new Error("Supporting studies must be a JSON array."),
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
        <Input.TextArea rows={6} style={{ fontFamily: "monospace" }} />
      </Form.Item>
    </>
  );
}

// Same helpers as lib/intervention-templates and lib/recipes admin pages.
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

/**
 * Wrap onFinish to parse the Phase E JSON textareas before submit. Validators
 * above block a bad JSON string first, so the safe-fallback branches here
 * only run for edge cases where the raw text still slipped through.
 * Blanks / bad shapes normalise to safe defaults so the mobile detail can't
 * crash on a partial edit.
 */
function useProductForm(mode: "create" | "edit") {
  const form = useForm<ProductRecord>({ warnWhenUnsavedChanges: true });
  const originalOnFinish = form.formProps.onFinish;
  const wrappedOnFinish = async (values: Record<string, unknown>) => {
    const next = { ...values };
    try {
      next.subscription_options = textToJson(
        (values.subscription_options as string) ?? "",
        {},
      );
    } catch {
      next.subscription_options = {};
    }
    try {
      next.supporting_studies = textToJson(
        (values.supporting_studies as string) ?? "",
        [],
      );
    } catch {
      next.supporting_studies = [];
    }
    if (!Array.isArray(next.contraindication_codes)) {
      next.contraindication_codes = [];
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

export function ProductCreate() {
  const { formProps, saveButtonProps } = useProductForm("create");

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          active: true,
          currency: "INR",
          contraindication_codes: [],
          subscription_options: "{}",
          supporting_studies: "[]",
        }}
      >
        <ProductFormFields />
      </Form>
    </Create>
  );
}

/** Edit price, names, and active flag — main Day 2 verification path. */
export function ProductEdit() {
  const { formProps, saveButtonProps } = useProductForm("edit");

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
      <Typography.Title level={5}>Contraindication codes</Typography.Title>
      <TextField
        value={(record?.contraindication_codes ?? []).join(", ")}
      />
      <Typography.Title level={5}>Subscription options</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.subscription_options)}
      </pre>
      <Typography.Title level={5}>Supporting studies</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.supporting_studies)}
      </pre>
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
    </Show>
  );
}
