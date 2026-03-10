// components/employee/order-steps/CustomerStep.tsx
"use client";

import { useState, useCallback } from "react";
import { User, Phone, MapPin, Search, Loader2, X } from "lucide-react";
import { Button }   from "@/components/ui/button";
import { Input }    from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label }    from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Card, CardContent } from "@/components/ui/card";
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
  const [tab, setTab]                   = useState<"new" | "existing">(data.existingCustomerId ? "existing" : "new");
  const [phoneQuery, setPhoneQuery]     = useState(data.existingCustomerId ? data.phone : "");
  const [nameQuery, setNameQuery]       = useState("");
  const [searchResults, setSearchResults] = useState<Customer[]>([]);
  const [searching, setSearching]       = useState(false);
  const [noResult, setNoResult]         = useState(false);

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
      <TabsList className="w-full mb-5">
        <TabsTrigger value="new"      className="flex-1">New Customer</TabsTrigger>
        <TabsTrigger value="existing" className="flex-1">Existing Customer</TabsTrigger>
      </TabsList>

      {/* ── New Customer ─────────────────────────────────────────────── */}
      <TabsContent value="new" className="space-y-4 mt-0">
        <div className="space-y-1.5">
          <Label htmlFor="name">Full Name</Label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="name"
              className="pl-9"
              placeholder="John Doe"
              value={data.name}
              onChange={(e) => onChange({ ...data, name: e.target.value })}
            />
          </div>
          {errors.name && <p className="text-xs text-destructive">{errors.name}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="phone">Phone Number</Label>
          <div className="relative">
            <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              id="phone"
              className="pl-9"
              placeholder="+1 234 567 8901"
              value={data.phone}
              onChange={(e) => onChange({ ...data, phone: e.target.value })}
            />
          </div>
          {errors.phone && <p className="text-xs text-destructive">{errors.phone}</p>}
        </div>

        <div className="space-y-1.5">
          <Label htmlFor="address">Address</Label>
          <div className="relative">
            <MapPin size={15} className="absolute left-3 top-3 text-muted-foreground" />
            <Textarea
              id="address"
              className="pl-9 resize-none"
              placeholder="123 Main St, Apt 4B…"
              rows={3}
              value={data.address}
              onChange={(e) => onChange({ ...data, address: e.target.value })}
            />
          </div>
          {errors.address && <p className="text-xs text-destructive">{errors.address}</p>}
        </div>
      </TabsContent>

      {/* ── Existing Customer ─────────────────────────────────────────── */}
      <TabsContent value="existing" className="space-y-4 mt-0">
        {/* Phone lookup */}
        <div className="space-y-1.5">
          <Label>Search by Phone</Label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Phone size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
              <Input
                className="pl-9"
                placeholder="08123456789"
                value={phoneQuery}
                onChange={(e) => { setPhoneQuery(e.target.value); setNoResult(false); }}
                onKeyDown={(e) => e.key === "Enter" && handlePhoneLookup()}
              />
            </div>
            <Button
              variant="outline"
              size="icon"
              onClick={handlePhoneLookup}
              disabled={searching}
              className="shrink-0"
            >
              {searching ? <Loader2 size={15} className="animate-spin" /> : <Search size={15} />}
            </Button>
          </div>
          {noResult && <p className="text-xs text-muted-foreground">No customer found with that number.</p>}
        </div>

        {/* Name search */}
        <div className="space-y-1.5 relative">
          <Label>Or Search by Name</Label>
          <div className="relative">
            <User size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground" />
            <Input
              className="pl-9"
              placeholder="Type a name…"
              value={nameQuery}
              onChange={(e) => handleNameSearch(e.target.value)}
            />
            {searching && <Loader2 size={13} className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground animate-spin" />}
          </div>
          {searchResults.length > 0 && (
            <Card className="absolute z-20 left-0 right-0 shadow-lg">
              <CardContent className="p-1">
                {searchResults.map((c) => (
                  <button
                    key={c.id}
                    onClick={() => selectCustomer(c)}
                    className="w-full flex items-center gap-3 px-3 py-2.5 rounded-md hover:bg-muted text-left transition-colors"
                  >
                    <div className="w-8 h-8 rounded-full bg-brand-muted flex items-center justify-center shrink-0">
                      <span className="text-brand text-xs font-bold">{c.name[0]}</span>
                    </div>
                    <div>
                      <p className="text-sm font-medium">{c.name}</p>
                      <p className="text-xs text-muted-foreground">{c.phone}</p>
                    </div>
                  </button>
                ))}
              </CardContent>
            </Card>
          )}
        </div>

        {errors.existingCustomerId && (
          <p className="text-xs text-destructive">{errors.existingCustomerId}</p>
        )}

        {/* Selected card */}
        {data.existingCustomerId && (
          <Card className="border-brand/30 bg-brand-soft/30">
            <CardContent className="p-4 flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-brand flex items-center justify-center shrink-0">
                <span className="text-white font-bold">{data.name[0]}</span>
              </div>
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2">
                  <p className="font-semibold truncate">{data.name}</p>
                  <Badge variant="secondary" className="text-[10px]">Existing</Badge>
                </div>
                <p className="text-xs text-muted-foreground">{data.phone}</p>
                {data.address && <p className="text-xs text-muted-foreground truncate">{data.address}</p>}
              </div>
              <Button variant="ghost" size="icon" onClick={clearSelected} className="shrink-0 text-muted-foreground hover:text-destructive">
                <X size={15} />
              </Button>
            </CardContent>
          </Card>
        )}
      </TabsContent>
    </Tabs>
  );
}