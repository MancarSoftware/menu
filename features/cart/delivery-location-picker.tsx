"use client";

import { useEffect, useRef, useState } from "react";
import { LocateFixed, MapPin, Check } from "lucide-react";
import type { Map as LeafletMap } from "leaflet";
import type { DeliveryPoint } from "@/lib/domain";

export function DeliveryLocationPicker({ center, value, onChange }: { center: DeliveryPoint; value: DeliveryPoint | null; onChange: (point: DeliveryPoint | null) => void }) {
  const container = useRef<HTMLDivElement>(null);
  const map = useRef<LeafletMap | null>(null);
  const change = useRef(onChange);
  const initial = useRef(value ?? center);
  const mounted = useRef(false);
  const [ready, setReady] = useState(false);
  const [locating, setLocating] = useState(false);
  const [candidate, setCandidate] = useState<DeliveryPoint | null>(value);
  const [error, setError] = useState("");
  const [accuracy, setAccuracy] = useState<number | null>(null);
  useEffect(() => { change.current = onChange; }, [onChange]);

  useEffect(() => {
    mounted.current = true;
    let disposed = false;
    let instance: LeafletMap | undefined;
    void import("leaflet").then((L) => {
      if (disposed || !container.current) return;
      instance = L.map(container.current, { scrollWheelZoom: false }).setView([initial.current.latitude, initial.current.longitude], 15);
      map.current = instance;
      L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener noreferrer">OpenStreetMap</a>',
      }).on("tileerror", () => { if (!disposed) setError("No pudimos cargar parte del mapa. Revisa tu conexión antes de confirmar el punto."); }).addTo(instance);
      instance.on("movestart", () => change.current(null));
      instance.on("moveend", () => {
        const point = instance!.getCenter().wrap();
        setCandidate({ latitude: point.lat, longitude: point.lng });
      });
      instance.on("click", (event) => {
        change.current(null);
        instance!.panTo(event.latlng);
        const point = event.latlng.wrap();
        setCandidate({ latitude: point.lat, longitude: point.lng });
      });
      setReady(true);
    }).catch(() => { if (!disposed) setError("No pudimos abrir el mapa. Recarga la página e inténtalo otra vez."); });
    return () => { disposed = true; mounted.current = false; instance?.remove(); map.current = null; };
  }, []);

  function locate() {
    if (!navigator.geolocation) { setError("Tu navegador no ofrece ubicación. Elige el punto en el mapa."); return; }
    setLocating(true); setError("");
    navigator.geolocation.getCurrentPosition((position) => {
      if (!mounted.current) return;
      const point = { latitude: position.coords.latitude, longitude: position.coords.longitude };
      onChange(null);
      map.current?.setView([point.latitude, point.longitude], 18);
      setCandidate(point);
      setAccuracy(Math.round(position.coords.accuracy));
      setLocating(false);
    }, (reason) => {
      if (!mounted.current) return;
      setLocating(false);
      setError(reason.code === 1 ? "No diste permiso de ubicación. Puedes elegir el punto manualmente en el mapa." : "No pudimos obtener tu ubicación. Inténtalo otra vez o elige el punto en el mapa.");
    }, { enableHighAccuracy: true, timeout: 12000, maximumAge: 0 });
  }

  return <section className="delivery-location" aria-labelledby="delivery-location-title">
    <header><MapPin aria-hidden="true" /><div><h3 id="delivery-location-title">¿Dónde te lo llevamos?</h3><p>Comparte tu ubicación o mueve el mapa hasta la entrada de tu dirección.</p></div></header>
    <button type="button" className="delivery-location__gps" disabled={!ready || locating} onClick={locate}><LocateFixed aria-hidden="true" />{locating ? "Buscando tu ubicación…" : "Usar mi ubicación actual"}</button>
    <div className="delivery-location__map-wrap">
      <div ref={container} className="delivery-location__map" role="region" aria-label="Mapa de entrega. Usa las flechas para moverlo y más o menos para acercar." />
      <span className="delivery-location__pin" aria-hidden="true"><MapPin /></span>
      {!ready && <span className="delivery-location__loading" role="status">Cargando mapa…</span>}
    </div>
    {error && <p className="checkout-error" role="alert">{error}</p>}
    <p className="delivery-location__help">El pin marca la entrada. Puedes tocar el mapa o moverlo con las flechas del teclado.{accuracy !== null && ` Precisión GPS aproximada: ${accuracy} m; ajusta el punto si hace falta.`}</p>
    <button className="delivery-location__confirm" type="button" disabled={!ready || !candidate || locating || !!value} onClick={() => { if (candidate) onChange(candidate); }}><Check aria-hidden="true" />{value ? "Punto de entrega confirmado" : "Confirmar este punto de entrega"}</button>
    <p role="status">{value ? "Ubicación lista. Si mueves el mapa, vuelve a confirmarla." : "Confirma el punto para poder enviar tu pedido."}</p>
    <small>Guardaremos este punto con tu pedido y lo compartiremos con el local y el repartidor asignado. El mapa usa OpenStreetMap; no rastreamos tu ubicación en tiempo real.</small>
  </section>;
}
