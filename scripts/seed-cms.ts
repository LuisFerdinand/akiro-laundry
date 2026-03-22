// scripts/seed-cms.ts
// Run with:  npm run seed:cms
// Force-reset all CMS content:  npm run seed:cms -- --reset

import { neon } from "@neondatabase/serverless";
import { drizzle } from "drizzle-orm/neon-http";
import * as dotenv from "dotenv";
import {
  cmsSiteSettings,
  cmsNavbar,
  cmsNavLinks,
  cmsHero,
  cmsHeroStats,
  cmsServicesSection,
  cmsServiceCards,
  cmsHowItWorksSection,
  cmsHowItWorksSteps,
  cmsGallerySection,
  cmsGalleryImages,
  cmsTestimonialsSection,
  cmsTestimonials,
  cmsCtaSection,
  cmsContactItems,
  cmsFooter,
  cmsFooterLinks,
  cmsMedia,
} from "../lib/db/schema";

dotenv.config({ path: ".env.local" });

const sql = neon(process.env.DATABASE_URL!);
const db  = drizzle(sql);

// ─── Seed data ────────────────────────────────────────────────────────────────

const SITE_SETTINGS = [
  { key: "brand_name",    value: "Akiro Laundry & Perfume",                     label: "Brand Name" },
  { key: "tagline",       value: "Premium laundry service in Timor-Leste",      label: "Tagline" },
  { key: "phone",         value: "+670 7723 0001",                               label: "Phone Number" },
  { key: "whatsapp",      value: "https://wa.me/67077230001",                   label: "WhatsApp Link" },
  { key: "email",         value: "hello@akirolaundry.tl",                        label: "Email Address" },
  { key: "address",       value: "Rua de Beloi, Dili, Timor-Leste",             label: "Address" },
  { key: "maps_url",      value: "https://maps.google.com/?q=Dili,Timor-Leste", label: "Google Maps URL" },
  { key: "opening_hours", value: "Every Day · 08:00 – 20:00",                  label: "Opening Hours" },
  { key: "logo_url",      value: "",                                             label: "Logo Cloudinary URL" },
  { key: "favicon_url",   value: "",                                             label: "Favicon Cloudinary URL" },
  { key: "og_image_url",  value: "",                                             label: "OG / Social Share Image URL" },
] as const;

const NAV_LINKS = [
  { label: "Services",     href: "#services",     sortOrder: 0 },
  { label: "How It Works", href: "#how-it-works", sortOrder: 1 },
  { label: "Gallery",      href: "#gallery",      sortOrder: 2 },
  { label: "Reviews",      href: "#testimonials", sortOrder: 3 },
  { label: "Contact",      href: "#contact",      sortOrder: 4 },
] as const;

const HERO_STATS = [
  { value: "10K+",  label: "Happy Customers",    sortOrder: 0 },
  { value: "48 hr", label: "Express Turnaround", sortOrder: 1 },
  { value: "4.9 ★", label: "Google Rating",      sortOrder: 2 },
] as const;

const SERVICE_CARDS = [
  { title: "Regular Wash",        description: "Everyday clothes washed, dried, and neatly folded. Ideal for shirts, trousers, and casual wear.",                price: "From $2/kg",     imageUrl: null, imageAlt: "Clothes in a washing machine",             accentColor: "#1a7fba", sortOrder: 0 },
  { title: "Dry Cleaning",        description: "Gentle solvent-based cleaning for delicate fabrics — suits, dresses, blazers, and formal wear.",                 price: "From $4/item",   imageUrl: null, imageAlt: "Dry-cleaned suit on a hanger",             accentColor: "#d97706", sortOrder: 1 },
  { title: "Iron & Press",        description: "Professional steam-ironing for a crisp, wrinkle-free finish on all garments.",                                   price: "From $1/item",   imageUrl: null, imageAlt: "Steam iron pressing a shirt",              accentColor: "#10b981", sortOrder: 2 },
  { title: "Perfume & Fragrance", description: "Choose from our curated collection of premium fragrances to freshen your laundry.",                              price: "Add-on service", imageUrl: null, imageAlt: "Collection of fabric softener fragrances", accentColor: "#8b5cf6", sortOrder: 3 },
  { title: "Bedding & Linen",     description: "Duvets, bedsheets, pillowcases, curtains, and tablecloths — washed and fresh every time.",                       price: "From $5/set",    imageUrl: null, imageAlt: "Freshly washed bed linen",                 accentColor: "#ec4899", sortOrder: 4 },
  { title: "Express Service",     description: "Same-day or next-day turnaround when you need your clothes back in a hurry.",                                     price: "+50% surcharge", imageUrl: null, imageAlt: "Express delivery clock",                   accentColor: "#0d9488", sortOrder: 5 },
] as const;

const HOW_IT_WORKS_STEPS = [
  { stepNumber: "01", title: "Place Your Order", description: "Use our app or call us. Tell us what you need, choose your service, and pick a convenient collection time.", imageUrl: null, imageAlt: "Person placing an order on a phone",               accentColor: "#1a7fba", sortOrder: 0 },
  { stepNumber: "02", title: "We Pick It Up",    description: "Our driver arrives at your address at the scheduled time. No waiting around — we come to you.",              imageUrl: null, imageAlt: "Delivery driver picking up laundry",               accentColor: "#10b981", sortOrder: 1 },
  { stepNumber: "03", title: "We Clean It",      description: "Your laundry is washed, dried, ironed, and quality-checked in our professional facility.",                  imageUrl: null, imageAlt: "Industrial washing machines in a laundry facility", accentColor: "#8b5cf6", sortOrder: 2 },
  { stepNumber: "04", title: "Delivered Fresh",  description: "Clean, folded, and fragrant — your laundry is delivered back to your door right on schedule.",              imageUrl: null, imageAlt: "Delivery of clean laundry to front door",          accentColor: "#ec4899", sortOrder: 3 },
] as const;

const GALLERY_IMAGES = [
  { imageUrl: "https://images.unsplash.com/photo-1545173168-9f1947eebb7f?w=800&q=80",   altText: "Industrial washing machines in a row",       caption: "Commercial-grade washers",   sizeHint: "tall"   as const, sortOrder: 0 },
  { imageUrl: "https://images.unsplash.com/photo-1604335399105-a0c585fd81a1?w=800&q=80", altText: "Neatly folded laundry stacked on shelves",   caption: "Ready for delivery",         sizeHint: "square" as const, sortOrder: 1 },
  { imageUrl: "https://images.unsplash.com/photo-1582735689369-4fe89db7114c?w=800&q=80", altText: "Staff member sorting clean garments",        caption: "Careful garment sorting",    sizeHint: "square" as const, sortOrder: 2 },
  { imageUrl: "https://images.unsplash.com/photo-1558618666-fcd25c85cd64?w=1200&q=80",  altText: "Wide shot of the laundry floor",             caption: "Our main facility floor",    sizeHint: "wide"   as const, sortOrder: 3 },
  { imageUrl: "https://images.unsplash.com/photo-1517677208171-0bc6725a3e60?w=800&q=80", altText: "Clothes hanging on a rack after drying",    caption: "Air-dry finishing area",     sizeHint: "square" as const, sortOrder: 4 },
  { imageUrl: "https://images.unsplash.com/photo-1610557892470-55d9e80c0bce?w=800&q=80", altText: "Premium detergents on shelf",               caption: "Only premium products",      sizeHint: "square" as const, sortOrder: 5 },
  { imageUrl: "https://images.unsplash.com/photo-1567113463300-102a7eb3cb26?w=800&q=80", altText: "Ironing and pressing station",              caption: "Pressing & ironing station", sizeHint: "tall"   as const, sortOrder: 6 },
  { imageUrl: "https://images.unsplash.com/photo-1489274495757-95c7c837b101?w=800&q=80", altText: "Packaged laundry bags ready for pickup",    caption: "Packaged & ready",           sizeHint: "square" as const, sortOrder: 7 },
  { imageUrl: "https://images.unsplash.com/photo-1521656693074-0ef32e80a5d5?w=800&q=80", altText: "Close-up of washing machine drum",         caption: "High-capacity drums",        sizeHint: "square" as const, sortOrder: 8 },
  { imageUrl: "https://images.unsplash.com/photo-1469371670807-013ccf25f16a?w=1200&q=80", altText: "Bright reception and drop-off area",      caption: "Drop-off & reception",       sizeHint: "wide"   as const, sortOrder: 9 },
] as const;

const TESTIMONIALS = [
  { authorName: "Maria Santos",  authorRole: "Restaurant Owner",    initials: "MS", accentColor: "#1a7fba", rating: 5, body: "Akiro has been a lifesaver for my business. Our staff uniforms come back perfectly pressed every single time. The express service is incredibly fast — I can order in the morning and have everything back by evening.", sortOrder: 0 },
  { authorName: "João Carvalho", authorRole: "Hotel Manager",       initials: "JC", accentColor: "#10b981", rating: 5, body: "We use Akiro for all our hotel linen. The quality is outstanding, delivery is always on time, and their team is so professional. Our guests constantly compliment how fresh and clean everything smells.",            sortOrder: 1 },
  { authorName: "Ana Pereira",   authorRole: "Working Mother",      initials: "AP", accentColor: "#8b5cf6", rating: 5, body: "As a busy mum of three, Akiro has given me back hours of my week. The pickup and delivery is seamless, and my kids' clothes have never looked better. Highly recommend to every family!",                          sortOrder: 2 },
  { authorName: "David Mendes",  authorRole: "Corporate Executive", initials: "DM", accentColor: "#ec4899", rating: 5, body: "My suits and dress shirts require special care and Akiro delivers every time. Impeccable dry cleaning, no shrinkage, always crisp. This is the only laundry service I trust for my formal wardrobe.",               sortOrder: 3 },
  { authorName: "Sofia Alves",   authorRole: "University Student",  initials: "SA", accentColor: "#f59e0b", rating: 5, body: "The prices are super fair and the app makes it so easy to schedule. My dorm doesn't have a washing machine so Akiro is honestly a lifesaver. Love the fragrance add-on too — clothes smell amazing!",               sortOrder: 4 },
  { authorName: "Carlos Lima",   authorRole: "Gym Owner",           initials: "CL", accentColor: "#0d9488", rating: 5, body: "We send towels and sportswear in bulk every week. Akiro handles everything without any fuss — bulk pricing is fair and quality is always consistent. They've become an essential partner for our gym.",               sortOrder: 5 },
] as const;

const CONTACT_ITEMS = [
  { label: "Call Us",       value: "+670 7723 0001",                  href: "tel:+67077230001",                           iconType: "phone",    sortOrder: 0 },
  { label: "Email Us",      value: "hello@akirolaundry.tl",           href: "mailto:hello@akirolaundry.tl",               iconType: "email",    sortOrder: 1 },
  { label: "Find Us",       value: "Rua de Beloi, Dili, Timor-Leste", href: "https://maps.google.com/?q=Dili,Timor-Leste", iconType: "location", sortOrder: 2 },
  { label: "Opening Hours", value: "Every Day · 08:00 – 20:00",       href: null,                                         iconType: "hours",    sortOrder: 3 },
] as const;

const FOOTER_LINKS = [
  { column: "quick_links", label: "Services",     href: "#services",                 sortOrder: 0 },
  { column: "quick_links", label: "How It Works", href: "#how-it-works",             sortOrder: 1 },
  { column: "quick_links", label: "Gallery",      href: "#gallery",                  sortOrder: 2 },
  { column: "quick_links", label: "Reviews",      href: "#testimonials",             sortOrder: 3 },
  { column: "quick_links", label: "Contact",      href: "#contact",                  sortOrder: 4 },
  { column: "social",      label: "WhatsApp",     href: "https://wa.me/67077230001", sortOrder: 0 },
  { column: "social",      label: "Instagram",    href: "https://instagram.com/",    sortOrder: 1 },
  { column: "social",      label: "Facebook",     href: "https://facebook.com/",     sortOrder: 2 },
] as const;

// ─── Reset helper ─────────────────────────────────────────────────────────────
// Uses TRUNCATE … RESTART IDENTITY CASCADE so all serial sequences reset to 1.
// Child tables are listed first to respect FK constraints, then parents.
// CASCADE handles any remaining FK dependencies automatically.

async function resetAllCmsTables() {
  console.log("⚠️  Truncating CMS tables and resetting ID sequences…");

  // Single TRUNCATE statement with all tables — Postgres handles FK order
  // automatically when CASCADE is specified.
  await sql`
    TRUNCATE TABLE
      cms_media,
      cms_footer_links,
      cms_footer,
      cms_contact_items,
      cms_cta_section,
      cms_testimonials,
      cms_testimonials_section,
      cms_gallery_images,
      cms_gallery_section,
      cms_how_it_works_steps,
      cms_how_it_works_section,
      cms_service_cards,
      cms_services_section,
      cms_hero_stats,
      cms_hero,
      cms_nav_links,
      cms_navbar,
      cms_site_settings,
      cms_seo_settings
    RESTART IDENTITY CASCADE
  `;

  console.log("   ✓ All CMS tables truncated, IDs reset to 1\n");
}

// ─── Main ─────────────────────────────────────────────────────────────────────

async function seedCms() {
  const resetMode = process.argv.includes("--reset");
  console.log(`🌱 Seeding CMS… ${resetMode ? "(--reset: truncating all CMS tables and restarting IDs)" : ""}\n`);

  if (resetMode) {
    await resetAllCmsTables();
  }

  // 1. Site Settings
  console.log("⚙️  Seeding site settings…");
  await db.insert(cmsSiteSettings).values([...SITE_SETTINGS]).onConflictDoNothing();
  console.log(`   ✓ ${SITE_SETTINGS.length} settings inserted`);

  // 2. Navbar
  console.log("🧭 Seeding navbar…");
  const [navbar] = await db
    .insert(cmsNavbar)
    .values({ brandName: "Akiro Laundry", logoUrl: null, logoAlt: "Akiro Laundry logo", ctaLabel: "Book Now", ctaHref: "#contact", isActive: true })
    .onConflictDoNothing()
    .returning();
  if (navbar) {
    await db.insert(cmsNavLinks).values(NAV_LINKS.map((l) => ({ ...l, navbarId: navbar.id }))).onConflictDoNothing();
    console.log(`   ✓ Navbar + ${NAV_LINKS.length} nav links inserted`);
  } else {
    console.log("   – Navbar already exists, skipped");
  }

  // 3. Hero
  console.log("🦸 Seeding hero…");
  const [hero] = await db
    .insert(cmsHero)
    .values({
      badge: "Open Today · 08:00 – 20:00", headline: "Fresh Laundry,", headlineAccent: "Delivered", headlineSuffix: "to Your Door.",
      subtext: "Professional laundry & dry-cleaning service with fast turnaround. We pick up, we clean, we deliver — so you don't have to lift a finger.",
      primaryCtaLabel: "Order a Pickup", primaryCtaHref: "#contact",
      secondaryCtaLabel: "View Services", secondaryCtaHref: "#services",
      heroImageUrl: null, heroImageAlt: "Freshly laundered clothes ready for delivery", isActive: true,
    })
    .onConflictDoNothing()
    .returning();
  if (hero) {
    await db.insert(cmsHeroStats).values(HERO_STATS.map((s) => ({ ...s, heroId: hero.id }))).onConflictDoNothing();
    console.log(`   ✓ Hero + ${HERO_STATS.length} stats inserted`);
  } else {
    console.log("   – Hero already exists, skipped");
  }

  // 4. Services
  console.log("🧺 Seeding services…");
  const [servicesSection] = await db
    .insert(cmsServicesSection)
    .values({ badge: "What We Offer", headline: "Every Fabric, Every Need", subtext: "From your daily work shirts to your finest silk gowns — we handle it all with care, precision, and a personal touch.", isActive: true })
    .onConflictDoNothing()
    .returning();
  if (servicesSection) {
    await db.insert(cmsServiceCards).values(SERVICE_CARDS.map((c) => ({ ...c, sectionId: servicesSection.id }))).onConflictDoNothing();
    console.log(`   ✓ Services section + ${SERVICE_CARDS.length} cards inserted`);
  } else {
    console.log("   – Services section already exists, skipped");
  }

  // 5. How It Works
  console.log("🔄 Seeding how it works…");
  const [howSection] = await db
    .insert(cmsHowItWorksSection)
    .values({ badge: "Simple Process", headline: "Laundry Done in 4 Easy Steps", subtext: "We handle everything from collection to delivery so your day stays free.", isActive: true })
    .onConflictDoNothing()
    .returning();
  if (howSection) {
    await db.insert(cmsHowItWorksSteps).values(HOW_IT_WORKS_STEPS.map((s) => ({ ...s, sectionId: howSection.id }))).onConflictDoNothing();
    console.log(`   ✓ How It Works section + ${HOW_IT_WORKS_STEPS.length} steps inserted`);
  } else {
    console.log("   – How It Works section already exists, skipped");
  }

  // 6. Gallery
  console.log("🖼️  Seeding gallery…");
  const [gallerySection] = await db
    .insert(cmsGallerySection)
    .values({ badge: "Our Facility", headline: "A Glimpse Inside Akiro", subtext: "Clean space, professional care — see where the magic happens.", isActive: true })
    .onConflictDoNothing()
    .returning();
  if (gallerySection) {
    await db
      .insert(cmsGalleryImages)
      .values(GALLERY_IMAGES.map((img) => ({ ...img, sectionId: gallerySection.id, isActive: true })))
      .onConflictDoNothing();
    console.log(`   ✓ Gallery section + ${GALLERY_IMAGES.length} images inserted`);
    console.log("   💡 imageUrl fields use Unsplash placeholders — replace with Cloudinary URLs after uploading real photos.");
  } else {
    console.log("   – Gallery section already exists, skipped");
  }

  // 7. Testimonials
  console.log("⭐ Seeding testimonials…");
  const [testimonialsSection] = await db
    .insert(cmsTestimonialsSection)
    .values({ badge: "Customer Love", headline: "Trusted by Thousands", subtext: "Don't just take our word for it — here's what our customers say.", aggregateRating: "4.9", reviewCount: "2,400+", isActive: true })
    .onConflictDoNothing()
    .returning();
  if (testimonialsSection) {
    await db
      .insert(cmsTestimonials)
      .values(TESTIMONIALS.map((t) => ({ ...t, sectionId: testimonialsSection.id, avatarUrl: null, avatarAlt: `Photo of ${t.authorName}` })))
      .onConflictDoNothing();
    console.log(`   ✓ Testimonials section + ${TESTIMONIALS.length} reviews inserted`);
  } else {
    console.log("   – Testimonials section already exists, skipped");
  }

  // 8. CTA
  console.log("📣 Seeding CTA section…");
  const ctaInserted = await db
    .insert(cmsCtaSection)
    .values({
      badge: "Ready to Get Started?", headline: "Book Your First Pickup", headlineAccent: "Free of Charge",
      subtext: "New customers get their first pickup delivery fee waived. Experience premium laundry service risk-free.",
      primaryCtaLabel: "Call Now", primaryCtaHref: "tel:+67077230001",
      secondaryCtaLabel: "WhatsApp", secondaryCtaHref: "https://wa.me/67077230001",
      bgImageUrl: null, isActive: true,
    })
    .onConflictDoNothing()
    .returning();
  console.log(ctaInserted.length > 0 ? "   ✓ CTA section inserted" : "   – CTA section already exists, skipped");

  // 9. Contact Items
  console.log("📬 Seeding contact items…");
  await db.insert(cmsContactItems).values(CONTACT_ITEMS.map((c) => ({ ...c, iconUrl: null, isActive: true }))).onConflictDoNothing();
  console.log(`   ✓ ${CONTACT_ITEMS.length} contact items inserted`);

  // 10. Footer
  console.log("🦶 Seeding footer…");
  const [footer] = await db
    .insert(cmsFooter)
    .values({ brandName: "Akiro Laundry", tagline: "Premium laundry & dry-cleaning service in Timor-Leste.", logoUrl: null, logoAlt: "Akiro Laundry", copyrightText: `© ${new Date().getFullYear()} Akiro Laundry & Perfume. All rights reserved.`, isActive: true })
    .onConflictDoNothing()
    .returning();
  if (footer) {
    await db.insert(cmsFooterLinks).values(FOOTER_LINKS.map((l) => ({ ...l, footerId: footer.id, iconUrl: null, isActive: true }))).onConflictDoNothing();
    console.log(`   ✓ Footer + ${FOOTER_LINKS.length} links inserted`);
  } else {
    console.log("   – Footer already exists, skipped");
  }

  console.log("\n✅ CMS seeded successfully!");
  console.log("\n📋 Summary:");
  console.log(`   • ${SITE_SETTINGS.length} site settings`);
  console.log(`   • ${NAV_LINKS.length} nav links`);
  console.log(`   • ${HERO_STATS.length} hero stats`);
  console.log(`   • ${SERVICE_CARDS.length} service cards`);
  console.log(`   • ${HOW_IT_WORKS_STEPS.length} how-it-works steps`);
  console.log(`   • ${GALLERY_IMAGES.length} gallery images`);
  console.log(`   • ${TESTIMONIALS.length} testimonials`);
  console.log(`   • ${CONTACT_ITEMS.length} contact items`);
  console.log(`   • ${FOOTER_LINKS.length} footer links`);
  console.log("\n💡 Gallery image URLs are Unsplash placeholders. Upload real photos to Cloudinary,");
  console.log("   then update imageUrl in each cms_gallery_images row (or re-run seed:cms --reset).");
  process.exit(0);
}

seedCms().catch((err) => {
  console.error("❌ CMS seed failed:", err);
  process.exit(1);
});