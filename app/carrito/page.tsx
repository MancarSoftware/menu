import type { Metadata } from "next";
import { CartPage } from "@/features/cart/cart-page";
import { getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Carrito" };

export default async function CartRoute() {
  const restaurant = await getRestaurant();
  return <CartPage whatsapp={restaurant.whatsapp} />;
}
