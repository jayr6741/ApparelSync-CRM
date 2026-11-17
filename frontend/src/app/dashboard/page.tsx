"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { formatCurrency } from "@/lib/utils";

type Overview = {
  salesCount: number;
  lifetimeRevenue: string | number;
  todayRevenue: string | number;
  monthRevenue: string | number;
  productCount: number;
  customerCount: number;
  lowStockVariants: number;
  recentSales: Array<{id:string;invoice_number:string|null;total:string|number;status:string;sale_date:string}>;
};

const money = (value: string | number) => formatCurrency(Number(value) || 0);

export default function Dashboard() {
  const [data,setData] = useState<Overview|null>(null);
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const load = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoading(true);
    setError("");
    try {
      const result = await apiRequest<{data:Overview}>("/reports/overview",{method:"GET"},session.token);
      setData(result.data);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to load dashboard");
    } finally { setLoading(false); }
  },[]);
  useEffect(()=>{void load();},[load]);

  const metrics = [
    {label:"Today's sales",value:money(data?.todayRevenue ?? 0),hint:"Completed invoices"},
    {label:"This month's sales",value:money(data?.monthRevenue ?? 0),hint:"Current month"},
    {label:"Total sales",value:String(data?.salesCount ?? 0),hint:"Completed invoices"},
    {label:"Lifetime revenue",value:money(data?.lifetimeRevenue ?? 0),hint:"All completed sales"},
    {label:"Products",value:String(data?.productCount ?? 0),hint:"Product catalogue"},
    {label:"Customers",value:String(data?.customerCount ?? 0),hint:"Customer directory"},
    {label:"Low-stock variants",value:String(data?.lowStockVariants ?? 0),hint:"At or below reorder threshold"},
  ];

  return <section className="space-y-7">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">GARMENTOS overview</p><h1 className="mt-2 text-3xl font-bold text-white">Dashboard</h1><p className="mt-1 text-sm text-slate-400">Live figures from your PostgreSQL shop workspace.</p></div>
      <button onClick={()=>void load()} disabled={loading} className="rounded-xl border border-slate-700 px-4 py-2 text-sm text-slate-200 disabled:opacity-50">{loading?"Refreshing…":"Refresh data"}</button>
    </header>
    {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
    {loading&&!data?<p className="rounded-xl border border-slate-800 bg-[#111520] p-6 text-slate-400">Loading shop data…</p>:<>
      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">{metrics.map(m=><article key={m.label} className="rounded-2xl border border-slate-800 bg-[#111520] p-5"><p className="text-sm text-slate-400">{m.label}</p><p className="mt-3 text-2xl font-bold text-white">{m.value}</p><p className="mt-2 text-xs text-slate-500">{m.hint}</p></article>)}</div>
      <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5"><div><h2 className="font-semibold text-white">Recent sales</h2><p className="mt-1 text-xs text-slate-500">Latest completed and recorded invoices</p></div><Link href="/dashboard/orders" className="text-sm font-semibold text-emerald-300">View sales</Link></div>
        {!data?.recentSales.length?<p className="p-8 text-center text-sm text-slate-400">No sales recorded yet. Start from the POS screen.</p>:<div className="divide-y divide-slate-800/70">{data.recentSales.map(s=><div key={s.id} className="flex flex-wrap items-center justify-between gap-3 px-5 py-4"><div><p className="font-medium text-white">{s.invoice_number||"Sales invoice"}</p><p className="mt-1 text-xs text-slate-500">{new Date(s.sale_date).toLocaleString("en-IN")}</p></div><div className="text-right"><p className="font-semibold text-white">{money(s.total)}</p><p className="mt-1 text-xs capitalize text-emerald-300">{s.status}</p></div></div>)}</div>}
      </div>
    </>}
  </section>;
}
