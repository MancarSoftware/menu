import { PrismaClient } from "@prisma/client";
import { hash } from "bcryptjs";

const prisma = new PrismaClient();

const categories = [
  { name: "Para abrir", slug: "para-abrir", description: "Bocados vivos para encender la mesa." },
  { name: "Mar y río", slug: "mar-y-rio", description: "Pesca fresca, cítricos y humo leve." },
  { name: "Fuego lento", slug: "fuego-lento", description: "Cortes, brasas y fondos cocinados sin prisa." },
  { name: "De la huerta", slug: "de-la-huerta", description: "Vegetales andinos tratados como protagonistas." },
  { name: "Dulce final", slug: "dulce-final", description: "Texturas cálidas, cacao y fruta." },
  { name: "Barra", slug: "barra", description: "Cócteles, vinos y bebidas sin alcohol." },
];

const itemSeed = [
  { category: "para-abrir", name: "Maíz de altura", slug: "maiz-de-altura", shortDescription: "Humita crocante, queso de hoja y ají fermentado.", description: "Una lectura crujiente de la humita serrana con centro de queso de hoja, crema de maíz tostado y nuestro ají fermentado de la casa.", priceCents: 1050, imageUrl: "/images/tiradito.webp", featured: false, chef: false, tags: ["Vegetariano"], ingredients: ["Maíz blanco", "Queso de hoja", "Ají fermentado", "Cilantro"], allergens: ["Lácteos"], spicyLevel: 1 },
  { category: "para-abrir", name: "Tiradito del Pacífico", slug: "tiradito-del-pacifico", shortDescription: "Corvina, maracuyá, chocho y maíz tostado.", description: "Láminas de corvina curadas al momento en leche de tigre de maracuyá, cebolla encurtida, chocho tierno y maíz tostado.", priceCents: 1550, imageUrl: "/images/tiradito.webp", featured: true, chef: true, tags: ["Sin gluten"], ingredients: ["Corvina", "Maracuyá", "Chocho", "Cebolla encurtida", "Maíz"], allergens: ["Pescado"], spicyLevel: 1 },
  { category: "mar-y-rio", name: "Pulpo a la brasa", slug: "pulpo-a-la-brasa", shortDescription: "Achiote, mellocos y choclo quemado.", description: "Pulpo cocido lentamente y terminado sobre carbón, con aceite de achiote, mellocos dorados, choclo quemado y hojas de huacatay.", priceCents: 2450, imageUrl: "/images/hero-pulpo.webp", featured: true, chef: true, tags: ["Sin gluten"], ingredients: ["Pulpo", "Melloco", "Choclo", "Achiote", "Huacatay"], allergens: ["Moluscos"], spicyLevel: null },
  { category: "mar-y-rio", name: "Trucha de páramo", slug: "trucha-de-paramo", shortDescription: "Mantequilla de cedrón, arveja y limón mandarina.", description: "Trucha de cultivo responsable, piel crujiente, puré de arveja y mantequilla aromática de cedrón y limón mandarina.", priceCents: 2250, imageUrl: "/images/trucha.webp", featured: false, chef: false, tags: ["Sin gluten"], ingredients: ["Trucha", "Arveja", "Cedrón", "Limón mandarina"], allergens: ["Pescado", "Lácteos"], spicyLevel: null },
  { category: "fuego-lento", name: "Costilla 8 horas", slug: "costilla-8-horas", shortDescription: "Panela, maíz blanco y zanahoria al rescoldo.", description: "Costilla de res braseada durante ocho horas, glaseada con fondo de panela, puré sedoso de maíz blanco y vegetales al rescoldo.", priceCents: 2850, imageUrl: "/images/costilla.webp", featured: true, chef: true, tags: ["Sin gluten"], ingredients: ["Costilla de res", "Panela", "Maíz blanco", "Zanahoria", "Cebolla larga"], allergens: [], spicyLevel: null },
  { category: "fuego-lento", name: "Pato y mortiño", slug: "pato-y-mortino", shortDescription: "Pechuga rosada, yuca ahumada y jugo de mortiño.", description: "Pechuga de pato dorada, yuca ahumada, cebolla perla y una salsa breve de mortiño que aporta acidez y profundidad.", priceCents: 2950, imageUrl: "/images/costilla.webp", featured: false, chef: false, tags: ["Sin gluten"], ingredients: ["Pato", "Mortiño", "Yuca", "Cebolla perla"], allergens: [], spicyLevel: null },
  { category: "de-la-huerta", name: "Coliflor de carbón", slug: "coliflor-de-carbon", shortDescription: "Maní, uvilla y hojas amargas.", description: "Coliflor asada entera y laminada, salsa de maní tostado, uvillas frescas y encurtidas, hojas amargas y aceite verde.", priceCents: 1650, imageUrl: "/images/coliflor.webp", featured: true, chef: false, tags: ["Vegano", "Sin gluten"], ingredients: ["Coliflor", "Maní", "Uvilla", "Hojas de temporada"], allergens: ["Maní"], spicyLevel: null },
  { category: "de-la-huerta", name: "Locro abierto", slug: "locro-abierto", shortDescription: "Papa chola, aguacate, queso y crocante de achiote.", description: "Los sabores del locro quiteño presentados por capas: crema de papa chola, aguacate, queso fresco y crocante teñido de achiote.", priceCents: 1450, imageUrl: "/images/tiradito.webp", featured: false, chef: true, tags: ["Vegetariano", "Sin gluten"], ingredients: ["Papa chola", "Aguacate", "Queso fresco", "Achiote"], allergens: ["Lácteos"], spicyLevel: null },
  { category: "dulce-final", name: "Cacao 70 / sal", slug: "cacao-70-sal", shortDescription: "Bizcocho tibio, praliné y helado de sal de Mira.", description: "Bizcocho tibio de cacao nacional al 70%, praliné de almendra, nibs tostados y helado de sal de Mira.", priceCents: 1050, imageUrl: "/images/cacao.webp", featured: true, chef: true, tags: ["Vegetariano"], ingredients: ["Cacao nacional", "Almendra", "Crema", "Sal de Mira"], allergens: ["Lácteos", "Gluten", "Frutos secos"], spicyLevel: null },
  { category: "dulce-final", name: "Uvillas y cedrón", slug: "uvillas-y-cedron", shortDescription: "Crema aireada, fruta fresca y granita herbal.", description: "Uvillas frescas y confitadas, crema ligera de cedrón, granita de hierbas y merengue seco.", priceCents: 950, imageUrl: "/images/tiradito.webp", featured: false, chef: false, tags: ["Vegetariano", "Sin gluten"], ingredients: ["Uvilla", "Cedrón", "Crema", "Merengue"], allergens: ["Lácteos", "Huevo"], spicyLevel: null },
  { category: "barra", name: "Negroni de páramo", slug: "negroni-de-paramo", shortDescription: "Gin, bitter andino, vermut y romero quemado.", description: "Nuestra versión serrana del clásico, macerada con hierbas de altura y terminada con aceite de naranja.", priceCents: 1250, imageUrl: "/images/negroni.webp", featured: false, chef: true, tags: ["Vegano", "Sin gluten"], ingredients: ["Gin", "Bitter andino", "Vermut", "Naranja", "Romero"], allergens: ["Sulfitos"], spicyLevel: null },
  { category: "barra", name: "Tónica de taxo", slug: "tonica-de-taxo", shortDescription: "Taxo, quinina, limón sutil y soda.", description: "Bebida sin alcohol de taxo fresco, cordial de quinina, limón sutil y soda de la casa.", priceCents: 650, imageUrl: "/images/sala-fuego.webp", featured: false, chef: false, tags: ["Vegano", "Sin gluten", "Sin alcohol"], ingredients: ["Taxo", "Quinina", "Limón sutil", "Soda"], allergens: [], spicyLevel: null },
];

async function main() {
  await prisma.restaurant.upsert({
    where: { id: 1 },
    update: {},
    create: {
      id: 1,
      name: "Brasa Norte",
      tagline: "Cocina de altura, fuego de origen.",
      description: "Una cocina ecuatoriana contemporánea que mira al páramo, al Pacífico y a la memoria. Cocinamos con carbón, tiempo y producto cercano.",
      address: "Calle Guipúzcoa E13-27, La Floresta, Quito",
      phone: "+593 2 600 1840",
      whatsapp: "593999123456",
      email: "mesa@brasanorte.ec",
      openingHours: JSON.stringify([
        { days: "Martes — jueves", hours: "18:30 — 23:00" },
        { days: "Viernes — sábado", hours: "18:30 — 00:00" },
        { days: "Domingo — lunes", hours: "Cerrado" },
      ]),
      socialLinks: JSON.stringify({ instagram: "https://instagram.com", facebook: "https://facebook.com" }),
    },
  });

  const categoryMap = new Map<string, string>();
  for (const [index, category] of categories.entries()) {
    const saved = await prisma.menuCategory.upsert({
      where: { slug: category.slug },
      update: { ...category, displayOrder: index },
      create: { ...category, displayOrder: index },
    });
    categoryMap.set(category.slug, saved.id);
  }

  for (const [index, item] of itemSeed.entries()) {
    const categoryId = categoryMap.get(item.category);
    if (!categoryId) throw new Error(`Missing category ${item.category}`);
    await prisma.menuItem.upsert({
      where: { slug: item.slug },
      update: { imageUrl: item.imageUrl },
      create: {
        name: item.name,
        slug: item.slug,
        shortDescription: item.shortDescription,
        description: item.description,
        priceCents: item.priceCents,
        imageUrl: item.imageUrl,
        isFeatured: item.featured,
        isChefRecommendation: item.chef,
        displayOrder: index,
        dietaryTags: JSON.stringify(item.tags),
        ingredients: JSON.stringify(item.ingredients),
        allergens: JSON.stringify(item.allergens),
        spicyLevel: item.spicyLevel,
        categoryId,
      },
    });
  }

  const email = process.env.ADMIN_EMAIL;
  const password = process.env.ADMIN_PASSWORD;
  if (!email || !password) throw new Error("ADMIN_EMAIL and ADMIN_PASSWORD are required to seed the administrator.");
  await prisma.adminUser.upsert({
    where: { email },
    update: {},
    create: { email, name: "Administración", passwordHash: await hash(password, 12) },
  });
}

main()
  .then(() => prisma.$disconnect())
  .catch(async (error) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
