// app/page.tsx
import { auth } from "@/auth";
import { redirect } from "next/navigation";
import { getLandingPageData } from "@/lib/db/queries/cms.queries";
import Navbar from "@/components/public/Navbar";
import HeroSection from "@/components/public/HeroSection";
import ServicesSection from "@/components/public/ServicesSection";
import HowItWorksSection from "@/components/public/HowItWorksSection";
import TestimonialsSection from "@/components/public/TestimonialsSection";
import CTASection from "@/components/public/CTASection";
import Footer from "@/components/public/Footer";

export default async function RootPage() {
  const session = await auth();

  if (session?.user?.role === "admin")    redirect("/admin");
  if (session?.user?.role === "employee") redirect("/employee");

  const data = await getLandingPageData();

  return (
    <main className="akiro-page-bg">
      <Navbar data={data.navbar} />
      <HeroSection data={data.hero} />
      <ServicesSection data={data.services} />
      <HowItWorksSection data={data.howItWorks} />
      <TestimonialsSection data={data.testimonials} />
      <CTASection cta={data.cta} contactItems={data.contactItems} />
      <Footer data={data.footer} />
    </main>
  );
}