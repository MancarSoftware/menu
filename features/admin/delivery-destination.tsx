"use client";

import { useState } from "react";
import { MapPinned } from "lucide-react";
import type { OrderView } from "@/lib/domain";
import { confirmedDeliveryPoint, deliveryDirectionsUrl } from "@/lib/delivery";

export function DeliveryDestination({ order, compact = false }: {
  order: Pick<OrderView, "deliveryLatitude" | "deliveryLongitude" | "deliveryAddress">; compact?: boolean;
}) {
  const [showMap, setShowMap] = useState(false);
  const point = confirmedDeliveryPoint(order);
  const route = deliveryDirectionsUrl(order);
  const preview = point ? `https://www.openstreetmap.org/export/embed.html?${new URLSearchParams({ bbox: `${Math.max(-180, point.longitude - .005)},${Math.max(-90, point.latitude - .005)},${Math.min(180, point.longitude + .005)},${Math.min(90, point.latitude + .005)}`, layer: "mapnik", marker: `${point.latitude},${point.longitude}` })}` : null;
  return <section className="delivery-destination" aria-label="Destino de entrega">
    <strong><MapPinned aria-hidden="true" />{point ? "Ubicación de entrega confirmada" : "Pedido anterior sin punto confirmado"}</strong>
    {point ? <small>La ruta usa el punto del mapa, no la referencia escrita.</small> : <small>Confirma el destino con el cliente. {route ? "La ruta disponible usa la dirección antigua." : "Este pedido no tiene un destino utilizable."}</small>}
    {order.deliveryAddress && <p><b>{point ? "Referencia" : "Dirección antigua"}:</b> {order.deliveryAddress}</p>}
    {!compact && <div className="delivery-destination__actions">
      {route && <a className="button button--line" href={route} target="_blank" rel="noopener noreferrer"><MapPinned aria-hidden="true" />Abrir ruta</a>}
      {preview && <button type="button" className="button button--line" aria-expanded={showMap} onClick={() => setShowMap(!showMap)}>{showMap ? "Ocultar mapa" : "Ver punto"}</button>}
    </div>}
    {!compact && showMap && preview && <div className="delivery-destination__preview"><iframe title="Punto de entrega confirmado en OpenStreetMap" src={preview} loading="lazy" referrerPolicy="no-referrer" /><small>Vista de referencia; abre la ruta para navegar hasta la entrada.</small></div>}
  </section>;
}
