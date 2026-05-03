import { PageHeader } from "@/components/crm/page-header";
import { getReviewItems } from "@/lib/crm/queries";
import { ReviewBoard } from "@/components/crm/review-board";

export default async function ReviewPage({
  searchParams
}: Readonly<{
  searchParams?: { item?: string };
}>) {
  const items = await getReviewItems();

  return (
    <>
      <PageHeader title="Review Queue" description="Resolve approval gates, ambiguous scoring, and manual review exceptions before outreach progresses." />
      <ReviewBoard items={items} />
    </>
  );
}
