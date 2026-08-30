import Link from "next/link";

export default function NotFound() {
  return <main id="contenido" className="state-page"><p className="eyebrow">Error 404</p><h1>No encontramos esa página.</h1><p>El enlace cambió o ya no está disponible.</p><Link className="button button--solid" href="/">Volver al inicio</Link></main>;
}
