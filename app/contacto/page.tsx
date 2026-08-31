import type { Metadata } from "next";
import { Mail, MapPin, Phone } from "lucide-react";
import { ContactForm } from "@/features/contact/contact-form";
import { getRestaurant } from "@/lib/menu-repository";

export const metadata: Metadata = { title: "Contacto" };

export default async function ContactPage() {
  const restaurant = await getRestaurant();
  return <main id="contenido" className="fast-page info-page contact-page">
    <section><h1>Contáctanos</h1><p>¿Tienes una pregunta o quieres hacer un pedido especial? Escríbenos.</p><ContactForm whatsapp={restaurant.whatsapp} /></section>
    <aside className="contact-details">
      <a href={`https://www.openstreetmap.org/?mlat=${restaurant.latitude}&mlon=${restaurant.longitude}#map=17/${restaurant.latitude}/${restaurant.longitude}`} target="_blank" rel="noreferrer"><MapPin aria-hidden="true" /><span><strong>Nuestra dirección</strong>{restaurant.address}</span></a>
      <a href={`tel:${restaurant.phone.replace(/\s/g, "")}`}><Phone aria-hidden="true" /><span><strong>Llámanos</strong>{restaurant.phone}</span></a>
      <a href={`mailto:${restaurant.email}`}><Mail aria-hidden="true" /><span><strong>Envíanos un email</strong>{restaurant.email}</span></a>
    </aside>
  </main>;
}
