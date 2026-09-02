import { z } from "zod";

const stringList = z.array(z.string().trim().min(1).max(80)).max(20).default([]);

export const categorySchema = z.object({
  name: z.string().trim().min(2).max(80),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(90),
  description: z.string().trim().min(5).max(240),
  displayOrder: z.number().int().min(0).max(999),
  isActive: z.boolean(),
});

export const menuItemSchema = z.object({
  name: z.string().trim().min(2).max(120),
  slug: z.string().trim().regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/).max(130),
  shortDescription: z.string().trim().min(5).max(180),
  description: z.string().trim().min(10).max(1000),
  priceCents: z.number().int().min(1).max(10000000),
  imageUrl: z.string().trim().min(1).max(500),
  categoryId: z.string().min(1),
  isAvailable: z.boolean(),
  isFeatured: z.boolean(),
  isChefRecommendation: z.boolean(),
  displayOrder: z.number().int().min(0).max(9999),
  dietaryTags: stringList,
  ingredients: stringList,
  allergens: stringList,
  spicyLevel: z.number().int().min(0).max(3).nullable(),
});

export const restaurantSchema = z.object({
  name: z.string().trim().min(2).max(100),
  tagline: z.string().trim().min(5).max(160),
  description: z.string().trim().min(20).max(1000),
  address: z.string().trim().min(5).max(240),
  city: z.string().trim().min(2).max(100),
  countryCode: z.literal("EC"),
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
  phone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/),
  whatsapp: z.string().trim().regex(/^593\d{9}$/),
  email: z.email(),
  openingHours: z.array(z.object({ days: z.string().min(2).max(80), hours: z.string().min(2).max(80) })).max(14),
  socialLinks: z.object({
    instagram: z.url().optional().or(z.literal("")),
    facebook: z.url().optional().or(z.literal("")),
    tiktok: z.url().optional().or(z.literal("")),
  }),
});

export const loginSchema = z.object({ email: z.email(), password: z.string().min(8).max(200) });

export const diningTableSchema = z.object({
  number: z.number().int().min(1).max(999),
  name: z.string().trim().min(2).max(80),
  capacity: z.number().int().min(1).max(30),
  isActive: z.boolean(),
});

export const diningTableStatusSchema = z.enum(["AVAILABLE", "OCCUPIED", "CLEANING", "INACTIVE"]);
export const orderStatusSchema = z.enum(["RECEIVED", "PREPARING", "READY", "SERVED", "PAID", "CANCELLED"]);
export const paymentMethodSchema = z.enum(["CASH", "CARD", "TRANSFER"]);
export const staffRoleSchema = z.enum(["ADMIN", "CASHIER", "WAITER", "KITCHEN", "DRIVER"]);
export const deliveryPointSchema = z.object({
  latitude: z.number().finite().min(-90).max(90),
  longitude: z.number().finite().min(-180).max(180),
});

export const dineInOrderSchema = z.object({
  clientRequestId: z.uuid(),
  notes: z.string().trim().max(500).default(""),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
    customizationKey: z.string().max(1000).default("standard"),
  })).min(1).max(40),
});

export const publicOrderSchema = dineInOrderSchema.extend({
  mode: z.enum(["DELIVERY", "PICKUP"]),
  customerName: z.string().trim().min(2).max(100),
  customerPhone: z.string().trim().regex(/^\+?[0-9\s-]{7,20}$/),
  deliveryAddress: z.string().trim().max(240).optional().default(""),
  deliveryPoint: deliveryPointSchema.optional(),
}).refine((value) => value.mode !== "DELIVERY" || !!value.deliveryPoint, {
  message: "Comparte tu ubicación o confirma el punto de entrega en el mapa.",
  path: ["deliveryPoint"],
}).transform((value) => value.mode === "PICKUP" ? { ...value, deliveryAddress: "", deliveryPoint: undefined } : value);

export const passwordSchema = z.string().min(12).max(200)
  .regex(/[A-Z]/, "Incluye una mayúscula.")
  .regex(/[a-z]/, "Incluye una minúscula.")
  .regex(/[0-9]/, "Incluye un número.");
