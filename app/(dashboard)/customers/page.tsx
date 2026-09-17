import React from "react";
import { Users, UserPlus, Search, Phone, Mail, Award, CreditCard } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function CustomersPage() {
  const mockCustomers = [
    {
      id: "cust_101",
      name: "Rohan De Silva",
      phone: "+94 77 123 4567",
      email: "rohan.desilva@gmail.com",
      totalSpend: 1450.0,
      ordersCount: 8,
      status: "VIP",
    },
    {
      id: "cust_102",
      name: "Nimal Wickramasinghe",
      phone: "+94 71 889 0012",
      email: "nimalw@outlook.com",
      totalSpend: 912.6,
      ordersCount: 4,
      status: "Regular",
    },
    {
      id: "cust_103",
      name: "Mahesh Jayasuriya",
      phone: "+94 76 554 3210",
      email: "mahesh.j@autoenterprises.lk",
      totalSpend: 3420.0,
      ordersCount: 15,
      status: "Wholesale",
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title="Customer Directory"
        description="Manage customer relationships, store credit, and customer purchase history."
      >
        <Button variant="primary" size="md">
          <UserPlus className="h-4 w-4 mr-1.5" />
          Add Customer
        </Button>
      </PageHeader>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-medium">Total Registered</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">1,290</div>
          <div className="text-[11px] text-emerald-600 mt-1">+24 this week</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-medium">Repeat Customers</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">64.2%</div>
          <div className="text-[11px] text-slate-400 mt-1">High retention rate</div>
        </Card>
        <Card className="p-4">
          <div className="text-xs text-slate-500 font-medium">Outstanding Store Credit</div>
          <div className="text-2xl font-bold text-slate-900 mt-1">$480.00</div>
          <div className="text-[11px] text-slate-400 mt-1">3 accounts active</div>
        </Card>
      </div>

      <Card noPadding className="overflow-hidden">
        <div className="p-4 border-b border-slate-100 flex items-center justify-between">
          <CardTitle>Customer Accounts</CardTitle>
          <div className="relative w-64">
            <Search className="absolute left-3 top-2.5 h-3.5 w-3.5 text-slate-400" />
            <input
              type="text"
              placeholder="Search customers..."
              className="w-full rounded-lg border border-slate-200 bg-white pl-8 pr-3 py-1.5 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none"
              disabled
            />
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-slate-600">
            <thead className="border-b border-slate-200 bg-slate-50/75 text-[11px] font-semibold uppercase tracking-wider text-slate-500">
              <tr>
                <th className="py-3 px-4">Customer Name</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4 text-center">Orders</th>
                <th className="py-3 px-4 text-right">Total Spent</th>
                <th className="py-3 px-4 text-center">Tier</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {mockCustomers.map((cust) => (
                <tr key={cust.id} className="hover:bg-slate-50/75">
                  <td className="py-3 px-4 font-medium text-slate-900">{cust.name}</td>
                  <td className="py-3 px-4">{cust.phone}</td>
                  <td className="py-3 px-4 text-slate-500">{cust.email}</td>
                  <td className="py-3 px-4 text-center">{cust.ordersCount}</td>
                  <td className="py-3 px-4 text-right font-semibold text-slate-900">
                    ${cust.totalSpend.toFixed(2)}
                  </td>
                  <td className="py-3 px-4 text-center">
                    <Badge variant={cust.status === "VIP" ? "default" : "secondary"} size="sm">
                      {cust.status}
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
