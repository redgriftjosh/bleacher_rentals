"use client";
import { ReactNode } from "react";
import { Color } from "@/types/Color";

type PageHeaderProps = {
  title: string;
  subtitle?: string;
  action?: ReactNode;
};

export function PageHeader({ title, subtitle, action }: PageHeaderProps) {
  return (
    <div className="flex justify-between items-center mb-4">
      <div>
        <h1 className="text-2xl text-darkBlue font-bold">{title}</h1>
        {subtitle && (
          <p className="text-sm" style={{ color: Color.GRAY }}>
            {subtitle}
          </p>
        )}
      </div>
      {action}
    </div>
  );
}
