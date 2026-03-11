// components/employee/order-steps/CustomerStep.tsx
"use client";

import { useState, useCallback } from "react";
import { User, Phone, MapPin, Search, Loader2, X } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Badge } from "@/components/ui/badge";
import { CustomerFormData } from "@/lib/utils/order-form";
import { lookupCustomerByPhone, searchCustomersByName } from "@/lib/actions/orders";
import type { Customer } from "@/lib/db/schema";

interface CustomerStepProps {
  data: CustomerFormData;
  onChange: (data: CustomerFormData) => void;
  errors: Record<string, string>;
}

export function CustomerStep({ data, onChange, errors }: CustomerStepProps) {
  const [tab, setTab]                     = useState<"new" | "existing">(data.existingCustomerId ? "existing" : "new");
  const [phoneQuery, setPhoneQuery]       = useState(data.existingCustomerId ? data.phone : "");
  const [nameQuery, setNameQuery]         = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching]         = useState(false);
  const [noResult, setNoResult]           = useState(false);

  const handlePhoneLookup = async () => {
    if (!phoneQuery.trim()) return;
    setSearching(true);
    setNoResult(false);
    const found = await lookupCustomerByPhone(phoneQuery);
    setSearching(false);
    if (found) {
      onChange({ existingCustomerId: found.id, name: found.name, phone: found.phone, address: found.address ?? "" });
    } else {
      setNoResult(true);
      onChange({ name: "", phone: "", address: "" });
    }
  };

  const handleNameSearch = useCallback(async (q: string) => {
    setNameQuery(q);
    if (!q.trim()) { setSearchResults([]); return; }
    setSearching(true);
    const results = await searchCustomersByName(q);
    setSearchResults(results);
    setSearching(false);
  }, []);

  const selectCustomer = (c: Customer) => {
    setSearchResults([]);
    setNameQuery(c.name);
    onChange({ existingCustomerId: c.id, name: c.name, phone: c.phone, address: c.address ?? "" });
  };

  const clearSelected = () => {
    onChange({ name: "", phone: "", address: "" });
    setPhoneQuery("");
    setNameQuery("");
    setNoResult(false);
  };

  return (
    <Tabs value={tab} onValueChange={(v) => { setTab(v as "new" | "existing"); clearSelected(); }}>
      <TabsList className="w-full mb-5 h-11 rounded-2xl bg-muted p-1">
        <TabsTrigger value="new"      className="flex-1 rounded-xl text-xs font-bold data-[state=active]:shadow-sm">
          New Customer
        </TabsTrigger>
        <TabsTrigger value="existing" className="flex-1 rounded-xl text-xs font-bold data-[state=active]:shadow-sm">
          Existing Customer
        </TabsTrigger>
      </TabsList>

      {/* ── New Customer ────────────────────────────────────────── */}
      <TabsContent value="new" className="space-y-4 mt-0">
        <div className="space-y-1.5">
          <label className="field-label" htmlFor="name">Full Name</label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center">
              <User size={13} className="text-brand" />
            </div>
            <input
              id="name"
              className="field-input pl-14"
              placeholder="John Doe"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>
          {errors.name && <p className="text-xs text-destructive font-semibold">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="field-label" htmlFor="phone">Phone Number</label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center">
              <Phone size={13} className="text-brand" />
            </div>
            <input
              id="phone"
              className="field-input pl-14"
              placeholder="+62 812 3456 7890"
              value={data.phone}
              onChange={(e) => onChange({ ...data, phone: e.target.value })}
            />
          </div>
          {errors.phone && <p className="text-xs text-destructive font-semibold">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <label className="field-label" htmlFor="address">Address</label>
          <div className="relative">
            <div className="absolute left-3.5 top-4 w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center">
              <MapPin size={13} className="text-brand" />
            </div>
            <textarea
              id="address"
              className="field-input pl-14 resize-none"
              placeholder="123 Main St, Apt 4B…"
              rows={3}
              value={data.address}
              onChange={(e) => onChange({ ...data, address: e.target.value })}
            />
          </div>
          {errors.address && <p className="text-xs text-destructive font-semibold">{errors.address}</p>}
        </div>
      </TabsContent>

      {/* ── Existing Customer ────────────────────────────────────── */}
      <TabsContent value="existing" className="space-y-4 mt-0">
        {/* Phone lookup */}
        <div className="space-y-1.5">
          <label className="field-label">Search by Phone</label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center">
                <Phone size={13} className="text-brand" />
              </div>
              <input
                className="field-input pl-14"
                placeholder="08123456789"
                value={phoneQuery}
                onChange={(e) => { setPhoneQuery(e.target.value); setNoResult(false); }}
                onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
              />
            </div>
            <button
              onClick={handlePhoneLookup}
              disabled={searching}
              className="w-12 h-12 rounded-2xl bg-brand text-white flex items-center justify-center shrink-0 shadow-md shadow-brand/25 hover:bg-brand-dark transition-colors disabled:opacity-50"
            >
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </button>
          </div>
          {noResult && (
            <p className="text-xs text-muted-foreground font-medium bg-muted px-3 py-2 rounded-xl">
              No customer found with that number.
            </p>
          )}
        </div>

        {/* Name search */}
        <div className="space-y-1.5 relative">
          <label className="field-label">Or Search by Name</label>
          <div className="relative">
            <div className="absolute left-3.5 top-1/2 -translate-y-1/2 w-7 h-7 rounded-xl bg-brand-soft border border-brand-muted flex items-center justify-center">
              <User size={13} className="text-brand" />
            </div>
            <input
              className="field-input pl-14"
              placeholder="Type a name…"
              value={nameQuery}
              onChange={(e) => handleNameSearch(e.target.value)}
            />
            {searching && (
              <Loader2 size={13} className="absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />
            )}
          </div>
          {searchResults.length > 0 && (
            <div className="absolute z-20 left-0 right-0 bg-white rounded-2xl shadow-xl border border-border overflow-hidden">
              {searchResults.map((c) => (
                <button
                  key={c.id}
                  onClick={() => selectCustomer(c)}
                  className="w-full flex items-center gap-3 px-4 py-3 hover:bg-brand-soft text-left transition-colors border-b border-border/40 last:border-0"
                >
                  <div className="akiro-avatar akiro-avatar--brand akiro-avatar--sm">
                    <span>{c.name[0].toUpperCase()}</span>
                  </div>
                  <div>
                    <p className="text-sm font-bold">{c.name}</p>
                    <p className="text-xs text-muted-foreground font-medium">{c.phone}</p>
                  </div>
                </button>
              ))}
            </div>
          )}
        </div>

        {errors.existingCustomerId && (
          <p className="text-xs text-destructive font-semibold">{errors.existingCustomerId}</p>
        )}

        {/* Selected customer card */}
        {data.existingCustomerId && (
          <div className="flex items-center gap-3 p-4 rounded-2xl bg-brand-soft border-2 border-brand-muted">
            <div className="akiro-avatar akiro-avatar--brand">
              <span>{data.name[0]?.toUpperCase()}</span>
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-2">
                <p className="font-bold truncate text-sm">{data.name}</p>
                <Badge variant="secondary" className="text-[9px] font-bold shrink-0">Existing</Badge>
              </div>
              <p className="text-xs text-muted-foreground font-medium">{data.phone}</p>
              {data.address && <p className="text-xs text-muted-foreground truncate mt-0.5">{data.address}</p>}
            </div>
            <button
              onClick={clearSelected}
              className="w-8 h-8 rounded-xl bg-white border border-border flex items-center justify-center shrink-0 text-muted-foreground hover:text-destructive hover:border-destructive/30 transition-colors"
            >
              <X size={14} />
            </button>
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}