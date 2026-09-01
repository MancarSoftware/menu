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
export type OrderMode = "DINE_IN" | "DELIVERY" | "PICKUP";
export type PaymentMethod = "CASH" | "CARD" | "TRANSFER";
export type StaffRole = "ADMIN" | "CASHIER" | "WAITER" | "KITCHEN";
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
  orderNumber: number;
  businessDate: string;
  publicId: string;
  mode: OrderMode;
  status: OrderStatus;
  paymentStatus: "PENDING" | "PAID" | "PARTIALLY_REFUNDED" | "REFUNDED";
  paymentMethod: PaymentMethod | null;
  subtotalCents: number;
  totalCents: number;
  notes: string;
  customerName: string | null;
  customerPhone: string | null;
  deliveryAddress: string | null;
  acknowledgedAt: string | null;
  version: number;
  createdAt: string;
  table: Pick<DiningTableView, "id" | "number" | "name"> | null;
  items: OrderItemView[];
};

export type AdminMetricsView = {
  date: string;
  revenueCents: number;
  paidOrderCount: number;
};

export type RevenuePoint = { label: string; revenueCents: number; paymentCount: number };
export type RevenueReportView = {
  from: string;
  to: string;
  revenueCents: number;
  refundsCents: number;
  netRevenueCents: number;
  paymentCount: number;
  points: RevenuePoint[];
};

export type CashShiftView = {
  id: string;
  businessDate: string;
  status: "OPEN" | "CLOSED";
  openingBalanceCents: number;
  cashSalesCents: number;
  expectedCashCents: number;
  actualCashCents: number | null;
  discrepancyCents: number | null;
  openedByName: string;
  closedByName: string | null;
  openedAt: string;
  closedAt: string | null;
};

export type StaffUserView = {
  id: string;
  email: string;
  name: string;
  role: StaffRole;
  isActive: boolean;
  mustChangePassword: boolean;
  lastLoginAt: string | null;
};
