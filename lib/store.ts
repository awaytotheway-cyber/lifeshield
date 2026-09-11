/**
 * Phase 3 store — product catalog and cart_items reads/writes.
 * Prices shown here are display-only; real charges are server-side on Day 4+.
 */
import { COPY } from "@/lib/copy";
import { messageFromUnknown, rawErrorText } from "@/lib/friendly-errors";
import { parseFiniteNumber } from "@/lib/questionnaire/numbers";
import type { Product } from "@/lib/purchase-gates";
import { isSupabaseConfigured, supabase } from "@/lib/supabase";

export type ProductRow = Product & {
  id: string;
  currency: string;
  active: boolean;
};

export type CartLineRow = {
  id: string;
  quantity: number;
  product_id: string;
  product: ProductRow;
};

type LoadProductsOutcome =
  | { ok: true; products: ProductRow[] }
  | { ok: false; products: []; message: string };

type LoadCartOutcome =
  | { ok: true; lines: CartLineRow[] }
  | { ok: false; lines: []; message: string };

type CartMutationOutcome = { ok: true } | { ok: false; message: string };

const PRODUCT_COLUMNS =
  "id, product_type, plain_name, plain_description, clinical_name, linked_finding, test_tier, price, currency, requires_consent, interaction_flags, active";

function looksLikeMissingProductsTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("products") &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("pgrst205") ||
      text.includes("could not find the table"))
  );
}

function looksLikeMissingCartTable(error: unknown): boolean {
  const text = rawErrorText(error).toLowerCase();
  return (
    text.includes("cart_items") &&
    (text.includes("does not exist") ||
      text.includes("schema cache") ||
      text.includes("pgrst205") ||
      text.includes("could not find the table"))
  );
}

function normalizeProduct(row: Record<string, unknown>): ProductRow {
  const price =
    parseFiniteNumber(row.price) ??
    parseFiniteNumber(String(row.price ?? "")) ??
    0;
  return {
    id: String(row.id),
    product_type: row.product_type as ProductRow["product_type"],
    plain_name: String(row.plain_name ?? ""),
    plain_description: row.plain_description
      ? String(row.plain_description)
      : null,
    clinical_name: String(row.clinical_name ?? ""),
    linked_finding: row.linked_finding ? String(row.linked_finding) : null,
    test_tier:
      row.test_tier === null || row.test_tier === undefined
        ? null
        : Number(row.test_tier),
    price,
    currency: String(row.currency ?? "INR"),
    requires_consent: Boolean(row.requires_consent),
    interaction_flags: Array.isArray(row.interaction_flags)
      ? row.interaction_flags.map(String)
      : null,
    active: row.active !== false,
  };
}

/** Format a catalog price for display (INR by default). */
export function formatProductPrice(product: ProductRow): string {
  const amount = Number.isFinite(product.price) ? product.price : 0;
  if (product.currency === "INR" || !product.currency) {
    return `₹${amount.toLocaleString("en-IN")}`;
  }
  return `${product.currency} ${amount.toLocaleString()}`;
}

/** Sum line totals from DB prices — display only until checkout Day 4. */
export function cartDisplayTotal(lines: CartLineRow[]): number {
  return lines.reduce(
    (sum, line) => sum + line.product.price * line.quantity,
    0,
  );
}

export function recommendedFromPlan(
  products: ProductRow[],
  triggerFindings: string[],
): ProductRow[] {
  if (triggerFindings.length === 0) {
    return [];
  }
  const findingSet = new Set(triggerFindings);
  return products.filter(
    (product) =>
      product.active &&
      product.linked_finding &&
      findingSet.has(product.linked_finding),
  );
}

export async function loadActiveProducts(): Promise<LoadProductsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, products: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("active", true)
      .order("product_type", { ascending: true })
      .order("plain_name", { ascending: true });
    if (error) {
      throw error;
    }
    const products = (data ?? []).map((row) =>
      normalizeProduct(row as Record<string, unknown>),
    );
    if (products.length === 0) {
      return { ok: false, products: [], message: COPY.storeEmpty };
    }
    return { ok: true, products };
  } catch (error) {
    if (looksLikeMissingProductsTable(error)) {
      return { ok: false, products: [], message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      products: [],
      message: messageFromUnknown(error, COPY.storeLoadFailed),
    };
  }
}

export async function loadProductById(
  productId: string,
): Promise<LoadProductsOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, products: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("products")
      .select(PRODUCT_COLUMNS)
      .eq("id", productId)
      .maybeSingle();
    if (error) {
      throw error;
    }
    if (!data) {
      return { ok: false, products: [], message: COPY.storeProductMissing };
    }
    return {
      ok: true,
      products: [normalizeProduct(data as Record<string, unknown>)],
    };
  } catch (error) {
    if (looksLikeMissingProductsTable(error)) {
      return { ok: false, products: [], message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      products: [],
      message: messageFromUnknown(error, COPY.storeLoadFailed),
    };
  }
}

function mapCartLines(
  data: { id: string; quantity: number; product_id: string; products: unknown }[],
): CartLineRow[] {
  const lines: CartLineRow[] = [];
  for (const row of data) {
    const nested = row.products;
    if (!nested || typeof nested !== "object") {
      continue;
    }
    lines.push({
      id: row.id,
      quantity: row.quantity,
      product_id: row.product_id,
      product: normalizeProduct(nested as Record<string, unknown>),
    });
  }
  return lines;
}

export async function loadOwnCart(userId: string): Promise<LoadCartOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, lines: [], message: COPY.missingKeys };
  }
  try {
    const { data, error } = await supabase
      .from("cart_items")
      .select(`id, quantity, product_id, products (${PRODUCT_COLUMNS})`)
      .eq("user_id", userId)
      .order("added_at", { ascending: true });
    if (error) {
      throw error;
    }
    return {
      ok: true,
      lines: mapCartLines(
        (data ?? []) as {
          id: string;
          quantity: number;
          product_id: string;
          products: unknown;
        }[],
      ),
    };
  } catch (error) {
    if (looksLikeMissingCartTable(error)) {
      return { ok: false, lines: [], message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      lines: [],
      message: messageFromUnknown(error, COPY.cartLoadFailed),
    };
  }
}

/** Insert or bump quantity for (user_id, product_id). */
export async function addToCart(
  userId: string,
  productId: string,
): Promise<CartMutationOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { data: existing, error: readError } = await supabase
      .from("cart_items")
      .select("id, quantity")
      .eq("user_id", userId)
      .eq("product_id", productId)
      .maybeSingle();
    if (readError) {
      throw readError;
    }

    if (existing?.id) {
      const nextQty = (existing.quantity ?? 1) + 1;
      const { error: updateError } = await supabase
        .from("cart_items")
        .update({ quantity: nextQty })
        .eq("id", existing.id);
      if (updateError) {
        throw updateError;
      }
      return { ok: true };
    }

    const { error: insertError } = await supabase.from("cart_items").insert({
      user_id: userId,
      product_id: productId,
      quantity: 1,
    });
    if (insertError) {
      throw insertError;
    }
    return { ok: true };
  } catch (error) {
    if (looksLikeMissingCartTable(error)) {
      return { ok: false, message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.storeAddFailed),
    };
  }
}

export async function setCartQuantity(
  userId: string,
  cartItemId: string,
  quantity: number,
): Promise<CartMutationOutcome> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    if (quantity <= 0) {
      const { error } = await supabase
        .from("cart_items")
        .delete()
        .eq("id", cartItemId)
        .eq("user_id", userId);
      if (error) {
        throw error;
      }
      return { ok: true };
    }

    const { error } = await supabase
      .from("cart_items")
      .update({ quantity })
      .eq("id", cartItemId)
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return { ok: true };
  } catch (error) {
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.cartUpdateFailed),
    };
  }
}

export async function removeCartItem(
  userId: string,
  cartItemId: string,
): Promise<CartMutationOutcome> {
  return setCartQuantity(userId, cartItemId, 0);
}

/** Item count for cart badge on the store screen. */
export async function loadCartItemCount(
  userId: string,
): Promise<{ ok: true; count: number } | { ok: false; message: string }> {
  if (!isSupabaseConfigured) {
    return { ok: false, message: COPY.missingKeys };
  }
  try {
    const { count, error } = await supabase
      .from("cart_items")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId);
    if (error) {
      throw error;
    }
    return { ok: true, count: count ?? 0 };
  } catch (error) {
    if (looksLikeMissingCartTable(error)) {
      return { ok: false, message: COPY.storeNeedSql };
    }
    return {
      ok: false,
      message: messageFromUnknown(error, COPY.cartLoadFailed),
    };
  }
}
