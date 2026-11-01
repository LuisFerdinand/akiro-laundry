// components/admin/layout/nav-config.ts
//
// One menu definition for the admin console: the desktop sidebar renders every
// group, the phone bottom bar pins the four daily pages and tucks the rest
// behind "More".

import {
  LayoutDashboard, ShoppingBag, Users, Wrench, Wallet, Banknote, BookOpen, Notebook,
  Package, UserCog, Settings, FileText, ImageIcon, Star, Megaphone, LayoutTemplate,
  Navigation, Layers, Mail, MessageCircle, Send, Search, Receipt, Tags,
} from "lucide-react";

export type NavItem = {
  href:   string;
  icon:   React.ElementType;
  label:  string;
  exact?: boolean;
};

export type NavGroup = {
  label: string;
  items: NavItem[];
};

export const NAV_GROUPS: NavGroup[] = [
  {
    label: "Overview",
    items: [
      { href: "/admin",           icon: LayoutDashboard, label: "Dashboard",     exact: true },
      { href: "/admin/orders",    icon: ShoppingBag,     label: "Orders"                    },
      { href: "/admin/customers", icon: Users,           label: "Customers"                  },
      { href: "/admin/marketing", icon: Megaphone,       label: "Marketing"                  },
      { href: "/admin/wa-promo",  icon: Send,            label: "Promo Blast"                },
      { href: "/admin/reviews",   icon: Star,            label: "Reviews"                    },
    ],
  },
  {
    label: "Finance",
    items: [
      { href: "/admin/cash-register", icon: Wallet,   label: "Cash Register" },
      { href: "/admin/daily-cash",    icon: Banknote, label: "Daily Cash"    },
      { href: "/admin/buku-besar",    icon: BookOpen, label: "Buku Besar"    },
      { href: "/admin/buku-kecil",    icon: Notebook, label: "Buku Kecil"    },
    ],
  },
  {
    label: "Catalogue",
    items: [
      { href: "/admin/services", icon: Wrench,   label: "Services" },
      { href: "/admin/products", icon: Package,  label: "Products" },
    ],
  },
  {
    label: "Master Data",
    items: [
      { href: "/admin/expense-categories", icon: Tags, label: "Expense Categories" },
    ],
  },
  {
    label: "Content",
    items: [
      { href: "/admin/cms",                icon: Layers,        label: "CMS Overview"  },
      { href: "/admin/cms/navbar",           icon: Navigation,    label: "Navbar"        },
      { href: "/admin/cms/hero",             icon: LayoutTemplate,label: "Hero"          },
      { href: "/admin/cms/services",         icon: Wrench,        label: "Services"      },
      { href: "/admin/cms/how-it-works",     icon: FileText,      label: "How It Works"  },
      { href: "/admin/cms/gallery",          icon: ImageIcon,     label: "Gallery"       },
      { href: "/admin/cms/testimonials",     icon: Star,          label: "Testimonials"  },
      { href: "/admin/cms/cta",              icon: Megaphone,     label: "CTA & Contact" },
      { href: "/admin/cms/footer",           icon: FileText,      label: "Footer"        },
      { href: "/admin/cms/seo",              icon: Search,        label: "SEO"           },
    ],
  },
  {
    label: "System",
    items: [
      { href: "/admin/wa-templates",         icon: MessageCircle, label: "WhatsApp Templates" },
      { href: "/admin/receipt-settings",     icon: Receipt,       label: "Receipt Settings" },
      { href: "/admin/email-settings",       icon: Mail,          label: "Email Summary" },
      { href: "/admin/users",                icon: UserCog,       label: "Users & Roles" },
      { href: "/admin/settings",             icon: Settings,      label: "Settings"      },
    ],
  },
];

/** The four pages built for phones — pinned in the bottom bar. Everything else sits behind "More". */
export const MOBILE_PRIMARY_HREFS = [
  "/admin",
  "/admin/orders",
  "/admin/customers",
  "/admin/buku-kecil",
] as const;

const ALL_ITEMS = NAV_GROUPS.flatMap((g) => g.items);

export const MOBILE_PRIMARY: NavItem[] = MOBILE_PRIMARY_HREFS.map(
  (href) => ALL_ITEMS.find((i) => i.href === href)!,
);

export function isNavActive(pathname: string, href: string, exact?: boolean): boolean {
  return exact ? pathname === href : pathname === href || pathname.startsWith(`${href}/`);
}
