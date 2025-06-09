"use client";

import * as React from "react";
import { format } from "date-fns";
import { CalendarIcon } from "lucide-react";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";

type DatePickerProps = {
  date: Date | undefined;
  onChange: (value: Date | undefined) => void;
  /**
   * If provided, calendar dates after this date cannot be selected.
   * e.g. for setupStart: one day before eventStart.
   */
  maxDate?: Date;
  /**
   * If provided, calendar dates before this date cannot be selected.
   * e.g. for teardownEnd: one day after eventEnd.
   */
  minDate?: Date;
};

export function DatePicker({ date, onChange, maxDate, minDate }: DatePickerProps) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button
          variant={"outline"}
          className={cn(
            "w-[240px] justify-start text-left font-normal",
            !date && "text-muted-foreground"
          )}
        >
          <CalendarIcon />
          {date ? format(date, "PPP") : <span>Same Date Setup</span>}
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-auto p-0" align="start">
        <Calendar
          mode="single"
          selected={date}
          onSelect={(d) => onChange(d ?? undefined)}
          initialFocus
          fromDate={minDate}
          toDate={maxDate}
        />
        <div className="flex justify-center p-1 -mt-4 mb-1">
          <Button variant="outline" onClick={() => onChange(undefined)}>
            Same Day
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  );
}
