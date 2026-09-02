import type { Metadata } from "next";
import { CartPage } from "@/features/cart/cart-page";
import { getRestaurant } from "@/lib/menu-repository";
import { getDiningTableSession } from "@/lib/table-session";

export const metadata: Metadata = { title: "Carrito" };

export default async function CartRoute() {
  const [restaurant, table] = await Promise.all([getRestaurant(), getDiningTableSession()]);
  return <CartPage whatsapp={restaurant.whatsapp} pickupAddress={restaurant.address} city={restaurant.city} locationCenter={{ latitude: restaurant.latitude, longitude: restaurant.longitude }} dineInTable={table ? { number: table.number, name: table.name } : null} />;
}
