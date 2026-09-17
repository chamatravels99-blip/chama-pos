import React from "react";
import { Package, Plus, Search, Filter, Layers, Smartphone, Shirt, Wrench } from "lucide-react";
import { PageHeader } from "@/components/layout/PageHeader";
import { Button } from "@/components/ui/Button";
import { Card, CardHeader, CardTitle, CardDescription } from "@/components/ui/Card";
import { Badge } from "@/components/ui/Badge";

export default function ProductsPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        title="Products & Catalog"
        description="Manage your inventory items, multi-attribute variants, and industry specifications."
      >
        <Button variant="primary" size="md">
          <Plus className="h-4 w-4 mr-1.5" />
          Add New Product
        </Button>
      </PageHeader>

      {/* Filter and Search Bar (Placeholder) */}
      <div className="flex flex-col sm:flex-row gap-3 items-center justify-between">
        <div className="relative w-full sm:w-80">
          <Search className="absolute left-3 top-2.5 h-4 w-4 text-slate-400" />
          <input
            type="text"
            placeholder="Search by name, SKU, barcode, or IMEI..."
            className="w-full rounded-lg border border-slate-200 bg-white pl-9 pr-3 py-2 text-xs placeholder:text-slate-400 focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            disabled
          />
        </div>
        <div className="flex items-center gap-2 w-full sm:w-auto">
          <Button variant="outline" size="sm" className="w-full sm:w-auto" disabled>
            <Filter className="h-3.5 w-3.5 mr-1.5 text-slate-500" />
            Filter by Category
          </Button>
        </div>
      </div>

      {/* Extensible Industry Data Model Preview */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card className="border-blue-200 bg-blue-50/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-blue-800">
              <Smartphone className="h-4 w-4 text-blue-600" />
              <CardTitle className="text-sm">Phone Shops & Electronics</CardTitle>
            </div>
            <CardDescription>
              Supports IMEI numbers, device condition (new/refurbished), storage capacity, battery health, and warranty periods.
            </CardDescription>
          </CardHeader>
          <div className="pt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" size="sm">IMEI Tracking</Badge>
            <Badge variant="secondary" size="sm">Serial Number</Badge>
            <Badge variant="secondary" size="sm">Battery Health</Badge>
            <Badge variant="secondary" size="sm">Warranty Months</Badge>
          </div>
        </Card>

        <Card className="border-emerald-200 bg-emerald-50/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-emerald-800">
              <Shirt className="h-4 w-4 text-emerald-600" />
              <CardTitle className="text-sm">Clothing & Fashion Retail</CardTitle>
            </div>
            <CardDescription>
              Matrix variants for multi-dimensional SKU options (Size: XS–XXL, Color, Fabric, Season, and Gender).
            </CardDescription>
          </CardHeader>
          <div className="pt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" size="sm">Size Matrix</Badge>
            <Badge variant="secondary" size="sm">Color Swatches</Badge>
            <Badge variant="secondary" size="sm">Fabric Material</Badge>
            <Badge variant="secondary" size="sm">Seasonal Lines</Badge>
          </div>
        </Card>

        <Card className="border-amber-200 bg-amber-50/30">
          <CardHeader>
            <div className="flex items-center gap-2 text-amber-800">
              <Wrench className="h-4 w-4 text-amber-600" />
              <CardTitle className="text-sm">Car Accessories & Audio</CardTitle>
            </div>
            <CardDescription>
              OEM part numbers, vehicle make/model compatibility, fitment year range, and installation specifications.
            </CardDescription>
          </CardHeader>
          <div className="pt-3 flex flex-wrap gap-1.5">
            <Badge variant="secondary" size="sm">OEM Part No.</Badge>
            <Badge variant="secondary" size="sm">Make & Model</Badge>
            <Badge variant="secondary" size="sm">Fitment Year</Badge>
            <Badge variant="secondary" size="sm">Brand / Audio Specs</Badge>
          </div>
        </Card>
      </div>

      {/* Architectural Foundation Box */}
      <Card className="p-8 text-center border-dashed border-slate-300">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-slate-100 text-slate-600 mb-3">
          <Package className="h-6 w-6" />
        </div>
        <h3 className="text-sm font-semibold text-slate-900">
          Product Catalog & Schema Ready
        </h3>
        <p className="mt-1 text-xs text-slate-500 max-w-md mx-auto">
          The underlying <code className="text-brand-600 font-mono">Product</code> Mongoose model and TypeScript types are configured with compound tenant isolation index <code className="text-brand-600 font-mono">&#123; businessId: 1, sku: 1 &#125;</code>.
        </p>
        <div className="mt-4 flex items-center justify-center gap-2">
          <Badge variant="default" size="md">Phase 1 Foundation</Badge>
          <Badge variant="outline" size="md">CRUD Implementation in Phase 2</Badge>
        </div>
      </Card>
    </div>
  );
}
