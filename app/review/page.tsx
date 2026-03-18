// app/review/page.tsx
import ReviewForm from "@/components/public/ReviewForm";

export const metadata = {
  title: "Leave a Review — Akiro Laundry",
  description: "Share your experience with Akiro Laundry & Perfume. We love hearing from our customers!",
};

export default function ReviewPage() {
  return <ReviewForm />;
}