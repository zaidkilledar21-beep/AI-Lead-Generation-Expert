import { redirect } from "next/navigation";
import type { Route } from "next";

export default function LegacyLeadPage({ params }: { params: { id: string } }) {
  redirect(`/pipeline/${params.id}` as Route<string>);
}
