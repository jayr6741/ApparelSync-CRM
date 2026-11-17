"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import { Plus,Search,Users,RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";

type Customer={id:string;full_name:string;email:string|null;phone:string|null;city:string|null;reward_points:number;tier:string};
type List={data:Customer[]};
type CustomerLedger={customer:Customer;summary:{sale_count:number;lifetime_spend:string|number;average_order:string|number};sales:{id:string;invoice_number:string|null;total:string|number;sale_date:string;status:string}[];points:{id:string;points_change:number;type:string;description:string|null;created_at:string}[]};

export default function CustomersPage(){
 const [rows,setRows]=useState<Customer[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[show,setShow]=useState(false),[error,setError]=useState("");
 const [fullName,setFullName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[city,setCity]=useState("");
 const [ledger,setLedger]=useState<CustomerLedger|null>(null),[ledgerLoading,setLedgerLoading]=useState(false),[redeemAmount,setRedeemAmount]=useState(""),[redeemBusy,setRedeemBusy]=useState(false);
 const load=useCallback(async()=>{const s=readSession();if(!s)return;setLoading(true);try{const r=await apiRequest<List>("/customers",{method:"GET"},s.token);setRows(r.data);}catch(e){setError(e instanceof Error?e.message:"Unable to load customers");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>rows.filter(c=>[c.full_name,c.phone??"",c.email??"",c.city??""].join(" ").toLowerCase().includes(query.toLowerCase())),[rows,query]);
 async function openLedger(customer:Customer){
  const s=readSession();if(!s)return;setLedgerLoading(true);setError("");
  try{const r=await apiRequest<{data:CustomerLedger}>("/customers/"+customer.id+"/ledger",{method:"GET"},s.token);setLedger(r.data);}
  catch(e){setError(e instanceof Error?e.message:"Could not load customer ledger");}
  finally{setLedgerLoading(false);}
 }
 async function redeemPoints(e:FormEvent){
  e.preventDefault();const s=readSession();if(!s||!ledger)return;const points=Number(redeemAmount);
  if(!Number.isInteger(points)||points<1||points>ledger.customer.reward_points){setError("Enter valid points within the customer's available balance.");return;}
  setRedeemBusy(true);setError("");
  try{await apiRequest("/customers/"+ledger.customer.id+"/points",{method:"POST",body:JSON.stringify({pointsChange:-points,type:"REDEEMED",description:"Manual points redemption"})},s.token);setRedeemAmount("");await openLedger(ledger.customer);await load();}
  catch(e){setError(e instanceof Error?e.message:"Could not redeem points");}
  finally{setRedeemBusy(false);}
 }
 async function submit(e:FormEvent){e.preventDefault();const s=readSession();if(!s)return;setSaving(true);setError("");try{await apiRequest("/customers",{method:"POST",body:JSON.stringify({fullName,phone,email,city})},s.token);setFullName("");setPhone("");setEmail("");setCity("");setShow(false);await load();}catch(err){setError(err instanceof Error?err.message:"Unable to save customer");}finally{setSaving(false);}}
 return <section className="space-y-6">
  <header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Customer relationship</p><h1 className="mt-2 text-3xl font-bold text-white">Customers</h1><p className="mt-1 text-sm text-slate-400">Customer directory stored in your shop's PostgreSQL workspace.</p></div><button onClick={()=>setShow(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"><Plus size={18}/> Add customer</button></header>
  {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
  {show&&<form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-800 bg-[#111520] p-5 md:grid-cols-2"><h2 className="md:col-span-2 font-semibold text-white">New customer</h2>
   <label className="text-sm text-slate-300">Full name<input required minLength={2} value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
   <label className="text-sm text-slate-300">Phone<input value={phone} onChange={e=>setPhone(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
   <label className="text-sm text-slate-300">Email<input type="email" value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
   <label className="text-sm text-slate-300">City<input value={city} onChange={e=>setCity(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
   <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300">Cancel</button><button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-2 font-semibold text-slate-950">{saving?"Saving...":"Save customer"}</button></div>
  </form>}
  {ledgerLoading&&<p className="rounded-xl border border-slate-700 p-4 text-sm text-slate-400">Loading customer ledger...</p>}
  {ledger&&<div className="space-y-4 rounded-2xl border border-emerald-500/30 bg-[#111520] p-5"><div className="flex items-center justify-between"><div><p className="text-xs uppercase tracking-wider text-emerald-300">Customer ledger</p><h2 className="mt-1 text-xl font-semibold text-white">{ledger.customer.full_name}</h2><p className="text-xs text-slate-400">{ledger.customer.phone||ledger.customer.email||"No contact"}</p></div><button onClick={()=>setLedger(null)} className="text-sm text-slate-400 underline">Close</button></div>
   <div className="grid grid-cols-3 gap-3"><div className="rounded-xl bg-[#0a0d14] p-3"><p className="text-xs text-slate-500">Lifetime spend</p><p className="mt-1 font-semibold text-white">₹{Number(ledger.summary.lifetime_spend).toFixed(2)}</p></div><div className="rounded-xl bg-[#0a0d14] p-3"><p className="text-xs text-slate-500">Orders</p><p className="mt-1 font-semibold text-white">{ledger.summary.sale_count}</p></div><div className="rounded-xl bg-[#0a0d14] p-3"><p className="text-xs text-slate-500">Reward balance</p><p className="mt-1 font-semibold text-emerald-300">{ledger.customer.reward_points} · {ledger.customer.tier}</p></div></div>
   <form onSubmit={redeemPoints} className="flex flex-wrap items-end gap-2"><label className="flex-1 text-xs text-slate-400">Manual reward redemption<input type="number" min="1" max={ledger.customer.reward_points} step="1" value={redeemAmount} onChange={e=>setRedeemAmount(e.target.value)} placeholder="Points to redeem" className="mt-1 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-2.5 text-white"/></label><button disabled={redeemBusy||!redeemAmount||ledger.customer.reward_points<=0} className="rounded-lg border border-emerald-500/40 bg-emerald-500/10 px-4 py-2.5 text-sm font-semibold text-emerald-200 disabled:opacity-50">{redeemBusy?"Saving...":"Redeem points"}</button></form>
   <div className="grid gap-4 md:grid-cols-2"><div><h3 className="mb-2 text-sm font-semibold text-white">Recent invoices</h3>{ledger.sales.length===0?<p className="text-xs text-slate-500">No completed purchases.</p>:ledger.sales.slice(0,8).map(s=><div key={s.id} className="flex justify-between gap-2 border-b border-slate-800 py-2 text-xs"><span className="text-slate-300">{s.invoice_number||"Invoice"} · {new Date(s.sale_date).toLocaleDateString("en-IN")}</span><span className="text-emerald-300">₹{Number(s.total).toFixed(2)}</span></div>)}</div><div><h3 className="mb-2 text-sm font-semibold text-white">Reward transactions</h3>{ledger.points.length===0?<p className="text-xs text-slate-500">No reward transactions.</p>:ledger.points.slice(0,10).map(p=><div key={p.id} className="flex justify-between gap-2 border-b border-slate-800 py-2 text-xs"><span className="text-slate-300">{p.description||p.type} · {new Date(p.created_at).toLocaleDateString("en-IN")}</span><span className={p.points_change>=0?"text-emerald-300":"text-rose-300"}>{p.points_change>0?"+":""}{p.points_change}</span></div>)}</div></div>
  </div>}
  <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-500" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email or city..." className="w-full rounded-xl border border-slate-800 bg-[#111520] py-3 pl-10 pr-4 text-sm text-white"/></div>
  <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]"><div className="grid grid-cols-12 gap-3 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase text-slate-500"><span className="col-span-4">Customer</span><span className="col-span-3">Phone</span><span className="col-span-3">City</span><span className="col-span-2 text-right">Points</span></div>
   {loading?<p className="p-6 text-sm text-slate-400">Loading customers...</p>:filtered.length===0?<div className="p-10 text-center text-slate-400"><Users className="mx-auto mb-3 opacity-50" size={28}/>No customers yet. Add your first customer.</div>:filtered.map(c=><div key={c.id} className="grid grid-cols-12 items-center gap-3 border-b border-slate-800/70 px-5 py-4 last:border-0"><div className="col-span-4 min-w-0"><p className="truncate font-semibold text-white">{c.full_name}</p><p className="truncate text-xs text-slate-500">{c.email||"No email"}</p></div><span className="col-span-3 text-sm text-slate-300">{c.phone||"—"}</span><span className="col-span-3 text-sm text-slate-300">{c.city||"—"}</span><span className="col-span-2 flex items-center justify-end gap-2 text-sm font-semibold text-emerald-300">{c.reward_points||0}<button onClick={()=>void openLedger(c)} className="rounded border border-slate-700 px-2 py-1 text-xs text-slate-200">Ledger</button></span></div>)}
  </div>
 </section>;
}
