"use client";

import { FormEvent,useCallback,useEffect,useMemo,useState } from "react";
import { Plus,Search,Users,RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";

type Customer={id:string;full_name:string;email:string|null;phone:string|null;city:string|null;reward_points:number;tier:string};
type List={data:Customer[]};

export default function CustomersPage(){
 const [rows,setRows]=useState<Customer[]>([]),[query,setQuery]=useState(""),[loading,setLoading]=useState(true),[saving,setSaving]=useState(false),[show,setShow]=useState(false),[error,setError]=useState("");
 const [fullName,setFullName]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[city,setCity]=useState("");
 const load=useCallback(async()=>{const s=readSession();if(!s)return;setLoading(true);try{const r=await apiRequest<List>("/customers",{method:"GET"},s.token);setRows(r.data);}catch(e){setError(e instanceof Error?e.message:"Unable to load customers");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const filtered=useMemo(()=>rows.filter(c=>[c.full_name,c.phone??"",c.email??"",c.city??""].join(" ").toLowerCase().includes(query.toLowerCase())),[rows,query]);
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
  <div className="relative"><Search className="absolute left-3 top-3.5 text-slate-500" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search name, phone, email or city..." className="w-full rounded-xl border border-slate-800 bg-[#111520] py-3 pl-10 pr-4 text-sm text-white"/></div>
  <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]"><div className="grid grid-cols-12 gap-3 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase text-slate-500"><span className="col-span-4">Customer</span><span className="col-span-3">Phone</span><span className="col-span-3">City</span><span className="col-span-2 text-right">Points</span></div>
   {loading?<p className="p-6 text-sm text-slate-400">Loading customers...</p>:filtered.length===0?<div className="p-10 text-center text-slate-400"><Users className="mx-auto mb-3 opacity-50" size={28}/>No customers yet. Add your first customer.</div>:filtered.map(c=><div key={c.id} className="grid grid-cols-12 items-center gap-3 border-b border-slate-800/70 px-5 py-4 last:border-0"><div className="col-span-4 min-w-0"><p className="truncate font-semibold text-white">{c.full_name}</p><p className="truncate text-xs text-slate-500">{c.email||"No email"}</p></div><span className="col-span-3 text-sm text-slate-300">{c.phone||"—"}</span><span className="col-span-3 text-sm text-slate-300">{c.city||"—"}</span><span className="col-span-2 text-right text-sm font-semibold text-emerald-300">{c.reward_points||0}</span></div>)}
  </div>
 </section>;
}
