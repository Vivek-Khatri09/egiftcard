"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";

export type CartResult = { ok: boolean; needsLogin?: boolean; message: string };

const uuid = z.string().uuid();

async function stockFor(supabase: Awaited<ReturnType<typeof createClient>>, productId: string) {
  const { data } = await supabase.from("products_public").select("stock_count").eq("id", productId).maybeSingle();
  return data ? Number(data.stock_count) : null; // null = product not available
}

export async function addToCart(productId: string, quantity = 1): Promise<CartResult> {
  if (!uuid.safeParse(productId).success || !Number.isInteger(quantity) || quantity < 1 || quantity > 50) {
    return { ok: false, message: "Invalid request." };
  }
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return { ok: false, needsLogin: true, message: "Please log in to add items to your cart." };

  const stock = await stockFor(supabase, productId);
  if (stock === null) return { ok: false, message: "This gift card is no longer available." };
  if (stock === 0) return { ok: false, message: "Sorry, this gift card is out of stock." };

  let { data: cart } = await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle();
  if (!cart) {
    const created = await supabase.from("carts").insert({ user_id: user.id }).select("id").single();
    cart = created.data ?? (await supabase.from("carts").select("id").eq("user_id", user.id).maybeSingle()).data;
  }
  if (!cart) return { ok: false, message: "We couldn't open your cart. Please try again." };

  const { data: existing } = await supabase.from("cart_items").select("id, quantity").eq("cart_id", cart.id).eq("product_id", productId).maybeSingle();
  const wanted = (existing ? Number(existing.quantity) : 0) + quantity;
  const finalQty = Math.min(wanted, stock, 50);

  const { error } = existing
    ? await supabase.from("cart_items").update({ quantity: finalQty }).eq("id", existing.id)
    : await supabase.from("cart_items").insert({ cart_id: cart.id, product_id: productId, quantity: finalQty });
  if (error) return { ok: false, message: "We couldn't update your cart. Please try again." };

  revalidatePath("/", "layout");
  return finalQty < wanted
    ? { ok: true, message: `Only ${stock} available, so your cart now has ${finalQty}.` }
    : { ok: true, message: "Added to your cart." };
}

export async function setCartQuantity(fd: FormData): Promise<void> {
  const itemId = String(fd.get("itemId") ?? "");
  const quantity = Number(fd.get("quantity"));
  if (!uuid.safeParse(itemId).success || !Number.isInteger(quantity)) return;

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/cart");

  if (quantity <= 0) {
    await supabase.from("cart_items").delete().eq("id", itemId); // RLS limits this to your own cart
  } else {
    const { data: item } = await supabase.from("cart_items").select("id, product_id").eq("id", itemId).maybeSingle();
    if (item) {
      const stock = (await stockFor(supabase, item.product_id)) ?? 0;
      const finalQty = Math.min(quantity, Math.max(stock, 1), 50);
      await supabase.from("cart_items").update({ quantity: finalQty }).eq("id", itemId);
      if (finalQty < quantity) {
        revalidatePath("/", "layout");
        redirect("/cart?notice=stock");
      }
    }
  }
  revalidatePath("/", "layout");
  revalidatePath("/cart");
}

export async function removeCartItem(fd: FormData): Promise<void> {
  const itemId = String(fd.get("itemId") ?? "");
  if (!uuid.safeParse(itemId).success) return;
  const supabase = await createClient();
  await supabase.from("cart_items").delete().eq("id", itemId);
  revalidatePath("/", "layout");
  revalidatePath("/cart");
}
