export function BrandMark({ compact = false }: { compact?: boolean }) {
  return (
    <span className="brand-mark" aria-label="Brasa Norte">
      <svg aria-hidden="true" viewBox="0 0 28 36" className="brand-mark__icon">
        <path d="M15.8 1.4c1.1 7.2-4.7 9.8-3.1 15.2 1-2.5 3.2-4 5.4-5.8 3.6 4.7 5.6 8.6 4.6 13.4C21.6 30 17.4 34 12.1 34 5.8 34 1.4 29.6 1.4 23.5c0-7.2 5.8-10.8 14.4-22.1Z" />
        <path className="brand-mark__cut" d="M13.4 19.2c3 3.1 3.5 5.5 2.5 7.8-.8 1.9-2.2 3.2-4.3 3.6 1-1.7.5-3.2-.5-4.7-1.2-1.8-.2-4 2.3-6.7Z" />
      </svg>
      <span className="brand-mark__text">
        <span>Brasa</span>
        {!compact && <span>Norte</span>}
      </span>
    </span>
  );
}
