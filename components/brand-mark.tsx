export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark" aria-label="El Bueno">
      <span className="brand-mark__seal" aria-hidden="true">EB</span>
      {!compact && <span className="brand-mark__text">El Bueno</span>}
    </span>
  );
}
