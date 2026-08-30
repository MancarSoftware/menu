import Link from "next/link";

export default function NotFound() {
  return <main id="contenido" className="state-page"><p className="eyebrow">404 · Mesa vacía</p><h1>Esto no estaba en la carta.</h1><p>La página que buscas cambió de lugar o ya no está disponible.</p><Link className="button button--solid" href="/">Volver a la casa</Link></main>;
}
