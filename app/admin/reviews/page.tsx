// app/admin/reviews/page.tsx
import { getCustomerReviews } from "@/lib/actions/admin-reviews";
import { ReviewsClient } from "@/components/admin/ReviewsClient";

export default async function AdminReviewsPage() {
  const reviews = await getCustomerReviews();
  return <ReviewsClient reviews={reviews} />;
}
