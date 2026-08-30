"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="contenido" className="state-page"><p className="eyebrow">Algo salió mal</p><h1>No pudimos cargar esta página.</h1><p>Inténtalo nuevamente en unos segundos.</p><button className="button button--solid" onClick={reset}>Intentar de nuevo</button></main>;
}
