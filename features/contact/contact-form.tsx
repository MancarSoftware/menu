"use client";

import { Send } from "lucide-react";
import { useState } from "react";

export function ContactForm({ whatsapp }: { whatsapp: string }) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [message, setMessage] = useState("");

  function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const text = [`Hola, soy ${name.trim()}.`, `Correo: ${email.trim()}`, "", message.trim()].join("\n");
    window.open(`https://wa.me/${whatsapp}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }

  return <form className="contact-form" onSubmit={submit}>
    <label>Nombre<input required value={name} onChange={(event) => setName(event.target.value)} placeholder="Introduce tu nombre" autoComplete="name" /></label>
    <label>Correo electrónico<input required type="email" value={email} onChange={(event) => setEmail(event.target.value)} placeholder="Introduce tu correo" autoComplete="email" /></label>
    <label>Mensaje<textarea required minLength={10} value={message} onChange={(event) => setMessage(event.target.value)} placeholder="Escribe tu mensaje" rows={4} /></label>
    <button className="primary-button" type="submit"><Send aria-hidden="true" /> Enviar por WhatsApp</button>
  </form>;
}
