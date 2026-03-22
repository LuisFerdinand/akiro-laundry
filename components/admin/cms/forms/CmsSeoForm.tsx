/* eslint-disable react/no-unescaped-entities */
// components/admin/cms/forms/CmsSeoForm.tsx
"use client";

import { useState } from "react";
import { Globe, Share2, Twitter, Code2, Eye, EyeOff, ExternalLink } from "lucide-react";
import type { CmsSeoSettings }     from "@/lib/db/schema/cms";
import { saveSeoSettings }         from "@/lib/actions/cms/seo.actions";
import {
  SectionDivider, FormGrid, FormField,
  TextInput, TextArea, ImageUploadField, SelectInput, SaveBar,
} from "./CmsFormPrimitives";
import { useCmsSave } from "@/hooks/useCmsSave";

// ── Tab config ────────────────────────────────────────────────────────────────
const TABS = [
  { id: "basic",    label: "Basic SEO",  icon: Globe   },
  { id: "og",       label: "Open Graph", icon: Share2  },
  { id: "twitter",  label: "Twitter / X",icon: Twitter },
  { id: "advanced", label: "Advanced",   icon: Code2   },
] as const;

type TabId = typeof TABS[number]["id"];

const ROBOTS_OPTIONS = [
  { value: "true",  label: "Yes — allow indexing" },
  { value: "false", label: "No — block indexing"  },
];

const OG_TYPE_OPTIONS = [
  { value: "website", label: "website" },
  { value: "article", label: "article" },
];

const TWITTER_CARD_OPTIONS = [
  { value: "summary",             label: "Summary"              },
  { value: "summary_large_image", label: "Summary + large image"},
];

// ── Toggle switch ──────────────────────────────────────────────────────────────
function Toggle({ value, onChange, label }: {
  value: boolean; onChange: (v: boolean) => void; label: string;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!value)}
      style={{
        display: "flex", alignItems: "center", gap: "10px",
        background: "none", border: "none", cursor: "pointer", padding: 0,
      }}
    >
      {/* Track */}
      <div style={{
        width: "44px", height: "24px", borderRadius: "999px",
        background: value ? "#1a7fba" : "hsl(210 20% 85%)",
        position: "relative", transition: "background 0.2s", flexShrink: 0,
      }}>
        {/* Thumb */}
        <div style={{
          position: "absolute", top: "3px",
          left: value ? "22px" : "3px",
          width: "18px", height: "18px", borderRadius: "50%",
          background: "white", transition: "left 0.2s",
          boxShadow: "0 1px 4px rgba(0,0,0,0.15)",
        }} />
      </div>
      <span style={{ fontSize: "13px", fontWeight: 600, color: "#607080" }}>
        {label}
      </span>
      {value
        ? <Eye size={14} style={{ color: "#1a7fba" }} />
        : <EyeOff size={14} style={{ color: "#b0bec9" }} />}
    </button>
  );
}

// ── Tab button ────────────────────────────────────────────────────────────────
function Tab({ tab, active, onClick }: {
  tab: typeof TABS[number]; active: boolean; onClick: () => void;
}) {
  const Icon = tab.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        display: "flex", alignItems: "center", gap: "6px",
        padding: "8px 14px", borderRadius: "10px", border: "none",
        background:  active ? "rgba(26,127,186,0.10)" : "transparent",
        color:       active ? "#1a7fba" : "#8ca0b0",
        fontSize:    "13px", fontWeight: active ? 800 : 600,
        cursor:      "pointer", whiteSpace: "nowrap",
        fontFamily:  "Sora, sans-serif",
        transition:  "all 0.15s",
        borderBottom: active ? "2px solid #1a7fba" : "2px solid transparent",
      }}
    >
      <Icon size={14} />
      {tab.label}
    </button>
  );
}

// ── Hint box ──────────────────────────────────────────────────────────────────
function Hint({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      padding: "12px 14px", borderRadius: "10px",
      background: "rgba(26,127,186,0.05)", border: "1.5px solid rgba(26,127,186,0.12)",
      fontSize: "12px", fontWeight: 500, color: "#607080", lineHeight: 1.6,
    }}>
      {children}
    </div>
  );
}

// ── OG Preview components ─────────────────────────────────────────────────────

interface PreviewProps {
  title:       string;
  description: string;
  imageUrl:    string;
  canonicalUrl:string;
}

function domain(url: string): string {
  try { return new URL(url).hostname.replace("www.", ""); } catch { return "akirolaundry.com"; }
}

function ImagePlaceholder() {
  return (
    <div style={{ width: "100%", height: "100%", background: "linear-gradient(135deg, #edf7fd, #c8e9f8)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "6px" }}>
      <div style={{ width: "36px", height: "36px", borderRadius: "10px", background: "rgba(26,127,186,0.15)", display: "flex", alignItems: "center", justifyContent: "center" }}>
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#1a7fba" strokeWidth="1.8"><rect x="3" y="3" width="18" height="18" rx="3"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
      </div>
      <p style={{ fontSize: "10px", fontWeight: 600, color: "#8ca0b0", margin: 0 }}>No image uploaded</p>
    </div>
  );
}

// WhatsApp preview
function WhatsAppPreview({ title, description, imageUrl, canonicalUrl }: PreviewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      {/* Label */}
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#25d366"><path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51a12.8 12.8 0 0 0-.57-.01c-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z"/></svg>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#25d366" }}>WhatsApp</span>
      </div>

      {/* Chat bubble */}
      <div style={{ background: "#e9fde9", borderRadius: "0 12px 12px 12px", padding: "8px", maxWidth: "320px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        {/* Link card */}
        <div style={{ background: "white", borderRadius: "8px", overflow: "hidden", border: "1px solid #e5e5e5" }}>
          {/* Image */}
          <div style={{ width: "100%", height: "160px", overflow: "hidden" }}>
            {imageUrl
              // eslint-disable-next-line @next/next/no-img-element
              ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              : <ImagePlaceholder />}
          </div>
          {/* Text */}
          <div style={{ padding: "10px 12px" }}>
            <p style={{ fontSize: "13px", fontWeight: 700, color: "#111", margin: "0 0 4px", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {title || "Page Title"}
            </p>
            <p style={{ fontSize: "11px", color: "#667", margin: "0 0 6px", lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
              {description || "Page description will appear here."}
            </p>
            <p style={{ fontSize: "11px", color: "#25d366", margin: 0, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.03em" }}>
              {domain(canonicalUrl)}
            </p>
          </div>
        </div>
        <p style={{ fontSize: "11px", color: "#667", margin: "6px 0 0", textAlign: "right" }}>9:41 AM ✓✓</p>
      </div>
    </div>
  );
}

// Facebook preview
function FacebookPreview({ title, description, imageUrl, canonicalUrl }: PreviewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#1877f2"><path d="M18 2h-3a5 5 0 0 0-5 5v3H7v4h3v8h4v-8h3l1-4h-4V7a1 1 0 0 1 1-1h3z"/></svg>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#1877f2" }}>Facebook</span>
      </div>

      {/* Post card */}
      <div style={{ background: "white", borderRadius: "8px", border: "1px solid #dde1e7", overflow: "hidden", maxWidth: "380px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        {/* Image */}
        <div style={{ width: "100%", height: "196px", overflow: "hidden" }}>
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ImagePlaceholder />}
        </div>
        {/* Meta */}
        <div style={{ padding: "10px 12px", background: "#f2f3f5", borderTop: "1px solid #dde1e7" }}>
          <p style={{ fontSize: "11px", color: "#606770", margin: "0 0 3px", textTransform: "uppercase", letterSpacing: "0.04em" }}>
            {domain(canonicalUrl)}
          </p>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#1c1e21", margin: "0 0 3px", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {title || "Page Title"}
          </p>
          <p style={{ fontSize: "12px", color: "#606770", margin: 0, lineHeight: 1.4, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 1, WebkitBoxOrient: "vertical" }}>
            {description || "Page description will appear here."}
          </p>
        </div>
      </div>
    </div>
  );
}

// TikTok preview
function TikTokPreview({ title, description, imageUrl, canonicalUrl }: PreviewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        {/* TikTok icon */}
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#000"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#000" }}>TikTok</span>
      </div>

      {/* TikTok bio link card style */}
      <div style={{ background: "#000", borderRadius: "16px", padding: "16px", maxWidth: "280px", display: "flex", flexDirection: "column", alignItems: "center", gap: "12px" }}>
        {/* Avatar / image */}
        <div style={{ width: "80px", height: "80px", borderRadius: "50%", overflow: "hidden", border: "3px solid #fe2c55", flexShrink: 0 }}>
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <div style={{ width: "100%", height: "100%", background: "#1a1a1a", display: "flex", alignItems: "center", justifyContent: "center" }}>
                <svg width="32" height="32" viewBox="0 0 24 24" fill="#fe2c55"><path d="M19.59 6.69a4.83 4.83 0 0 1-3.77-4.25V2h-3.45v13.67a2.89 2.89 0 0 1-2.88 2.5 2.89 2.89 0 0 1-2.89-2.89 2.89 2.89 0 0 1 2.89-2.89c.28 0 .54.04.79.1V9.01a6.33 6.33 0 0 0-.79-.05 6.34 6.34 0 0 0-6.34 6.34 6.34 6.34 0 0 0 6.34 6.34 6.34 6.34 0 0 0 6.33-6.34V8.69a8.18 8.18 0 0 0 4.78 1.52V6.76a4.85 4.85 0 0 1-1.01-.07z"/></svg>
              </div>}
        </div>

        {/* Text */}
        <div style={{ textAlign: "center" }}>
          <p style={{ fontSize: "15px", fontWeight: 800, color: "white", margin: "0 0 4px" }}>
            {title || "Page Title"}
          </p>
          <p style={{ fontSize: "12px", color: "rgba(255,255,255,0.65)", margin: 0, lineHeight: 1.4 }}>
            {description?.slice(0, 80) || "Description appears here."}
          </p>
        </div>

        {/* Link chip */}
        <div style={{ background: "#fe2c55", borderRadius: "8px", padding: "8px 20px", fontSize: "13px", fontWeight: 800, color: "white", display: "flex", alignItems: "center", gap: "6px" }}>
          <ExternalLink size={12} />
          {domain(canonicalUrl)}
        </div>
      </div>
    </div>
  );
}

// LinkedIn preview
function LinkedInPreview({ title, description, imageUrl, canonicalUrl }: PreviewProps) {
  return (
    <div style={{ display: "flex", flexDirection: "column", gap: "8px" }}>
      <div style={{ display: "flex", alignItems: "center", gap: "6px" }}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="#0a66c2"><path d="M16 8a6 6 0 0 1 6 6v7h-4v-7a2 2 0 0 0-2-2 2 2 0 0 0-2 2v7h-4v-7a6 6 0 0 1 6-6zM2 9h4v12H2z"/><circle cx="4" cy="4" r="2"/></svg>
        <span style={{ fontSize: "12px", fontWeight: 700, color: "#0a66c2" }}>LinkedIn</span>
      </div>

      <div style={{ background: "white", borderRadius: "8px", border: "1px solid #e0e0e0", overflow: "hidden", maxWidth: "380px", boxShadow: "0 1px 3px rgba(0,0,0,0.08)" }}>
        {/* Image */}
        <div style={{ width: "100%", height: "196px", overflow: "hidden" }}>
          {imageUrl
            // eslint-disable-next-line @next/next/no-img-element
            ? <img src={imageUrl} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
            : <ImagePlaceholder />}
        </div>
        {/* Meta */}
        <div style={{ padding: "10px 14px", borderTop: "1px solid #e0e0e0" }}>
          <p style={{ fontSize: "14px", fontWeight: 700, color: "#000", margin: "0 0 3px", lineHeight: 1.3, overflow: "hidden", display: "-webkit-box", WebkitLineClamp: 2, WebkitBoxOrient: "vertical" }}>
            {title || "Page Title"}
          </p>
          <p style={{ fontSize: "12px", color: "#666", margin: 0 }}>
            {domain(canonicalUrl)}
          </p>
        </div>
      </div>
    </div>
  );
}

// Orchestrator — all 4 previews in a 2×2 grid
function OgPreviews(props: PreviewProps) {
  return (
    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(300px, 1fr))", gap: "24px" }}>
      <WhatsAppPreview {...props} />
      <FacebookPreview {...props} />
      <TikTokPreview   {...props} />
      <LinkedInPreview {...props} />
    </div>
  );
}

// ── Main form ─────────────────────────────────────────────────────────────────
export function CmsSeoForm({ data }: { data: CmsSeoSettings | null }) {
  const { save, pending } = useCmsSave();
  const [tab,     setTab]          = useState<TabId>("basic");

  // ── State ──────────────────────────────────────────────────────────────────
  const [siteTitle,         setSiteTitle]         = useState(data?.siteTitle         ?? "Akiro Laundry & Perfume");
  const [titleTemplate,     setTitleTemplate]     = useState(data?.titleTemplate     ?? "%s | Akiro Laundry");
  const [metaDescription,   setMetaDescription]   = useState(data?.metaDescription   ?? "");
  const [metaKeywords,      setMetaKeywords]       = useState(data?.metaKeywords      ?? "");
  const [canonicalUrl,      setCanonicalUrl]       = useState(data?.canonicalUrl      ?? "");
  const [robotsIndex,       setRobotsIndex]        = useState(data?.robotsIndex       ?? true);
  const [robotsFollow,      setRobotsFollow]       = useState(data?.robotsFollow      ?? true);

  const [ogTitle,           setOgTitle]           = useState(data?.ogTitle           ?? "");
  const [ogDescription,     setOgDescription]     = useState(data?.ogDescription     ?? "");
  const [ogImageUrl,        setOgImageUrl]         = useState(data?.ogImageUrl        ?? "");
  const [ogImageAlt,        setOgImageAlt]         = useState(data?.ogImageAlt        ?? "");
  const [ogType,            setOgType]             = useState(data?.ogType            ?? "website");
  const [ogLocale,          setOgLocale]           = useState(data?.ogLocale          ?? "pt_TL");

  const [twitterCard,       setTwitterCard]        = useState(data?.twitterCard       ?? "summary_large_image");
  const [twitterSite,       setTwitterSite]        = useState(data?.twitterSite       ?? "");
  const [twitterCreator,    setTwitterCreator]     = useState(data?.twitterCreator    ?? "");

  const [googleVerification,setGoogleVerification]= useState(data?.googleVerification ?? "");
  const [fbAppId,           setFbAppId]            = useState(data?.fbAppId           ?? "");
  const [jsonLd,            setJsonLd]             = useState(data?.jsonLd            ?? "");
  const [headScripts,       setHeadScripts]        = useState(data?.headScripts       ?? "");

  const descLen = metaDescription.length;
  const descWarn = descLen > 155;

  const handleSave = () => {
    save(() => saveSeoSettings({
        siteTitle, titleTemplate, metaDescription,
        metaKeywords: metaKeywords || null,
        canonicalUrl: canonicalUrl || null,
        robotsIndex, robotsFollow,
        ogTitle:      ogTitle      || null,
        ogDescription:ogDescription|| null,
        ogImageUrl:   ogImageUrl   || null,
        ogImageAlt:   ogImageAlt   || null,
        ogType, ogLocale,
        twitterCard,
        twitterSite:    twitterSite    || null,
        twitterCreator: twitterCreator || null,
        googleVerification: googleVerification || null,
        fbAppId:       fbAppId    || null,
        jsonLd:        jsonLd     || null,
        headScripts:   headScripts|| null,
      }));
  };

  return (
    <div style={{ display: "flex", flexDirection: "column" }}>

      {/* ── Tabs ──────────────────────────────────────────────────────────── */}
      <div style={{
        display: "flex", gap: "4px", overflowX: "auto",
        borderBottom: "1.5px solid hsl(210 25% 91%)",
        marginBottom: "24px", paddingBottom: "0",
        scrollbarWidth: "none",
      }}>
        {TABS.map((t) => (
          <Tab key={t.id} tab={t} active={tab === t.id} onClick={() => setTab(t.id)} />
        ))}
      </div>

      {/* ── Basic SEO ─────────────────────────────────────────────────────── */}
      {tab === "basic" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Hint>
            These fields populate the <code>&lt;title&gt;</code> and <code>&lt;meta description&gt;</code> tags that search engines read. Keep the description between 120–155 characters for best results.
          </Hint>

          <FormGrid cols={2}>
            <FormField label="Site Title" span={2}>
              <TextInput value={siteTitle} onChange={setSiteTitle} placeholder="Akiro Laundry & Perfume" hint="Default page title when no page-specific title is set." />
            </FormField>
            <FormField label="Title Template" span={2}>
              <TextInput value={titleTemplate} onChange={setTitleTemplate} placeholder="%s | Akiro Laundry" hint='Use %s as a placeholder for the page name. e.g. "About | Akiro Laundry"' />
            </FormField>
          </FormGrid>

          <div>
            <div style={{ display: "flex", alignItems: "baseline", justifyContent: "space-between", marginBottom: "8px" }}>
              <label style={{ fontSize: "11px", fontWeight: 800, color: "#607080", textTransform: "uppercase", letterSpacing: "0.07em", fontFamily: "Sora, sans-serif" }}>
                Meta Description
              </label>
              <span style={{ fontSize: "11px", fontWeight: 600, color: descWarn ? "#ef4444" : descLen > 120 ? "#10b981" : "#b0bec9" }}>
                {descLen} / 155
              </span>
            </div>
            <TextArea
              value={metaDescription}
              onChange={setMetaDescription}
              rows={3}
              placeholder="Premium laundry & dry-cleaning in Dili, Timor-Leste. Fast pickup and delivery. Open every day 08:00–20:00."
              hint="Shown in Google search results under your page title."
            />
            {/* Progress bar */}
            <div style={{ height: "3px", borderRadius: "999px", background: "hsl(210 25% 92%)", marginTop: "6px", overflow: "hidden" }}>
              <div style={{ height: "100%", borderRadius: "999px", width: `${Math.min((descLen / 155) * 100, 100)}%`, background: descWarn ? "#ef4444" : descLen > 120 ? "#10b981" : "#1a7fba", transition: "width 0.2s, background 0.3s" }} />
            </div>
          </div>

          <FormField label="Meta Keywords" hint="Comma-separated. Not heavily weighted by Google but used by some other engines.">
            <TextInput value={metaKeywords} onChange={setMetaKeywords} placeholder="laundry dili, dry cleaning timor-leste, akiro laundry" />
          </FormField>

          <FormField label="Canonical URL" hint="Your site's primary domain. Prevents duplicate content issues. e.g. https://akirolaundry.com">
            <TextInput value={canonicalUrl} onChange={setCanonicalUrl} placeholder="https://akirolaundry.com" />
          </FormField>

          <SectionDivider label="Search Engine Crawling" />
          <div style={{ display: "flex", flexDirection: "column", gap: "14px" }}>
            <Toggle value={robotsIndex}  onChange={setRobotsIndex}  label="Allow search engines to index this site" />
            <Toggle value={robotsFollow} onChange={setRobotsFollow} label="Allow search engines to follow links" />
          </div>
          <Hint>
            Set both to <strong>Yes</strong> for a live production site. Turn off indexing during development to avoid Google indexing a staging environment.
          </Hint>
        </div>
      )}

      {/* ── Open Graph ────────────────────────────────────────────────────── */}
      {tab === "og" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "24px" }}>
          <Hint>
            Open Graph tags control how your page looks when shared on WhatsApp, Facebook, TikTok, LinkedIn and more. The image should be <strong>1200 × 630 px</strong> for best results across all platforms.
          </Hint>

          {/* ── Fields ─────────────────────────────────────────────────── */}
          <FormField label="OG Title" hint="Defaults to Site Title if left blank.">
            <TextInput value={ogTitle} onChange={setOgTitle} placeholder="Akiro Laundry & Perfume — Dili" />
          </FormField>

          <FormField label="OG Description" hint="Defaults to Meta Description if left blank.">
            <TextArea value={ogDescription} onChange={setOgDescription} rows={2} placeholder="Premium laundry in Dili…" />
          </FormField>

          <ImageUploadField
            label="OG / Social Share Image"
            value={ogImageUrl}
            onChange={setOgImageUrl}
            folder="akiro/seo"
            aspectHint="1200 × 630 px recommended"
            hint="Displayed when the site is shared on social media or WhatsApp."
          />

          <FormField label="OG Image Alt Text">
            <TextInput value={ogImageAlt} onChange={setOgImageAlt} placeholder="Akiro Laundry — premium service in Dili, Timor-Leste" />
          </FormField>

          <FormGrid cols={2}>
            <FormField label="OG Type">
              <SelectInput value={ogType} onChange={setOgType} options={OG_TYPE_OPTIONS} />
            </FormField>
            <FormField label="OG Locale" hint="Language/region code. e.g. pt_TL, en_US">
              <TextInput value={ogLocale} onChange={setOgLocale} placeholder="pt_TL" />
            </FormField>
          </FormGrid>

          {/* ── Live previews ──────────────────────────────────────────── */}
          <SectionDivider label="Live Share Previews" />
          <p style={{ fontSize: "12px", fontWeight: 500, color: "#8ca0b0", margin: "0 0 4px" }}>
            These previews update as you fill in the fields above. They show how your link will appear when shared on each platform.
          </p>

          <OgPreviews
            title={ogTitle      || siteTitle}
            description={ogDescription || metaDescription}
            imageUrl={ogImageUrl}
            canonicalUrl={canonicalUrl || "https://akirolaundry.com"}
          />
        </div>
      )}

      {/* ── Twitter / X ───────────────────────────────────────────────────── */}
      {tab === "twitter" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>
          <Hint>
            Twitter cards control how links appear when shared on X (Twitter). The <strong>Summary + large image</strong> card shows a full-width image above the title.
          </Hint>

          <FormField label="Card Type">
            <SelectInput value={twitterCard} onChange={setTwitterCard} options={TWITTER_CARD_OPTIONS} />
          </FormField>

          <FormGrid cols={2}>
            <FormField label="Site Handle" hint="Your business @handle on X.">
              <TextInput value={twitterSite} onChange={setTwitterSite} placeholder="@akirolaundry" />
            </FormField>
            <FormField label="Creator Handle" hint="The content author's @handle.">
              <TextInput value={twitterCreator} onChange={setTwitterCreator} placeholder="@akirolaundry" />
            </FormField>
          </FormGrid>

          <Hint>
            The OG image and title are reused for Twitter cards automatically — no separate image needed.
          </Hint>
        </div>
      )}

      {/* ── Advanced ──────────────────────────────────────────────────────── */}
      {tab === "advanced" && (
        <div style={{ display: "flex", flexDirection: "column", gap: "20px" }}>

          <SectionDivider label="Verification Codes" />
          <Hint>
            Paste only the <code>content=""</code> value from each verification meta tag — not the full tag. Example: Google gives you <code>&lt;meta name="google-site-verification" content="<strong>abc123</strong>"&gt;</code> — paste just <code>abc123</code>.
          </Hint>
          <FormGrid cols={2}>
            <FormField label="Google Search Console" hint="From Google Search Console → Settings → Ownership verification → HTML tag.">
              <TextInput value={googleVerification} onChange={setGoogleVerification} placeholder="abc123xyz…" />
            </FormField>
            <FormField label="Facebook App ID" hint="From Facebook Developers → Your App → Settings → Basic.">
              <TextInput value={fbAppId} onChange={setFbAppId} placeholder="123456789012345" />
            </FormField>
          </FormGrid>

          <SectionDivider label="JSON-LD Structured Data" />
          <Hint>
            Paste a valid <a href="https://schema.org" target="_blank" rel="noopener noreferrer" style={{ color: "#1a7fba" }}>Schema.org</a> JSON-LD object. This helps Google show rich results (star ratings, business hours, etc.) in search. Leave blank to skip.
          </Hint>
          <FormField label="JSON-LD Script" hint="Must be valid JSON. Injected as <script type='application/ld+json'> in <head>.">
            <TextArea
              value={jsonLd}
              onChange={setJsonLd}
              rows={8}
              placeholder={`{\n  "@context": "https://schema.org",\n  "@type": "LocalBusiness",\n  "name": "Akiro Laundry & Perfume",\n  "address": {\n    "@type": "PostalAddress",\n    "addressLocality": "Dili",\n    "addressCountry": "TL"\n  }\n}`}
            />
          </FormField>

          <SectionDivider label="Custom Head Scripts" />
          <Hint>
            Paste raw HTML here — e.g. Google Tag Manager, Meta Pixel, or other analytics snippets. This is injected verbatim inside <code>&lt;head&gt;</code>. Only add code you trust.
          </Hint>
          <FormField label="Head Scripts" hint="Injected after the font links, before </head>.">
            <TextArea
              value={headScripts}
              onChange={setHeadScripts}
              rows={6}
              placeholder="<!-- Google Tag Manager -->"
            />
          </FormField>
        </div>
      )}

      <SaveBar pending={pending} onSave={handleSave} />
    </div>
  );
}