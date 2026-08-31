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

export const dineInOrderSchema = z.object({
  clientRequestId: z.uuid(),
  notes: z.string().trim().max(500).default(""),
  items: z.array(z.object({
    productId: z.string().min(1),
    quantity: z.number().int().min(1).max(20),
    customizationKey: z.string().max(1000).default("standard"),
  })).min(1).max(40),
});
