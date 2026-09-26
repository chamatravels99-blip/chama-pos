"use client";

import React, { useState } from "react";
import { PageHeader } from "@/components/layout/PageHeader";
import { PosRegister } from "@/components/sales/PosRegister";
import { SalesHistory } from "@/components/sales/SalesHistory";

export default function SalesPage() {
  const [historyKey, setHistoryKey] = useState(0);

  return (
    <div className="space-y-6">
      <PageHeader
        title="Sales & POS Register"
        description="Process checkout orders and review completed invoices for the current branch."
      />

      <PosRegister onSaleCompleted={() => setHistoryKey((value) => value + 1)} />
      <SalesHistory refreshKey={historyKey} />
    </div>
  );
}
