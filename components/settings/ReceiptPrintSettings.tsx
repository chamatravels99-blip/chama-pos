"use client";

import { useState } from "react";
import { Printer } from "lucide-react";
import { Button } from "@/components/ui/Button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/Card";

type PrintFormat = "80mm" | "A4";

export function ReceiptPrintSettings({
  defaultPrintFormat,
  canEdit,
}: {
  defaultPrintFormat: PrintFormat;
  canEdit: boolean;
}) {
  const [format, setFormat] = useState<PrintFormat>(defaultPrintFormat);
  const [savedFormat, setSavedFormat] = useState<PrintFormat>(defaultPrintFormat);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");
  const [isError, setIsError] = useState(false);

  async function saveSettings() {
    setIsSaving(true);
    setMessage("");
    setIsError(false);
    try {
      const response = await fetch("/api/businesses/me", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ defaultPrintFormat: format }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || "Unable to save print settings.");
      const updatedFormat: PrintFormat = data.business?.settings?.defaultPrintFormat === "A4" ? "A4" : "80mm";
      setFormat(updatedFormat);
      setSavedFormat(updatedFormat);
      setMessage("Print settings saved.");
    } catch (error) {
      setIsError(true);
      setMessage(error instanceof Error ? error.message : "Unable to save print settings.");
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center gap-2">
          <Printer className="h-4 w-4 text-brand-600" />
          <CardTitle>Receipt &amp; Invoice</CardTitle>
        </div>
        <CardDescription>Choose the format used by the default print action.</CardDescription>
      </CardHeader>
      <fieldset className="mt-4 space-y-3" disabled={!canEdit || isSaving}>
        <legend className="mb-2 text-xs font-semibold text-slate-700">Default Print Format</legend>
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 text-sm">
          <input type="radio" name="defaultPrintFormat" value="80mm" checked={format === "80mm"} onChange={() => { setFormat("80mm"); setMessage(""); }} />
          <span>80mm Thermal Receipt</span>
        </label>
        <label className="flex cursor-pointer items-center gap-3 rounded-md border border-slate-200 p-3 text-sm">
          <input type="radio" name="defaultPrintFormat" value="A4" checked={format === "A4"} onChange={() => { setFormat("A4"); setMessage(""); }} />
          <span>A4 Invoice</span>
        </label>
      </fieldset>
      {canEdit ? (
        <div className="mt-4 flex flex-wrap items-center gap-3">
          <Button onClick={saveSettings} disabled={isSaving || format === savedFormat}>
            {isSaving ? "Saving..." : "Save Settings"}
          </Button>
          {message && <p role="status" className={`text-xs ${isError ? "text-rose-600" : "text-emerald-700"}`}>{message}</p>}
        </div>
      ) : <p className="mt-3 text-xs text-slate-500">You do not have permission to change this setting.</p>}
    </Card>
  );
}