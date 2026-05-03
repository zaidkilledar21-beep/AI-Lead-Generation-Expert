import { redirect } from "next/navigation";
import type { Route } from "next";

export default function LegacyLeadPage({ params }: { params: { id: string } }) {
  const target = `/pipeline/${params.id}` as unknown as Route;
  redirect(target);
}
