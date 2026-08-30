"use client";

export default function ErrorPage({ reset }: { reset: () => void }) {
  return <main id="contenido" className="state-page"><p className="eyebrow">Algo se apagó</p><h1>No pudimos servir esta página.</h1><p>El equipo ya puede revisar el problema. Puedes intentar cargarla otra vez.</p><button className="button button--solid" onClick={reset}>Intentar de nuevo</button></main>;
}
