"use client";

import { useCallback,useEffect,useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

type Sale={id:string;invoice_number:string|null;total:string|number;subtotal:string|number;tax_total:string|number;discount_amount:string|number;payment_method:string;status:string;sale_date:string};
export default function OrdersPage(){
 const [rows,setRows]=useState<Sale[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{const s=readSession();if(!s)return;setLoading(true);setError("");try{const r=await apiRequest<{data:Sale[]}>("/sales",{method:"GET"},s.token);setRows(r.data);}catch(e){setError(e instanceof Error?e.message:"Unable to load sales");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 return <section className="space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Sales management</p><h1 className="mt-2 text-3xl font-bold text-white">Sales & invoices</h1><p className="mt-1 text-sm text-slate-400">Invoices recorded in your PostgreSQL shop database.</p></div><div className="flex gap-2"><button onClick={()=>void load()} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200">Refresh</button><Link href="/dashboard/pos" className="rounded-xl bg-emerald-400 px-4 py-2 text-sm font-semibold text-slate-950">Open POS</Link></div></header>
  {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
  <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]">
   <div className="grid grid-cols-12 gap-3 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase text-slate-500"><span className="col-span-4">Invoice</span><span className="col-span-2">Date</span><span className="col-span-2">Payment</span><span className="col-span-2">Status</span><span className="col-span-2 text-right">Total</span></div>
   {loading?<p className="p-6 text-sm text-slate-400">Loading invoices…</p>:rows.length===0?<p className="p-10 text-center text-sm text-slate-400">No invoices found. Complete a sale from POS to see it here.</p>:rows.map(s=><div key={s.id} className="grid grid-cols-12 items-center gap-3 border-b border-slate-800/70 px-5 py-4 last:border-0"><div className="col-span-4 min-w-0"><p className="truncate font-semibold text-white">{s.invoice_number||"Invoice"}</p><p className="truncate text-xs text-slate-500">{s.id}</p></div><span className="col-span-2 text-xs text-slate-300">{new Date(s.sale_date).toLocaleDateString("en-IN")}</span><span className="col-span-2 text-xs capitalize text-slate-300">{String(s.payment_method).replace("_"," ")}</span><span className="col-span-2 text-xs capitalize text-emerald-300">{s.status}</span><span className="col-span-2 text-right text-sm font-semibold text-white">{formatCurrency(Number(s.total)||0)}</span></div>)}
  </div>
 </section>;
}
