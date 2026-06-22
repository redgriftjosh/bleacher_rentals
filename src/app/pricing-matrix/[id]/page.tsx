"use client";

import { use } from "react";
import { BleacherTypeDetail } from "@/features/pricingMatrix/components/BleacherTypeDetail";

export default function BleacherTypeDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <BleacherTypeDetail bleacherTypeId={id} />;
}
