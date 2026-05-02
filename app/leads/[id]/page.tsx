import { redirect } from "next/navigation";

export default function LegacyLeadPage({ params }: { params: { id: string } }) {
  redirect(`/pipeline/${params.id}`);
}
