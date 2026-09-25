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

import { StatusChip } from "../../components/StatusChip";

/**
 * Recipe library CRUD.
 *
 * Rows are read at browse/detail time by lib/recipes-io. jsonb columns
 * (ingredients / instructions / nutrition) are edited as monospace JSON
 * textareas with an inline validator; the shape guards in lib/recipes-parse
 * accept both plain-string legacy shapes and structured objects so a
 * quick paste-in is workable, but the guidance in the Alert points to the
 * structured shape the detail screen renders best.
 */

type RecipeRecord = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  ingredients: unknown;
  instructions: unknown;
  nutrition: unknown;
  tags: string[] | null;
  prep_minutes: number | null;
  cook_minutes: number | null;
  servings: number | null;
  image_url: string | null;
  active: boolean;
  created_at?: string;
  updated_at?: string;
};

export function RecipeList() {
  const { tableProps } = useTable<RecipeRecord>({
    syncWithLocation: true,
    sorters: { initial: [{ field: "name", order: "asc" }] },
  });

  return (
    <List>
      <Table {...tableProps} rowKey="id" scroll={{ x: true }}>
        <Table.Column dataIndex="name" title="Name" sorter />
        <Table.Column dataIndex="slug" title="Slug" />
        <Table.Column
          dataIndex="tags"
          title="Tags"
          render={(value: string[] | null) => {
            const list = Array.isArray(value) ? value : [];
            if (list.length === 0) {
              return <StatusChip kind="inactive">none</StatusChip>;
            }
            return (
              <Space size={4} wrap>
                {list.slice(0, 6).map((tag) => (
                  <StatusChip key={tag} kind="info">
                    {tag}
                  </StatusChip>
                ))}
                {list.length > 6 ? (
                  <StatusChip kind="inactive">
                    +{list.length - 6} more
                  </StatusChip>
                ) : null}
              </Space>
            );
          }}
        />
        <Table.Column
          title="Time"
          render={(_: unknown, record: RecipeRecord) => {
            const prep = record.prep_minutes ?? 0;
            const cook = record.cook_minutes ?? 0;
            const total = Math.max(0, prep) + Math.max(0, cook);
            return total > 0 ? `${total} min` : "—";
          }}
        />
        <Table.Column dataIndex="servings" title="Serves" width={80} />
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
          render={(_: unknown, record: RecipeRecord) => (
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

function RecipeFormFields() {
  return (
    <>
      <Alert
        type="info"
        showIcon
        style={{ marginBottom: 16 }}
        message="How the mobile app renders these"
        description={
          <>
            Ingredients: <code>[{`{ "name": "…", "amount": "…", "unit": "…", "note": "…" }`}]</code> —
            plain strings work too. Instructions: <code>[{`{ "step": 1, "text": "…" }`}]</code> or a
            plain string array (auto-numbered). Nutrition: <code>{`{ "calories": 320, "protein_g": 12, "carbs_g": 40, "fat_g": 10, "fiber_g": 5 }`}</code> —
            omit any field the recipe doesn't measure (renders as "unknown", not zero).
          </>
        }
      />

      <Form.Item
        label="Slug"
        name="slug"
        rules={[
          { required: true, message: "Slug is required" },
          {
            pattern: /^[a-z0-9-]+$/,
            message: "Lowercase letters, digits and hyphens only.",
          },
        ]}
        extra="Stable id used in the mobile app's URL. Do not rename an in-use slug — favorites and shared links break."
      >
        <Input placeholder="green-smoothie" />
      </Form.Item>

      <Form.Item
        label="Name"
        name="name"
        rules={[{ required: true, message: "Name is required" }]}
      >
        <Input />
      </Form.Item>

      <Form.Item label="Description" name="description">
        <Input.TextArea rows={2} />
      </Form.Item>

      <Form.Item
        label="Tags"
        name="tags"
        extra="Feed the filter-chip row in the mobile browse screen. Kept short and lowercase in general (breakfast, quick, vegan…)."
      >
        <Select mode="tags" tokenSeparators={[",", "\n"]} />
      </Form.Item>

      <Space size="middle" style={{ display: "flex" }}>
        <Form.Item label="Prep (min)" name="prep_minutes" style={{ flex: 1 }}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Cook (min)" name="cook_minutes" style={{ flex: 1 }}>
          <InputNumber min={0} style={{ width: "100%" }} />
        </Form.Item>
        <Form.Item label="Servings" name="servings" style={{ flex: 1 }}>
          <InputNumber min={1} style={{ width: "100%" }} />
        </Form.Item>
      </Space>

      <Form.Item
        label="Image URL"
        name="image_url"
        rules={[
          {
            type: "url",
            message: "Enter a valid URL, or leave empty.",
          },
        ]}
      >
        <Input placeholder="https://…" />
      </Form.Item>

      <Form.Item
        label="Ingredients (JSON array)"
        name="ingredients"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, []);
                if (!Array.isArray(parsed)) {
                  return Promise.reject(
                    new Error("Ingredients must be a JSON array."),
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
        <Input.TextArea rows={8} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Instructions (JSON array)"
        name="instructions"
        getValueProps={(value) => ({ value: jsonToText(value) })}
        normalize={(value) => value}
        rules={[
          {
            validator: (_, value) => {
              try {
                const parsed = textToJson(value, []);
                if (!Array.isArray(parsed)) {
                  return Promise.reject(
                    new Error("Instructions must be a JSON array."),
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
        <Input.TextArea rows={8} style={{ fontFamily: "monospace" }} />
      </Form.Item>

      <Form.Item
        label="Nutrition (JSON object)"
        name="nutrition"
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
                    new Error("Nutrition must be a JSON object."),
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
        label="Active (visible in the mobile library)"
        name="active"
        valuePropName="checked"
      >
        <Switch />
      </Form.Item>
    </>
  );
}

/** Parse the JSON textareas on submit; a validator error blocks submit
 *  before this fires. Non-array/non-object fallthroughs default to safe
 *  empty shapes so a bad edit can't crash the mobile detail screen. */
function useRecipeForm(mode: "create" | "edit") {
  const form = useForm<RecipeRecord>({ warnWhenUnsavedChanges: true });

  const originalOnFinish = form.formProps.onFinish;
  const wrappedOnFinish = async (values: Record<string, unknown>) => {
    const next = { ...values };
    try {
      next.ingredients = textToJson(
        (values.ingredients as string) ?? "",
        [],
      );
    } catch {
      next.ingredients = [];
    }
    try {
      next.instructions = textToJson(
        (values.instructions as string) ?? "",
        [],
      );
    } catch {
      next.instructions = [];
    }
    try {
      next.nutrition = textToJson((values.nutrition as string) ?? "", {});
    } catch {
      next.nutrition = {};
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

export function RecipeCreate() {
  const { formProps, saveButtonProps } = useRecipeForm("create");

  return (
    <Create saveButtonProps={saveButtonProps}>
      <Form
        {...formProps}
        layout="vertical"
        initialValues={{
          active: true,
          tags: [],
          ingredients: "[]",
          instructions: "[]",
          nutrition: "{}",
        }}
      >
        <RecipeFormFields />
      </Form>
    </Create>
  );
}

export function RecipeEdit() {
  const { formProps, saveButtonProps } = useRecipeForm("edit");

  return (
    <Edit saveButtonProps={saveButtonProps}>
      <Form {...formProps} layout="vertical">
        <RecipeFormFields />
      </Form>
    </Edit>
  );
}

export function RecipeShow() {
  const { query } = useShow<RecipeRecord>();
  const record = query?.data?.data;

  return (
    <Show isLoading={query?.isLoading}>
      <Typography.Title level={5}>Slug</Typography.Title>
      <TextField value={record?.slug} />
      <Typography.Title level={5}>Name</Typography.Title>
      <TextField value={record?.name} />
      <Typography.Title level={5}>Description</Typography.Title>
      <TextField value={record?.description ?? ""} />
      <Typography.Title level={5}>Tags</Typography.Title>
      <TextField value={(record?.tags ?? []).join(", ")} />
      <Typography.Title level={5}>Prep / cook / servings</Typography.Title>
      <TextField
        value={`${record?.prep_minutes ?? "—"} min prep · ${
          record?.cook_minutes ?? "—"
        } min cook · serves ${record?.servings ?? "—"}`}
      />
      <Typography.Title level={5}>Image URL</Typography.Title>
      <TextField value={record?.image_url ?? ""} />
      <Typography.Title level={5}>Ingredients</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.ingredients)}
      </pre>
      <Typography.Title level={5}>Instructions</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.instructions)}
      </pre>
      <Typography.Title level={5}>Nutrition</Typography.Title>
      <pre style={{ whiteSpace: "pre-wrap" }}>
        {jsonToText(record?.nutrition)}
      </pre>
      <Typography.Title level={5}>Active</Typography.Title>
      <BooleanField value={record?.active} />
      <Typography.Title level={5}>Created</Typography.Title>
      <DateField value={record?.created_at} />
      <Typography.Title level={5}>Updated</Typography.Title>
      <DateField value={record?.updated_at} />
      {/* NumberField import kept so the row's servings field can be
          swapped to a numeric display later without another edit here. */}
      {record?.servings !== null && record?.servings !== undefined ? (
        <>
          <Typography.Title level={5}>Servings (numeric)</Typography.Title>
          <NumberField value={record.servings} />
        </>
      ) : null}
    </Show>
  );
}
