"use client";
import { useEffect, useState } from "react";
import { getBusinessDate } from "@/lib/business-date";

export function useBusinessToday() {
  const [today, setToday] = useState(() => getBusinessDate());
  useEffect(() => {
    const update = () => setToday(getBusinessDate());
    const interval = window.setInterval(update, 5000);
    window.addEventListener("focus", update);
    return () => { window.clearInterval(interval); window.removeEventListener("focus", update); };
  }, []);
  return today;
}
