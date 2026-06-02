import { useEffect, useState, useRef } from "react";
import { useParams } from "react-router-dom";
import api, { formatRupiah, API_BASE } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Printer, Download } from "lucide-react";

/**
 * Thermal-printer optimized receipt page (80mm width).
 * Auto-triggers print dialog on load. Designed for receipts that go straight
 * to a thermal printer set as system default printer.
 */
export default function ThermalReceipt() {
  const { orderId } = useParams();
  const [order, setOrder] = useState(null);

  useEffect(() => {
    api.get(`/orders/${orderId}`).then((r) => setOrder(r.data));
  }, [orderId]);

  const printedRef = useRef(false);

  useEffect(() => {
    if (order && !printedRef.current) {
      printedRef.current = true;
      const t = setTimeout(() => window.print(), 600);
      return () => clearTimeout(t);
    }
  }, [order]);

  if (!order) return <div className="p-8 text-center text-muted-foreground">Memuat struk...</div>;

  const downloadEscpos = () => {
    const token = localStorage.getItem("swm_token");
    const url = `${API_BASE}/orders/${orderId}/escpos`;
    fetch(url, { headers: token ? { Authorization: `Bearer ${token}` } : {} })
      .then((r) => r.blob())
      .then((blob) => {
        const a = document.createElement("a");
        a.href = URL.createObjectURL(blob);
        a.download = `struk-${order.order_number}.bin`;
        a.click();
      });
  };

  return (
    <div className="min-h-screen bg-secondary/30 py-6 print:bg-white print:py-0">
      <style>{`
        @media print {
          @page { size: 80mm auto; margin: 0; }
          body { margin: 0; }
          .no-print { display: none !important; }
          .thermal { box-shadow: none !important; }
        }
        .thermal {
          width: 80mm;
          font-family: 'Courier New', monospace;
          font-size: 11px;
          line-height: 1.4;
          color: #000;
          background: #fff;
        }
      `}</style>

      {/* Toolbar (hidden when printing) */}
      <div className="no-print max-w-md mx-auto mb-4 flex gap-2 px-4">
        <Button onClick={() => window.print()} className="flex-1" data-testid="thermal-print">
          <Printer size={14} className="mr-1" /> Cetak Sekarang
        </Button>
        <Button variant="outline" onClick={downloadEscpos} data-testid="thermal-escpos">
          <Download size={14} className="mr-1" /> ESC/POS .bin
        </Button>
      </div>

      {/* 80mm thermal receipt */}
      <div className="thermal mx-auto p-4 shadow-md">
        <div className="text-center">
          <p className="font-bold text-base tracking-wide">SWM CAFE</p>
          <p>Jl. Kopi No. 1</p>
          <p>Telp. 021-xxx</p>
        </div>
        <div className="border-t border-dashed border-black my-2" />
        <div>
          <Row k="No." v={`#${order.order_number}`} />
          <Row k="Meja" v={order.table_number} />
          <Row k="Tanggal" v={new Date(order.created_at).toLocaleString("id-ID")} />
          <Row k="Metode" v={String(order.payment_method).toUpperCase()} />
        </div>
        <div className="border-t border-dashed border-black my-2" />
        <div className="space-y-1">
          {order.items.map((i, idx) => (
            <div key={idx}>
              <p className="font-bold">
                {i.qty}x {i.name}
              </p>
              <div className="flex justify-between pl-2">
                <span>@ {formatRupiah(i.price)}</span>
                <span>{formatRupiah(i.price * i.qty)}</span>
              </div>
              {i.note && <p className="pl-2 italic">- {i.note}</p>}
            </div>
          ))}
        </div>
        <div className="border-t border-dashed border-black my-2" />
        <Row k="Subtotal" v={formatRupiah(order.subtotal)} />
        <Row k="Pajak" v={formatRupiah(order.tax)} />
        <div className="font-bold text-sm">
          <Row k="TOTAL" v={formatRupiah(order.total)} />
        </div>
        {order.cash_received != null && (
          <>
            <Row k="Tunai" v={formatRupiah(order.cash_received)} />
            <Row k="Kembali" v={formatRupiah(order.cash_change || 0)} />
          </>
        )}
        <div className="border-t border-dashed border-black my-2" />
        <p className="text-center">Terima kasih telah memesan</p>
        <p className="text-center">~ SWM Cafe ~</p>
      </div>
    </div>
  );
}

function Row({ k, v }) {
  return (
    <div className="flex justify-between">
      <span>{k}</span>
      <span>{v}</span>
    </div>
  );
}
