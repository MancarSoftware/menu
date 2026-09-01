export type OpeningHour = { days: string; hours: string };
export type SocialLinks = { instagram?: string; facebook?: string; tiktok?: string };

export type RestaurantView = {
  id: number;
  name: string;
  tagline: string;
  description: string;
  address: string;
  city: string;
  countryCode: string;
  latitude: number;
  longitude: number;
  phone: string;
  whatsapp: string;
  email: string;
  openingHours: OpeningHour[];
  socialLinks: SocialLinks;
};

export type MenuItemView = {
  id: string;
  name: string;
  slug: string;
  shortDescription: string;
  description: string;
  priceCents: number;
  imageUrl: string;
  isAvailable: boolean;
  isFeatured: boolean;
  isChefRecommendation: boolean;
  displayOrder: number;
  dietaryTags: string[];
  ingredients: string[];
  allergens: string[];
  spicyLevel: number | null;
  categoryId: string;
  categoryName: string;
  categorySlug: string;
};

export type MenuCategoryView = {
  id: string;
  name: string;
  slug: string;
  description: string;
  displayOrder: number;
  isActive: boolean;
  items: MenuItemView[];
};

export type DiningTableStatus = "AVAILABLE" | "OCCUPIED" | "CLEANING" | "INACTIVE";
export type DiningTableView = {
  id: string;
  code: string;
  number: number;
  name: string;
  capacity: number;
  status: DiningTableStatus;
  isActive: boolean;
};

export type OrderStatus = "RECEIVED" | "PREPARING" | "READY" | "SERVED" | "PAID" | "CANCELLED";
export type OrderItemView = {
  id: string;
  productName: string;
  quantity: number;
  unitPriceCents: number;
  lineTotalCents: number;
  customization: string[];
};

export type OrderView = {
  id: number;
  publicId: string;
  mode: "DINE_IN";
  status: OrderStatus;
  paymentStatus: "PENDING" | "PAID";
  paymentMethod: string | null;
  subtotalCents: number;
  totalCents: number;
  notes: string;
  createdAt: string;
  table: Pick<DiningTableView, "id" | "number" | "name"> | null;
  items: OrderItemView[];
};

export type AdminMetricsView = {
  revenueCents: number;
  paidOrderCount: number;
};
