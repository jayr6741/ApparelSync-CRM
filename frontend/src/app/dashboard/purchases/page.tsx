"use client";

import { useCallback,useEffect,useState } from "react";
import { RefreshCw,Truck,PackageCheck } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";

type Purchase={id:string;purchase_number:string;status:string;grand_total:string|number;created_at:string;supplier_name:string};
type List={data:Purchase[]};
export default function PurchasesPage(){
 const [rows,setRows]=useState<Purchase[]>([]),[loading,setLoading]=useState(true),[error,setError]=useState("");
 const load=useCallback(async()=>{const s=readSession();if(!s)return;setLoading(true);try{const r=await apiRequest<List>("/purchases",{method:"GET"},s.token);setRows(r.data);}catch(e){setError(e instanceof Error?e.message:"Unable to load purchases");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 async function receive(id:string){const s=readSession();if(!s)return;setError("");try{await apiRequest("/purchases/"+id+"/receive",{method:"POST"},s.token);await load();}catch(e){setError(e instanceof Error?e.message:"Could not receive purchase");}}
 return <section className="space-y-6"><header className="flex items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Procurement</p><h1 className="mt-2 text-3xl font-bold text-white">Purchase orders</h1><p className="mt-1 text-sm text-slate-400">Review orders and receive stock into your default warehouse.</p></div><button onClick={()=>void load()} className="rounded-xl border border-slate-700 p-3 text-slate-300" aria-label="Refresh purchases"><RefreshCw size={17}/></button></header>
 {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
 <div className="rounded-2xl border border-slate-800 bg-[#111520]">{loading?<p className="p-6 text-sm text-slate-400">Loading purchase orders...</p>:rows.length===0?<div className="p-10 text-center text-slate-400"><Truck className="mx-auto mb-3 opacity-50" size={28}/><p>No purchase orders yet.</p><p className="mt-2 text-xs">Supplier and purchase creation APIs are available; the purchase-entry form is the next UI task.</p></div>:rows.map(p=><div key={p.id} className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-800 p-5 last:border-0"><div><p className="font-semibold text-white">{p.purchase_number} · {p.supplier_name}</p><p className="mt-1 text-xs capitalize text-slate-400">{p.status} · {new Date(p.created_at).toLocaleDateString("en-IN")}</p></div><div className="flex items-center gap-4"><span className="font-semibold text-emerald-300">₹{Number(p.grand_total).toFixed(2)}</span>{p.status!=="received"&&p.status!=="cancelled"&&<button onClick={()=>void receive(p.id)} className="inline-flex items-center gap-2 rounded-lg bg-emerald-400 px-3 py-2 text-sm font-semibold text-slate-950"><PackageCheck size={16}/> Receive stock</button>}</div></div>)}</div>
 </section>;
}
