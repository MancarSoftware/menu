import { UtensilsCrossed } from "lucide-react";

export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark" aria-label="El Bueno">
      <UtensilsCrossed aria-hidden="true" className="brand-mark__icon" />
      {!compact && <span className="brand-mark__text">El Bueno</span>}
    </span>
  );
}
