"use client";

import { FormEvent,useCallback,useEffect,useState } from "react";
import { Plus,Store,RefreshCw } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";

type Supplier={id:string;name:string;contact_person:string|null;phone:string|null;email:string|null;gstin:string|null;city:string|null;is_active:boolean};
type List={data:Supplier[]};
export default function SuppliersPage(){
 const [rows,setRows]=useState<Supplier[]>([]),[loading,setLoading]=useState(true),[show,setShow]=useState(false),[saving,setSaving]=useState(false),[error,setError]=useState("");
 const [name,setName]=useState(""),[contactPerson,setContactPerson]=useState(""),[phone,setPhone]=useState(""),[email,setEmail]=useState(""),[gstin,setGstin]=useState(""),[city,setCity]=useState("");
 const load=useCallback(async()=>{const s=readSession();if(!s)return;setLoading(true);try{const r=await apiRequest<List>("/suppliers",{method:"GET"},s.token);setRows(r.data);}catch(e){setError(e instanceof Error?e.message:"Unable to load suppliers");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 async function submit(e:FormEvent){e.preventDefault();const s=readSession();if(!s)return;setSaving(true);setError("");try{await apiRequest("/suppliers",{method:"POST",body:JSON.stringify({name,contactPerson,phone,email,gstin,city})},s.token);setName("");setContactPerson("");setPhone("");setEmail("");setGstin("");setCity("");setShow(false);await load();}catch(err){setError(err instanceof Error?err.message:"Unable to save supplier");}finally{setSaving(false);}}
 return <section className="space-y-6"><header className="flex flex-wrap items-center justify-between gap-3"><div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Procurement</p><h1 className="mt-2 text-3xl font-bold text-white">Suppliers</h1><p className="mt-1 text-sm text-slate-400">Manage garment wholesalers, manufacturers and distributors.</p></div><button onClick={()=>setShow(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"><Plus size={18}/> Add supplier</button></header>
 {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
 {show&&<form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-800 bg-[#111520] p-5 md:grid-cols-2"><h2 className="md:col-span-2 font-semibold text-white">New supplier</h2>
 {[[name,setName,"Supplier / company name"],[contactPerson,setContactPerson,"Contact person"],[phone,setPhone,"Phone"],[email,setEmail,"Email"],[gstin,setGstin,"GSTIN"],[city,setCity,"City"]].map(([v,set,l]:any)=><label key={l} className="text-sm text-slate-300">{l}<input required={l==="Supplier / company name"} type={l==="Email"?"email":"text"} value={v} onChange={e=>set(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>)}
 <div className="md:col-span-2 flex justify-end gap-2"><button type="button" onClick={()=>setShow(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300">Cancel</button><button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-2 font-semibold text-slate-950">{saving?"Saving...":"Save supplier"}</button></div></form>}
 <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]"><div className="grid grid-cols-12 gap-3 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase text-slate-500"><span className="col-span-4">Supplier</span><span className="col-span-3">Contact</span><span className="col-span-3">GSTIN</span><span className="col-span-2">City</span></div>{loading?<p className="p-6 text-sm text-slate-400">Loading suppliers...</p>:rows.length===0?<div className="p-10 text-center text-slate-400"><Store className="mx-auto mb-3 opacity-50" size={28}/>No suppliers yet.</div>:rows.map(s=><div key={s.id} className="grid grid-cols-12 items-center gap-3 border-b border-slate-800/70 px-5 py-4 last:border-0"><div className="col-span-4 min-w-0"><p className="truncate font-semibold text-white">{s.name}</p><p className="truncate text-xs text-slate-500">{s.email||"No email"}</p></div><span className="col-span-3 text-sm text-slate-300">{s.phone||s.contact_person||"—"}</span><span className="col-span-3 text-sm text-slate-300">{s.gstin||"—"}</span><span className="col-span-2 text-sm text-slate-300">{s.city||"—"}</span></div>)}</div>
 <button onClick={()=>void load()} className="inline-flex items-center gap-2 text-sm text-slate-400"><RefreshCw size={15}/> Refresh</button>
 </section>;
}
