"use client";

import { useEffect,useState } from "react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";
import { BarChart3,IndianRupee,Package,Users,AlertTriangle } from "lucide-react";

type Overview={salesCount:number;lifetimeRevenue:string|number;todayRevenue:string|number;monthRevenue:string|number;productCount:number;customerCount:number;lowStockVariants:number;recentSales:{id:string;invoice_number:string|null;total:string|number;status:string;sale_date:string}[]};
export default function ReportsPage(){
 const [data,setData]=useState<Overview|null>(null),[error,setError]=useState("");
 useEffect(()=>{const s=readSession();if(!s)return;apiRequest<{data:Overview}>("/reports/overview",{method:"GET"},s.token).then(r=>setData(r.data)).catch(e=>setError(e instanceof Error?e.message:"Unable to load reports"));},[]);
 const cards=data?[{label:"Today's sales",value:`₹${Number(data.todayRevenue).toLocaleString("en-IN",{maximumFractionDigits:2})}`,icon:IndianRupee},{label:"This month's sales",value:`₹${Number(data.monthRevenue).toLocaleString("en-IN",{maximumFractionDigits:2})}`,icon:BarChart3},{label:"Products",value:String(data.productCount),icon:Package},{label:"Customers",value:String(data.customerCount),icon:Users},{label:"Low-stock variants",value:String(data.lowStockVariants),icon:AlertTriangle}]:[];
 return <section className="space-y-6"><header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Business intelligence</p><h1 className="mt-2 text-3xl font-bold text-white">Reports & analytics</h1><p className="mt-1 text-sm text-slate-400">Live summary calculated from your shop's PostgreSQL records.</p></header>
 {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
 {!data&&!error&&<p className="text-sm text-slate-400">Loading reports...</p>}
 {data&&<><div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">{cards.map(c=><div key={c.label} className="rounded-2xl border border-slate-800 bg-[#111520] p-5"><div className="flex items-center justify-between text-slate-400"><span className="text-sm">{c.label}</span><c.icon size={18}/></div><p className="mt-4 text-2xl font-bold text-white">{c.value}</p></div>)}</div>
 <div className="rounded-2xl border border-slate-800 bg-[#111520]"><div className="border-b border-slate-800 p-5"><h2 className="font-semibold text-white">Recent sales</h2><p className="mt-1 text-xs text-slate-500">All values in INR</p></div>{data.recentSales.length===0?<p className="p-6 text-sm text-slate-400">No sales recorded yet.</p>:data.recentSales.map(s=><div key={s.id} className="flex flex-wrap justify-between gap-3 border-b border-slate-800/70 px-5 py-4 last:border-0"><div><p className="font-semibold text-white">{s.invoice_number||"Sale"}</p><p className="text-xs text-slate-500">{new Date(s.sale_date).toLocaleString("en-IN")}</p></div><div className="text-right"><p className="font-semibold text-emerald-300">₹{Number(s.total).toFixed(2)}</p><p className="text-xs capitalize text-slate-500">{s.status}</p></div></div>)}</div></>}
 </section>;
}
