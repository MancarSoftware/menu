import { notFound } from "next/navigation";
import { MobilePreview } from "./preview";
export default function Page() {
  if (process.env.NODE_ENV !== "development") notFound();
  return <MobilePreview />;
}
