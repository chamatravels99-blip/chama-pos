import { PrintSalePage } from "@/components/print/PrintSalePage";

type PageProps = {
  params: { saleId: string };
  searchParams: { format?: string | string[] };
};

export default function SalePrintRoute({ params, searchParams }: PageProps) {
  const format = Array.isArray(searchParams.format) ? searchParams.format[0] : searchParams.format || "80mm";
  return <PrintSalePage saleId={params.saleId} format={format} />;
}