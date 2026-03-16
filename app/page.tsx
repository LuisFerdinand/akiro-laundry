// app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import Navbar from "@/components/public/Navbar";
import HeroSection from "@/components/public/HeroSection";
import ServicesSection from "@/components/public/ServicesSection";
import HowItWorksSection from "@/components/public/HowItWorksSection";
import TestimonialsSection from "@/components/public/TestimonialsSection";
import CTASection from "@/components/public/CTASection";
import Footer from "@/components/public/Footer";

export default async function RootPage() {
  const session = await auth();

  // Redirect logged-in users straight to their portal
  if (session?.user?.role === "admin")    redirect("/admin");
  if (session?.user?.role === "employee") redirect("/employee");

  // Everyone else sees the public landing page
  return (
    <main className="akiro-page-bg">
      <Navbar />
      <HeroSection />
      <ServicesSection />
      <HowItWorksSection />
      <TestimonialsSection />
      <CTASection />
      <Footer />
    </main>
  );
}