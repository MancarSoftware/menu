import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Hamburguesas", slug: "hamburguesas", description: "Carne a la parrilla, pan suave y combinaciones hechas al momento." },
  { name: "Pizzas", slug: "pizzas", description: "Masa dorada, salsa de la casa y mucho queso." },
  { name: "Combos", slug: "combos", description: "Tu favorito con papas y bebida a un mejor precio." },
  { name: "Bebidas", slug: "bebidas", description: "Opciones frías para completar tu pedido." },
];

const itemSeed = [
  { category: "hamburguesas", name: "Hamburguesa Clásica", slug: "hamburguesa-clasica", shortDescription: "Carne, queso, lechuga, tomate y salsa de la casa.", description: "Hamburguesa de carne a la parrilla con queso, lechuga fresca, tomate, pepinillos y salsa de la casa en pan con ajonjolí.", priceCents: 35000, imageUrl: "/images/fast-food/burger-classic.webp", featured: true, chef: false, tags: [], ingredients: ["Carne de res", "Queso", "Lechuga", "Tomate", "Pepinillos"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "hamburguesas", name: "Hamburguesa Doble", slug: "hamburguesa-doble", shortDescription: "Doble carne, cheddar, cebolla y pepinillos.", description: "Dos jugosas carnes a la parrilla, queso cheddar derretido, cebolla, lechuga, tomate maduro y pepinillos en pan brioche.", priceCents: 45000, imageUrl: "/images/fast-food/burger-double.webp", featured: true, chef: true, tags: [], ingredients: ["Doble carne de res", "Cheddar", "Cebolla", "Lechuga", "Pepinillos"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "hamburguesas", name: "Pollo Crunch", slug: "pollo-crunch", shortDescription: "Pollo crujiente, repollo y mayonesa picante.", description: "Pechuga de pollo empanizada, repollo fresco, pepinillos y mayonesa ligeramente picante en pan suave.", priceCents: 39000, imageUrl: "/images/fast-food/hero.webp", featured: false, chef: false, tags: ["Picante"], ingredients: ["Pollo", "Repollo", "Pepinillos", "Mayonesa picante"], allergens: ["Gluten", "Huevo"], spicyLevel: 1 },
  { category: "pizzas", name: "Pizza Pepperoni", slug: "pizza-pepperoni", shortDescription: "Pepperoni, mozzarella y salsa de tomate.", description: "Nuestra masa artesanal con salsa de tomate, mozzarella y una capa generosa de pepperoni dorado.", priceCents: 65000, imageUrl: "/images/fast-food/pizza.webp", featured: true, chef: false, tags: [], ingredients: ["Masa", "Salsa de tomate", "Mozzarella", "Pepperoni"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "pizzas", name: "Pizza Suprema", slug: "pizza-suprema", shortDescription: "Carnes, pimientos, cebolla y aceitunas.", description: "Mozzarella, pepperoni, jamón, pimientos, cebolla y aceitunas sobre salsa de tomate y masa recién horneada.", priceCents: 85000, imageUrl: "/images/fast-food/pizza-large.webp", featured: true, chef: true, tags: [], ingredients: ["Masa", "Mozzarella", "Pepperoni", "Jamón", "Vegetales"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "pizzas", name: "Pizza Margarita", slug: "pizza-margarita", shortDescription: "Mozzarella, tomate y albahaca fresca.", description: "Una combinación sencilla de mozzarella, tomate y albahaca fresca sobre nuestra salsa y masa artesanal.", priceCents: 58000, imageUrl: "/images/fast-food/pizza-large.webp", featured: false, chef: false, tags: ["Vegetariano"], ingredients: ["Masa", "Mozzarella", "Tomate", "Albahaca"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "combos", name: "Combo Clásico", slug: "combo-clasico", shortDescription: "Hamburguesa clásica, papas y refresco.", description: "Nuestra Hamburguesa Clásica acompañada de papas fritas crujientes y un refresco frío.", priceCents: 52000, imageUrl: "/images/fast-food/hero.webp", featured: true, chef: false, tags: [], ingredients: ["Hamburguesa clásica", "Papas fritas", "Refresco"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "combos", name: "Combo Doble", slug: "combo-doble", shortDescription: "Hamburguesa doble, papas y refresco.", description: "Hamburguesa Doble con una porción de papas fritas y el refresco de tu preferencia.", priceCents: 62000, imageUrl: "/images/fast-food/burger-double.webp", featured: false, chef: true, tags: [], ingredients: ["Hamburguesa doble", "Papas fritas", "Refresco"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "combos", name: "Combo Pizza", slug: "combo-pizza", shortDescription: "Pizza personal, papas y refresco.", description: "Pizza personal de pepperoni, papas fritas y un refresco frío para una comida completa.", priceCents: 59000, imageUrl: "/images/fast-food/pizza.webp", featured: false, chef: false, tags: [], ingredients: ["Pizza pepperoni", "Papas fritas", "Refresco"], allergens: ["Gluten", "Lácteos"], spicyLevel: null },
  { category: "bebidas", name: "Refresco", slug: "refresco", shortDescription: "Elige tu sabor favorito.", description: "Refresco frío servido con hielo. Consulta los sabores disponibles al ordenar.", priceCents: 10000, imageUrl: "/images/fast-food/hero.webp", featured: false, chef: false, tags: ["Sin gluten"], ingredients: ["Refresco", "Hielo"], allergens: [], spicyLevel: null },
  { category: "bebidas", name: "Limonada", slug: "limonada", shortDescription: "Limón recién exprimido y hielo.", description: "Limonada preparada al momento con limón fresco, agua, azúcar y mucho hielo.", priceCents: 14000, imageUrl: "/images/fast-food/hero.webp", featured: false, chef: false, tags: ["Vegano", "Sin gluten"], ingredients: ["Limón", "Agua", "Azúcar", "Hielo"], allergens: [], spicyLevel: null },
  { category: "bebidas", name: "Agua", slug: "agua", shortDescription: "Agua purificada fría.", description: "Botella de agua purificada servida fría.", priceCents: 7000, imageUrl: "/images/fast-food/hero.webp", featured: false, chef: false, tags: ["Vegano", "Sin gluten"], ingredients: ["Agua"], allergens: [], spicyLevel: null },
];

async function main() {
  const restaurantData = {
    name: "El Bueno",
    tagline: "Hamburguesas, pizzas y antojos hechos al momento.",
    description: "Comida rápida con ingredientes frescos, porciones generosas y el sabor que siempre quieres repetir.",
    address: "Av. 27 de Febrero, Santiago de los Caballeros",
    phone: "+1 809-577-7289",
    whatsapp: "18095777289",
    email: "hola@elbueno.do",
    openingHours: JSON.stringify([
      { days: "Lunes — jueves", hours: "11:00 — 22:00" },
      { days: "Viernes — sábado", hours: "11:00 — 23:30" },
      { days: "Domingo", hours: "12:00 — 21:30" },
    ]),
    socialLinks: JSON.stringify({ instagram: "https://instagram.com", facebook: "https://facebook.com" }),
  };

  await prisma.restaurant.upsert({ where: { id: 1 }, update: restaurantData, create: { id: 1, ...restaurantData } });
  await prisma.menuItem.deleteMany();
  await prisma.menuCategory.deleteMany();

  const categoryMap = new Map<string, string>();
  for (const [index, category] of categories.entries()) {
    const saved = await prisma.menuCategory.create({ data: { ...category, displayOrder: index } });
    categoryMap.set(category.slug, saved.id);
  }

  for (const [index, item] of itemSeed.entries()) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) throw new Error(`Missing category ${item.category}`);
    await prisma.menuItem.create({ data: { name: item.name, slug: item.slug, shortDescription: item.shortDescription, description: item.description, priceCents: item.priceCents, imageUrl: item.imageUrl, isFeatured: item.featured, isChefRecommendation: item.chef, displayOrder: index, dietaryTags: JSON.stringify(item.tags), ingredients: JSON.stringify(item.ingredients), allergens: JSON.stringify(item.allergens), spicyLevel: item.spicyLevel, categoryId } });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the administrator.");
  await prisma.adminUser.upsert({ where: { email }, update: {}, create: { email, name: "Administración", passwordHash: await hash(password, 12) } });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
