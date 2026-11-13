// Concurrent purchase test: many customers try to buy the last few codes AT THE SAME TIME.
// Expected: exactly as many orders succeed as there are codes, and no code is reserved twice.
// Run on a TEST project:  node --env-file=.env.local scripts/concurrency-test.mjs
// It creates temporary users/products and removes them afterwards.
import { createClient } from "@supabase/supabase-js";
import { createHash, randomUUID } from "node:crypto";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) { console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY (use --env-file=.env.local)"); process.exit(1); }

const db = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
const USERS = 12, CODES = 4, tag = randomUUID().slice(0, 8);
const userIds = []; let productId, categoryId, ok = false;

const must = (r, what) => { if (r.error) throw new Error(`${what}: ${r.error.message}`); return r.data; };

try {
  categoryId = must(await db.from("categories").insert({ name: `CT-${tag}`, slug: `ct-${tag}` }).select("id").single(), "category").id;
  productId = must(await db.from("products").insert({ category_id: categoryId, brand: "Test", name: `Concurrency ${tag}`, slug: `conc-${tag}`, denomination_label: "$1", selling_price_npr: 100, purchase_cost_npr: 80 }).select("id").single(), "product").id;
  must(await db.from("gift_card_codes").insert(Array.from({ length: CODES }, (_, i) => ({ product_id: productId, code: `CONC-${tag}-${i}`, code_hash: createHash("sha256").update(`CONC-${tag}-${i}`).digest("hex"), cost_npr: 80 }))), "codes");

  for (let i = 0; i < USERS; i++) {
    const u = must(await db.auth.admin.createUser({ email: `conc-${tag}-${i}@example.com`, password: randomUUID(), email_confirm: true }), "user");
    userIds.push(u.user.id);
    const cart = must(await db.from("carts").insert({ user_id: u.user.id }).select("id").single(), "cart");
    must(await db.from("cart_items").insert({ cart_id: cart.id, product_id: productId, quantity: 1 }), "cart item");
  }

  console.log(`Racing ${USERS} customers for ${CODES} codes...`);
  const results = await Promise.all(userIds.map((id) => db.rpc("create_checkout_order", { p_user_id: id, p_method: "bank_transfer", p_coupon_code: null, p_accepted_no_refund: true })));
  const won = results.filter((r) => !r.error).length;
  const soldOut = results.filter((r) => r.error && r.error.message.includes("insufficient_stock")).length;
  const other = results.filter((r) => r.error && !r.error.message.includes("insufficient_stock"));

  const reserved = must(await db.from("gift_card_codes").select("id, order_id").eq("product_id", productId).eq("status", "reserved"), "reserved");
  const orders = new Set(reserved.map((c) => c.order_id));

  const checks = [
    [`exactly ${CODES} orders succeeded`, won === CODES, `got ${won}`],
    [`the other ${USERS - CODES} were refused as sold out`, soldOut === USERS - CODES, `got ${soldOut}`],
    ["no unexpected errors", other.length === 0, other.map((r) => r.error.message).join("; ")],
    [`exactly ${CODES} codes are reserved`, reserved.length === CODES, `got ${reserved.length}`],
    ["every reserved code belongs to a different order", orders.size === CODES, `got ${orders.size} orders`],
  ];
  ok = checks.every(([, pass]) => pass);
  for (const [name, pass, detail] of checks) console.log(`${pass ? "PASS" : "FAIL"}  ${name}${pass ? "" : `  (${detail})`}`);
} catch (e) {
  console.error("Test error:", e.message);
} finally {
  // Clean up everything this script created.
  try {
    if (productId) {
      await db.from("gift_card_codes").update({ order_id: null, order_item_id: null }).eq("product_id", productId);
      await db.from("order_items").delete().eq("product_id", productId);
      await db.from("gift_card_codes").delete().eq("product_id", productId);
    }
    if (userIds.length) await db.from("orders").delete().in("user_id", userIds);
    if (userIds.length) await db.from("carts").delete().in("user_id", userIds);
    if (productId) await db.from("products").delete().eq("id", productId);
    if (categoryId) await db.from("categories").delete().eq("id", categoryId);
    for (const id of userIds) await db.auth.admin.deleteUser(id);
  } catch (e) { console.error("Cleanup problem (check for leftover test rows):", e.message); }
}
console.log(ok ? "\nAll concurrency checks passed." : "\nConcurrency test FAILED.");
process.exit(ok ? 0 : 1);
