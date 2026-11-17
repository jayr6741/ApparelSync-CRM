"use client";

import { useCallback,useEffect,useMemo,useState } from "react";
import { Search,ShoppingCart,Trash2,Receipt,CheckCircle2,Plus,Wallet,Printer } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";

type Variant={id:string;sku:string;size:string;colour:string;selling_price:string|number;tax_rate:string|number;available_stock:number;product_name:string;barcode:string|null};
type List<T>={data:T[]};
type PaymentMethod="cash"|"upi"|"card"|"bank_transfer"|"wallet"|"gift_card"|"other";
type Tender={method:PaymentMethod;amount:string;referenceNumber:string};
type CartLine={variant:Variant;quantity:number};
type SaleResult={data:{id:string;invoice_number:string;total:string|number;status:string}};
const methods:{value:PaymentMethod;label:string}[]=[{value:"cash",label:"Cash"},{value:"upi",label:"UPI"},{value:"card",label:"Card"},{value:"bank_transfer",label:"Bank transfer"},{value:"wallet",label:"Wallet"},{value:"gift_card",label:"Gift card"},{value:"other",label:"Other"}];
const emptyTender=():Tender=>({method:"cash",amount:"",referenceNumber:""});

export default function PosPage(){
 const [variants,setVariants]=useState<Variant[]>([]);
 const [cart,setCart]=useState<CartLine[]>([]);
 const [query,setQuery]=useState("");
 const [loading,setLoading]=useState(true);
 const [checkout,setCheckout]=useState(false);
 const [error,setError]=useState("");
 const [receipt,setReceipt]=useState<SaleResult["data"]|null>(null);
 const [tenders,setTenders]=useState<Tender[]>([emptyTender()]);
 const load=useCallback(async()=>{const s=readSession();if(!s)return;setLoading(true);try{const r=await apiRequest<List<Variant>>("/variants",{method:"GET"},s.token);setVariants(r.data);}catch(e){setError(e instanceof Error?e.message:"Unable to load sellable variants");}finally{setLoading(false);}},[]);
 useEffect(()=>{void load();},[load]);
 const shown=useMemo(()=>variants.filter(v=>[v.product_name,v.sku,v.barcode??"",v.size,v.colour].join(" ").toLowerCase().includes(query.toLowerCase())),[variants,query]);
 const subtotal=cart.reduce((n,l)=>n+Number(l.variant.selling_price)*l.quantity,0);
 const tax=cart.reduce((n,l)=>n+Number(l.variant.selling_price)*l.quantity*Number(l.variant.tax_rate)/100,0);
 const total=Number((subtotal+tax).toFixed(2));
 const tenderTotal=Number(tenders.reduce((n,t)=>n+(Number(t.amount)||0),0).toFixed(2));
 const difference=Number((total-tenderTotal).toFixed(2));
 function add(v:Variant){setError("");setCart(old=>{const found=old.find(x=>x.variant.id===v.id);if(found)return old.map(x=>x.variant.id===v.id?{...x,quantity:Math.min(x.quantity+1,v.available_stock)}:x);return [...old,{variant:v,quantity:1}];});}
 function change(id:string,qty:number){setCart(old=>old.map(x=>x.variant.id===id?{...x,quantity:Math.max(1,Math.min(qty,x.variant.available_stock))}:x));}
 function updateTender(index:number,patch:Partial<Tender>){setTenders(old=>old.map((t,i)=>i===index?{...t,...patch}:t));}
 function addTender(){if(tenders.length<10)setTenders(old=>[...old,emptyTender()]);}
 function removeTender(index:number){setTenders(old=>old.filter((_,i)=>i!==index));}
 async function pay(){
  const s=readSession();if(!s||!cart.length)return;
  const normalized=tenders.map(t=>({...t,amount:Number(t.amount||(tenders.length===1?total.toFixed(2):""))}));
  if(normalized.some(t=>!Number.isFinite(t.amount)||t.amount<=0)){setError("Har payment method ka valid amount enter karein.");return;}
  if(Math.abs(normalized.reduce((n,t)=>n+t.amount,0)-total)>0.01){setError("Payment amounts ka total bill total ke barabar hona chahiye.");return;}
  setCheckout(true);setError("");
  try{
   const r=await apiRequest<SaleResult>("/sales/checkout",{method:"POST",body:JSON.stringify({idempotencyKey:crypto.randomUUID(),items:cart.map(x=>({variantId:x.variant.id,quantity:x.quantity})),payments:normalized.map(t=>({method:t.method,amount:t.amount,referenceNumber:t.referenceNumber.trim()||undefined}))})},s.token);
   setReceipt(r.data);setCart([]);setTenders([emptyTender()]);await load();
  }catch(e){setError(e instanceof Error?e.message:"Checkout failed");}finally{setCheckout(false);}
 }
 function printReceipt(){if(!receipt)return;const w=window.open("","_blank","width=420,height=650");if(!w){setError("Receipt print window blocked. Browser pop-ups allow karein.");return;}w.document.write(`<!doctype html><html><head><title>${receipt.invoice_number}</title><style>body{font:14px Arial;padding:24px;color:#111}h1{font-size:20px}hr{border:0;border-top:1px dashed #777;margin:18px 0}.total{font-size:20px;font-weight:bold}</style></head><body><h1>GARMENTOS</h1><p>Sales receipt</p><hr><p>Invoice: ${receipt.invoice_number}</p><p>Status: ${receipt.status}</p><hr><p class="total">Total: ₹${Number(receipt.total).toFixed(2)}</p><hr><p>Thank you for shopping!</p><script>window.onload=()=>window.print()<\/script></body></html>`);w.document.close();}
 return <section className="space-y-6">
  <header><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Point of sale</p><h1 className="mt-2 text-3xl font-bold text-white">POS Billing</h1><p className="mt-1 text-sm text-slate-400">Search garment variants, build a cart and accept cash, UPI, card or split payments.</p></header>
  {error&&<p role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
  {receipt&&<div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-emerald-500/30 bg-emerald-500/10 p-4"><div className="flex items-center gap-3 text-emerald-300"><CheckCircle2/><div><p className="font-semibold">Sale completed</p><p className="text-xs">{receipt.invoice_number} · ₹{Number(receipt.total).toFixed(2)}</p></div></div><div className="flex gap-3"><button onClick={printReceipt} className="flex items-center gap-2 text-sm text-emerald-200 underline"><Printer size={15}/>Print receipt</button><button onClick={()=>setReceipt(null)} className="text-sm text-emerald-200 underline">Dismiss</button></div></div>}
  <div className="grid gap-5 xl:grid-cols-[1.4fr_1fr]">
   <div className="space-y-4"><div className="relative"><Search className="absolute left-3 top-3.5 text-slate-500" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search product, SKU, barcode, size or colour..." className="w-full rounded-xl border border-slate-800 bg-[#111520] py-3 pl-10 pr-4 text-sm text-white"/></div>
    <div className="grid gap-3 sm:grid-cols-2">{loading?<p className="text-sm text-slate-400">Loading products...</p>:shown.map(v=><button key={v.id} disabled={v.available_stock<=0} onClick={()=>add(v)} className="rounded-xl border border-slate-800 bg-[#111520] p-4 text-left transition hover:border-emerald-500/60 disabled:opacity-40"><p className="font-semibold text-white">{v.product_name}</p><p className="mt-1 text-xs text-slate-400">{v.size} / {v.colour} · {v.sku}</p><div className="mt-3 flex items-center justify-between"><span className="font-bold text-emerald-300">₹{Number(v.selling_price).toFixed(2)}</span><span className="text-xs text-slate-500">Stock: {v.available_stock}</span></div></button>)}</div>
   </div>
   <aside className="rounded-2xl border border-slate-800 bg-[#111520] p-5"><h2 className="flex items-center gap-2 text-lg font-semibold text-white"><ShoppingCart size={19}/> Current sale</h2>
    {cart.length===0?<p className="py-10 text-center text-sm text-slate-500">Select a size-colour variant to add it to the bill.</p>:<div className="mt-4 space-y-3">{cart.map(l=><div key={l.variant.id} className="border-b border-slate-800 pb-3"><div className="flex justify-between gap-2"><div><p className="text-sm font-medium text-white">{l.variant.product_name}</p><p className="text-xs text-slate-500">{l.variant.size} / {l.variant.colour}</p></div><button onClick={()=>setCart(old=>old.filter(x=>x.variant.id!==l.variant.id))} aria-label="Remove item" className="text-rose-400"><Trash2 size={16}/></button></div><div className="mt-2 flex items-center justify-between"><div className="flex items-center gap-2"><button onClick={()=>change(l.variant.id,l.quantity-1)} className="rounded border border-slate-700 px-2 text-white">−</button><span className="w-5 text-center text-sm text-white">{l.quantity}</span><button onClick={()=>change(l.variant.id,l.quantity+1)} disabled={l.quantity>=l.variant.available_stock} className="rounded border border-slate-700 px-2 text-white disabled:opacity-40">+</button></div><span className="text-sm text-slate-200">₹{(Number(l.variant.selling_price)*l.quantity).toFixed(2)}</span></div></div>)}</div>}
    <div className="mt-5 space-y-2 border-t border-slate-800 pt-4 text-sm"><div className="flex justify-between text-slate-400"><span>Subtotal</span><span>₹{subtotal.toFixed(2)}</span></div><div className="flex justify-between text-slate-400"><span>GST (variant rates)</span><span>₹{tax.toFixed(2)}</span></div><div className="flex justify-between text-lg font-bold text-white"><span>Total</span><span>₹{total.toFixed(2)}</span></div></div>
    <div className="mt-5 space-y-3 border-t border-slate-800 pt-4"><div className="flex items-center justify-between"><h3 className="flex items-center gap-2 font-semibold text-white"><Wallet size={17}/> Payment collection</h3><button onClick={addTender} disabled={tenders.length>=10||!cart.length} className="flex items-center gap-1 text-xs font-semibold text-emerald-300 disabled:opacity-40"><Plus size={15}/>Add method</button></div>
     {tenders.map((t,i)=><div key={i} className="rounded-xl border border-slate-800 p-3 space-y-2"><div className="flex items-center justify-between gap-2"><label className="text-xs text-slate-400">Payment {i+1}</label>{tenders.length>1&&<button onClick={()=>removeTender(i)} className="text-xs text-rose-400">Remove</button>}</div><select value={t.method} onChange={e=>updateTender(i,{method:e.target.value as PaymentMethod})} className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-2.5 text-sm text-white">{methods.map(m=><option key={m.value} value={m.value}>{m.label}</option>)}</select><input type="number" min="0.01" step="0.01" value={t.amount||(tenders.length===1?total.toFixed(2):"")} onChange={e=>updateTender(i,{amount:e.target.value})} placeholder="Enter amount" className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-2.5 text-sm text-white"/><input value={t.referenceNumber} onChange={e=>updateTender(i,{referenceNumber:e.target.value})} placeholder="Transaction/reference number (optional)" className="w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-2.5 text-sm text-white"/></div>)}
     <div className="flex justify-between text-sm"><span className="text-slate-400">Collected</span><span className="text-white">₹{tenderTotal.toFixed(2)}</span></div><div className="flex justify-between text-sm"><span className="text-slate-400">{difference>0?"Remaining":difference<0?"Excess":"Balance"}</span><span className={difference===0?"text-emerald-300":"text-amber-300"}>₹{Math.abs(difference).toFixed(2)}</span></div>
    </div>
    <button onClick={()=>void pay()} disabled={!cart.length||checkout||total<=0||Math.abs(difference)>0.01||tenders.some(t=>Number(t.amount||(tenders.length===1?total.toFixed(2):""))<=0)} className="mt-5 flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 p-3 font-bold text-slate-950 disabled:opacity-40"><Receipt size={18}/>{checkout?"Processing...":`Complete sale · ₹${total.toFixed(2)}`}</button><p className="mt-3 text-xs text-slate-500">Payment methods are recorded as separate ledger entries. UPI/card provider settlement is not automatically processed; enter the transaction reference after receiving payment.</p>
   </aside>
  </div>
 </section>;
}
