import React from "react";
import { Truck, Plus, Search, Building2, Phone, Mail, FileText } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function SuppliersPage() {
  const mockSuppliers = [
    {
      id: "sup_01",
      companyName: "Pioneer Electronics Asia Pte",
      contactPerson: "David Tan",
      phone: "+65 6789 0123",
      category: "Car Audio & Head Units",
      activePOs: 2,
      status: "Active",
    },
    {
      id: "sup_02",
      companyName: "Harman International / JBL",
      contactPerson: "Elena Rostova",
      phone: "+1 800 555 0199",
      category: "Speakers & Amplifiers",
      activePOs: 1,
      status: "Active",
    },
    {
      id: "sup_03",
      companyName: "Philips Automotive Lighting Co.",
      contactPerson: "Hans Weber",
      phone: "+49 30 123456",
      category: "LED Bulbs & Xenon",
      activePOs: 0,
      status: "Active",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Supplier & Vendor Directory"
        description="Manage product suppliers, wholesale vendor terms, and procurement orders."
      >
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm">
            <FileText className="h-3.5 w-3.5 mr-1.5" />
            Purchase Orders
          </Button>
          <Button variant="primary" size="sm">
            <Plus className="h-3.5 w-3.5 mr-1.5" />
            Add Supplier
          </Button>
        </div>
      </PageHeader>

      <Card noPadding className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <div>
            <CardTitle>Wholesale Vendors</CardTitle>
            <CardDescription>Approved suppliers for inventory replenishment.</CardDescription>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Supplier Company</th>
                <th className="py-3 px-4">Contact Person</th>
                <th className="py-3 px-4">Category</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4 text-center">Open POs</th>
                <th className="py-3 px-4 text-center">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockSuppliers.map((sup) => (
                <tr key={sup.id} className="hover:bg-slate-50/75">
                  <td className="py-3 px-4 font-semibold text-slate-900">{sup.companyName}</td>
                  <td className="py-3 px-4">{sup.contactPerson}</td>
                  <td className="py-3 px-4 text-slate-500">{sup.category}</td>
                  <td className="py-3 px-4 font-mono">{sup.phone}</td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="secondary" size="sm">
                      {sup.activePOs} POs
                    </Badge>
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant="success" size="sm">
                      {sup.status}
                    </Badge>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </Card>
    </div>
  );
}
