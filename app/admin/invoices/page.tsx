"use client";

import { useEffect, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";

type InvoiceOrder = {
  id:string; order_number?:string; created_at:string; status?:string;
  customer_name?:string; customer_phone?:string; customer_email?:string;
  shipping_address?:string; shipping_city?:string; notes?:string;
  payment_method?:string; payment_status?:string; subtotal?:number;
  delivery_fee?:number; total?:number;
  order_items?:Array<{product_name?:string;sku?:string;selected_option?:string;quantity?:number;unit_price?:number;line_total?:number}>;
};

const money=(value:number)=>"৳"+Number(value||0).toLocaleString("en-BD",{minimumFractionDigits:2,maximumFractionDigits:2});
const dateLabel=(value:string)=>value?new Date(value).toLocaleString("en-BD",{day:"2-digit",month:"long",year:"numeric",hour:"2-digit",minute:"2-digit"}):"—";
const paymentLabel=(method?:string)=>method==="bkash_manual"?"bKash":method==="nagad_manual"?"Nagad":"Cash on Delivery";

export default function AdminInvoicesPage(){
  const params=useSearchParams();
  const selectedId=params.get("order");
  const [orders,setOrders]=useState<InvoiceOrder[]>([]);
  const [loading,setLoading]=useState(true);
  const [error,setError]=useState("");
  useEffect(()=>{
    let active=true;
    fetch("/api/admin/orders",{cache:"no-store"})
      .then(async response=>{const data=await response.json();if(!response.ok)throw new Error(data.error||"Could not load invoices.");return data.orders||[];})
      .then(rows=>{if(active)setOrders(rows);})
      .catch(err=>{if(active)setError(err instanceof Error?err.message:"Could not load invoices.");})
      .finally(()=>{if(active)setLoading(false);});
    return ()=>{active=false;};
  },[]);
  const invoices=useMemo(()=>selectedId?orders.filter(o=>o.id===selectedId||o.order_number===selectedId):orders,[orders,selectedId]);
  const print=()=>window.print();
  return <main className="invoice-workspace">
    <div className="invoice-toolbar no-print">
      <a href="/admin">← Back to dashboard</a>
      <div><b>{selectedId?"Order Invoice":"All Order Invoices"}</b><span>{invoices.length} invoice{invoices.length===1?"":"s"}</span></div>
      <button onClick={print} disabled={loading||invoices.length===0}>{selectedId?"Print / Download Invoice":"Print / Download All Invoices"}</button>
    </div>
    {loading?<p className="invoice-state">Loading order invoices…</p>:error?<p className="invoice-state invoice-error">{error}</p>:invoices.length===0?<p className="invoice-state">No invoice found for this order.</p>:<div className="invoice-list">
      {invoices.map(order=><article className="invoice-sheet" key={order.id}>
        <header className="invoice-header"><div><div className="invoice-brand">NEXORA</div><p>Everyday, Elevated</p></div><div className="invoice-title"><h1>INVOICE</h1><b>{order.order_number||order.id}</b><span>{dateLabel(order.created_at)}</span></div></header>
        <div className="invoice-parties">
          <section><small>BILLED TO</small><h2>{order.customer_name||"Customer"}</h2><p>{order.customer_phone||"Phone not provided"}</p><p>{order.customer_email||""}</p></section>
          <section><small>SHIP TO</small><p>{order.shipping_address||"Address not provided"}</p><p>{order.shipping_city||""}</p></section>
          <section><small>ORDER DETAILS</small><p>Payment: {paymentLabel(order.payment_method)}</p><p>Payment status: {(order.payment_status||"unpaid").replaceAll("_"," ")}</p><p>Order status: {(order.status||"pending").replaceAll("_"," ")}</p></section>
        </div>
        <table className="invoice-items"><thead><tr><th>Product</th><th>Option / SKU</th><th>Qty</th><th>Unit price</th><th>Amount</th></tr></thead><tbody>
          {(order.order_items||[]).map((item,index)=><tr key={index}><td>{item.product_name||"Product"}</td><td>{[item.selected_option,item.sku].filter(Boolean).join(" · ")||"—"}</td><td>{Number(item.quantity||0)}</td><td>{money(Number(item.unit_price||0))}</td><td>{money(Number(item.line_total??Number(item.unit_price||0)*Number(item.quantity||0)))}</td></tr>)}
        </tbody></table>
        <div className="invoice-bottom">
          <div className="invoice-notes"><small>NOTES</small><p>{order.notes||"Thank you for shopping with NEXORA."}</p></div>
          <div className="invoice-totals"><div><span>Subtotal</span><b>{money(Number(order.subtotal||0))}</b></div><div><span>Delivery charge</span><b>{money(Number(order.delivery_fee||0))}</b></div><div className="invoice-grand-total"><span>Total</span><b>{money(Number(order.total||0))}</b></div></div>
        </div>
        <footer className="invoice-footer"><b>Thank you for choosing NEXORA!</b><span>Store invoice only · Not a courier shipping label or waybill.</span></footer>
      </article>)}
    </div>}
    <style jsx global>{`
      .invoice-workspace{min-height:100vh;background:#f4f4f2;color:#222;padding:24px;font-family:'DM Sans',sans-serif}
      .invoice-toolbar{max-width:900px;margin:0 auto 22px;display:flex;align-items:center;justify-content:space-between;gap:16px;background:#fff;border:1px solid #e5e5e2;border-radius:12px;padding:14px 18px}
      .invoice-toolbar>a{color:#333;text-decoration:none;font-size:13px}.invoice-toolbar>div{display:flex;flex-direction:column;gap:3px}.invoice-toolbar>div span{font-size:11px;color:#777}
      .invoice-toolbar button{border:0;border-radius:7px;background:#202b25;color:white;padding:12px 18px;font-weight:700;cursor:pointer}.invoice-toolbar button:disabled{opacity:.5}
      .invoice-list{display:flex;flex-direction:column;align-items:center;gap:22px}
      .invoice-sheet{width:100%;max-width:850px;min-height:1050px;background:white;padding:54px 58px;box-shadow:0 8px 30px #0000000d;display:flex;flex-direction:column}
      .invoice-header{display:flex;justify-content:space-between;gap:20px;border-bottom:2px solid #242b26;padding-bottom:24px}.invoice-brand{font-size:32px;font-weight:900;letter-spacing:3px}.invoice-header p{margin:5px 0;color:#777;font-size:12px}
      .invoice-title{text-align:right}.invoice-title h1{font-size:27px;letter-spacing:3px;margin:0 0 8px}.invoice-title b,.invoice-title span{display:block;font-size:12px;margin-top:4px}
      .invoice-parties{display:grid;grid-template-columns:1fr 1fr 1fr;gap:20px;padding:28px 0}.invoice-parties small,.invoice-notes small{font-size:9px;letter-spacing:1.4px;font-weight:800;color:#777}.invoice-parties h2{font-size:15px;margin:9px 0 6px}.invoice-parties p{font-size:11px;line-height:1.6;margin:3px 0;overflow-wrap:anywhere}
      .invoice-items{width:100%;border-collapse:collapse;font-size:11px}.invoice-items th{background:#f1f3f0;text-align:left;font-size:9px;letter-spacing:.5px;text-transform:uppercase}.invoice-items th,.invoice-items td{padding:12px 9px;border-bottom:1px solid #e8e8e5}.invoice-items td:nth-child(n+3),.invoice-items th:nth-child(n+3){text-align:right}
      .invoice-bottom{display:flex;justify-content:space-between;gap:30px;margin-top:28px}.invoice-notes{max-width:48%}.invoice-notes p{font-size:11px;line-height:1.6;color:#666}.invoice-totals{width:260px}.invoice-totals div{display:flex;justify-content:space-between;gap:20px;padding:8px 0;font-size:12px;border-bottom:1px solid #eee}.invoice-grand-total{font-size:17px!important;border-bottom:0!important;padding-top:14px!important}.invoice-footer{margin-top:auto;padding-top:35px;border-top:1px solid #e7e7e3;display:flex;justify-content:space-between;gap:12px;font-size:11px}.invoice-footer span{color:#888}
      .invoice-state{max-width:850px;margin:40px auto;background:white;padding:28px;border-radius:10px}.invoice-error{color:#a33}
      @media(max-width:650px){.invoice-workspace{padding:10px}.invoice-toolbar{align-items:stretch;flex-direction:column}.invoice-toolbar button{width:100%}.invoice-sheet{padding:25px 18px;min-height:900px}.invoice-parties{grid-template-columns:1fr 1fr}.invoice-bottom{flex-direction:column}.invoice-notes{max-width:none}.invoice-totals{width:100%}.invoice-items{font-size:9px}.invoice-items th,.invoice-items td{padding:8px 4px}}
      @media print{
        @page{size:A4;margin:12mm}
        body{background:#fff!important}.invoice-workspace{padding:0!important;background:#fff!important}.no-print{display:none!important}.invoice-list{display:block!important}.invoice-sheet{width:100%!important;max-width:none!important;min-height:0!important;height:273mm!important;padding:0!important;margin:0!important;box-shadow:none!important;break-after:page;page-break-after:always;overflow:hidden}.invoice-sheet:last-child{break-after:auto;page-break-after:auto}
      }
    `}</style>
  </main>;
}
