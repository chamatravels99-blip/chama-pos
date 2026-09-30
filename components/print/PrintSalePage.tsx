"use client";

import { useEffect, useRef, useState } from "react";
import { A4Invoice } from "@/components/print/A4Invoice";
import { ThermalReceipt } from "@/components/print/ThermalReceipt";
import { Button } from "@/components/ui/Button";
import { PrintBranchData, PrintBusinessData, PrintSaleData } from "@/components/print/print-utils";

type PrintPayload = {
  sale: PrintSaleData;
  business: PrintBusinessData;
  branch: PrintBranchData;
};

interface PrintSalePageProps {
  saleId: string;
  format: string;
  embedded?: boolean;
  autoPrint?: boolean;
  onPrintFinished?: () => void;
  onError?: (message: string) => void;
}

export function PrintSalePage({
  saleId,
  format,
  embedded = false,
  autoPrint = true,
  onPrintFinished,
  onError,
}: PrintSalePageProps) {
  const [payload, setPayload] = useState<PrintPayload | null>(null);
  const [error, setError] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const printRootRef = useRef<HTMLElement>(null);
  const didAutoPrint = useRef<string | null>(null);

  useEffect(() => {
    let active = true;
    async function load() {
      try {
        const response = await fetch(`/api/sales/${encodeURIComponent(saleId)}/print?format=${encodeURIComponent(format)}`, { cache: "no-store" });
        const data = await response.json();
        if (!response.ok) throw new Error(data.error || "Unable to load this sale for printing.");
        if (active) setPayload(data);
      } catch (loadError) {
        if (active) setError(loadError instanceof Error ? loadError.message : "Unable to load this sale for printing.");
      } finally {
        if (active) setIsLoading(false);
      }
    }
    load();
    return () => { active = false; };
  }, [saleId, format]);

  useEffect(() => {
    if (embedded && payload) {
      document.body.classList.add("pos-print-active");
      return () => document.body.classList.remove("pos-print-active");
    }
  }, [embedded, payload]);

  useEffect(() => {
    if (error && embedded) {
      onError?.(error);
      onPrintFinished?.();
    }
  }, [embedded, error, onError, onPrintFinished]);

  useEffect(() => {
    const printKey = `${saleId}:${format}`;
    if (!payload || !autoPrint || didAutoPrint.current === printKey) return;

    let cancelled = false;
    let frameId = 0;
    async function printWhenReady() {
      const root = printRootRef.current;
      if (!root) return;

      if ("fonts" in document) {
        await document.fonts.ready;
      }
      const pendingImages = Array.from(root.querySelectorAll("img")).filter((image) => !image.complete);
      if (pendingImages.length > 0) {
        await Promise.all(pendingImages.map((image) => new Promise<void>((resolve) => {
          image.addEventListener("load", () => resolve(), { once: true });
          image.addEventListener("error", () => resolve(), { once: true });
        })));
      }
      if (cancelled) return;

      frameId = window.requestAnimationFrame(() => {
        if (cancelled || !printRootRef.current || didAutoPrint.current === printKey) return;
        didAutoPrint.current = printKey;
        let finished = false;
        const finish = () => {
          if (finished) return;
          finished = true;
          window.removeEventListener("afterprint", finish);
          onPrintFinished?.();
        };
        window.addEventListener("afterprint", finish, { once: true });
        try {
          window.print();
        } finally {
          finish();
        }
      });
    }

    frameId = window.requestAnimationFrame(() => { void printWhenReady(); });
    return () => {
      cancelled = true;
      window.cancelAnimationFrame(frameId);
    };
  }, [autoPrint, embedded, format, onPrintFinished, payload, saleId]);

  if (isLoading) return embedded ? null : <main className="print-status">Preparing print view...</main>;
  if (error || !payload) {
    if (embedded) return null;
    return (
      <main className="print-status">
        <p role="alert">{error || "Unable to load this sale."}</p>
        <Button className="no-print" variant="outline" onClick={() => window.close()}>Close</Button>
      </main>
    );
  }

  return (
    <main
      ref={printRootRef}
      className={`${embedded ? "pos-print-only" : ""} print-page ${format === "A4" ? "print-page-a4" : "print-page-thermal"}`}
    >
      {!embedded && (
        <div className="no-print print-toolbar">
          <Button variant="outline" onClick={() => window.print()}>Print Again</Button>
          <Button variant="ghost" onClick={() => window.close()}>Close</Button>
        </div>
      )}
      {format === "A4" ? (
        <A4Invoice sale={payload.sale} business={payload.business} branch={payload.branch} />
      ) : (
        <ThermalReceipt sale={payload.sale} business={payload.business} branch={payload.branch} />
      )}
    </main>
  );
}