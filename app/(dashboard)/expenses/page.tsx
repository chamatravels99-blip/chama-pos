import React from "react";
import { Receipt } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { EmptyState } from "@/components/ui/EmptyState";

export default function ExpensesPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Operating Expenses"
        description="Record shop overheads, utility bills, rent, and miscellaneous branch expenses."
      />
      <EmptyState
        icon={Receipt}
        title="Expense tracking is not configured"
        description="Expense creation, listing, editing, branch filtering, and permissions are not implemented. No expense records are stored or displayed."
      />
    </div>
  );
}
