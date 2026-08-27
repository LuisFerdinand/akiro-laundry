"use client";

import * as React from "react";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { DayPicker, getDefaultClassNames } from "react-day-picker";

import { cn } from "@/lib/utils";

export type CalendarProps = React.ComponentProps<typeof DayPicker>;

const d = getDefaultClassNames();

/**
 * Calendar built on react-day-picker (v9/v10). Structural layout is done with
 * Tailwind here; the booking-app range highlight (continuous band + solid
 * start/end pills) is plain CSS scoped to `.akiro-cal` in app/globals.css —
 * that keeps the `.rdp-*` modifier targeting reliable across builds.
 */
function Calendar({
  className,
  classNames,
  showOutsideDays = true,
  ...props
}: CalendarProps) {
  return (
    <DayPicker
      showOutsideDays={showOutsideDays}
      className={cn("akiro-cal p-3", className)}
      classNames={{
        months: cn(d.months, "relative flex flex-col sm:flex-row gap-4"),
        month: cn(d.month, "flex flex-col gap-3"),
        month_caption: cn(d.month_caption, "flex h-8 items-center justify-center"),
        caption_label: cn(d.caption_label, "text-sm font-bold text-foreground"),
        nav: cn(d.nav, "absolute inset-x-0 top-1 flex items-center justify-between px-0"),
        button_previous: cn(
          d.button_previous,
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40",
        ),
        button_next: cn(
          d.button_next,
          "inline-flex h-7 w-7 items-center justify-center rounded-md border border-border bg-background text-muted-foreground hover:bg-muted hover:text-foreground transition-colors disabled:pointer-events-none disabled:opacity-40",
        ),
        month_grid: cn(d.month_grid, "w-full"),
        weekdays: cn(d.weekdays, "flex"),
        weekday: cn(
          d.weekday,
          "w-9 pb-1 text-[0.7rem] font-bold uppercase tracking-wide text-muted-foreground",
        ),
        week: cn(d.week, "mt-0.5 flex w-full"),
        day: cn(d.day, "relative text-sm"),
        day_button: cn(d.day_button, "text-sm"),
        selected: cn(d.selected),
        range_start: cn(d.range_start),
        range_end: cn(d.range_end),
        range_middle: cn(d.range_middle),
        today: cn(d.today),
        outside: cn(d.outside),
        disabled: cn(d.disabled),
        hidden: cn(d.hidden, "invisible"),
        ...classNames,
      }}
      components={{
        Chevron: ({ orientation, className: chevClass }) => {
          const Icon = orientation === "left" ? ChevronLeft : ChevronRight;
          return <Icon className={cn("h-4 w-4", chevClass)} />;
        },
      }}
      {...props}
    />
  );
}

export { Calendar };
