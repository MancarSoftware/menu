export type OpeningHour = { days: string; hours: string };
export type SocialLinks = { instagram?: string; facebook?: string; tiktok?: string };

export type RestaurantView = {
  id: number;
  name: string;
  tagline: string;
  description: string;
  address: string;
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
