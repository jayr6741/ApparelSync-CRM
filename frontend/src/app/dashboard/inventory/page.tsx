"use client";

import { FormEvent, useCallback, useEffect, useMemo, useState } from "react";
import { Plus, Search, RefreshCw, Shirt, Layers3 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { readSession } from "@/lib/auth";

type Category = { id: string; name: string };
type Warehouse = {id:string;name:string};
type Transfer = {id:string;transfer_number:string;from_warehouse:string;to_warehouse:string;total_units:number;created_at:string;status:string};
type Product = {
  id: string; name: string; sku: string; category: string | null;
  department: string; garment_type: string | null; brand: string | null;
  variant_count: number; min_selling_price: string | number; stock_quantity: number;
};
type ApiList<T> = { data: T[] };
type VariantOption = { id:string; product_name:string; sku:string; size:string; colour:string };
type StockRow = { variant_id:string; product_name:string; sku:string; size:string; colour:string; warehouse_name:string; on_hand:number; reserved:number; damaged:number; available:number };

export default function InventoryPage() {
  const [products,setProducts] = useState<Product[]>([]);
  const [stockRows,setStockRows] = useState<StockRow[]>([]);
  const [variantOptions,setVariantOptions] = useState<VariantOption[]>([]);
  const [categories,setCategories] = useState<Category[]>([]);
  const [warehouses,setWarehouses] = useState<Warehouse[]>([]);
  const [transfers,setTransfers] = useState<Transfer[]>([]);
  const [transferFrom,setTransferFrom] = useState("");
  const [transferTo,setTransferTo] = useState("");
  const [transferVariant,setTransferVariant] = useState("");
  const [transferQty,setTransferQty] = useState("1");
  const [transferNotes,setTransferNotes] = useState("");
  const [query,setQuery] = useState("");
  const [loading,setLoading] = useState(true);
  const [error,setError] = useState("");
  const [showForm,setShowForm] = useState(false);
  const [saving,setSaving] = useState(false);
  const [name,setName] = useState("");
  const [sku,setSku] = useState("");
  const [department,setDepartment] = useState("unisex");
  const [garmentType,setGarmentType] = useState("");
  const [brand,setBrand] = useState("");
  const [categoryId,setCategoryId] = useState("");
  const [size,setSize] = useState("M");
  const [colour,setColour] = useState("Black");
  const [variantSku,setVariantSku] = useState("");
  const [price,setPrice] = useState("");
  const [mrp,setMrp] = useState("");
  const [stock,setStock] = useState("0");
  const [adjustVariant,setAdjustVariant] = useState("");
  const [adjustQty,setAdjustQty] = useState("1");
  const [adjustReason,setAdjustReason] = useState("");

  const load = useCallback(async () => {
    const session = readSession();
    if (!session) return;
    setLoading(true); setError("");
    try {
      const [p,c,s,v,w,t] = await Promise.all([
        apiRequest<ApiList<Product>>("/products",{method:"GET"},session.token),
        apiRequest<ApiList<Category>>("/categories",{method:"GET"},session.token),
        apiRequest<ApiList<StockRow>>("/stock",{method:"GET"},session.token),
        apiRequest<ApiList<VariantOption>>("/variants",{method:"GET"},session.token),
        apiRequest<ApiList<Warehouse>>("/warehouses",{method:"GET"},session.token),
        apiRequest<ApiList<Transfer>>("/stock/transfers",{method:"GET"},session.token),
      ]);
      setProducts(p.data); setCategories(c.data); setStockRows(s.data); setVariantOptions(v.data); setWarehouses(w.data); setTransfers(t.data);
      if(!transferFrom&&w.data.length>0)setTransferFrom(w.data[0].id);
      if(!transferTo&&w.data.length>1)setTransferTo(w.data[1].id);
    } catch(e) { setError(e instanceof Error ? e.message : "Could not load inventory"); }
    finally { setLoading(false); }
  },[transferFrom,transferTo]);
  useEffect(()=>{ void load(); },[load]);

  async function adjustStock(event:FormEvent<HTMLFormElement>) {
    event.preventDefault(); const session=readSession(); if(!session)return;
    setSaving(true);setError("");
    try {
      await apiRequest("/stock/adjustments",{method:"POST",body:JSON.stringify({variantId:adjustVariant,quantityDelta:Number(adjustQty),reason:adjustReason,movementType:"adjustment"})},session.token);
      setAdjustVariant("");setAdjustQty("1");setAdjustReason("");await load();
    } catch(e) { setError(e instanceof Error?e.message:"Stock adjustment failed"); }
    finally { setSaving(false); }
  }

  async function submitTransfer(event:FormEvent<HTMLFormElement>){
    event.preventDefault();const session=readSession();if(!session)return;
    setSaving(true);setError("");
    try{
      await apiRequest("/stock/transfers",{method:"POST",body:JSON.stringify({fromWarehouseId:transferFrom,toWarehouseId:transferTo,notes:transferNotes,items:[{variantId:transferVariant,quantity:Number(transferQty)}]})},session.token);
      setTransferVariant("");setTransferQty("1");setTransferNotes("");await load();
    }catch(e){setError(e instanceof Error?e.message:"Warehouse transfer failed");}
    finally{setSaving(false);}
  }

  const filtered = useMemo(()=>products.filter(p =>
    [p.name,p.sku,p.brand ?? "",p.category ?? ""].join(" ").toLowerCase().includes(query.toLowerCase())
  ),[products,query]);

  async function submit(event:FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const session=readSession(); if(!session) return;
    setSaving(true); setError("");
    try {
      const created=await apiRequest<{data:{id:string}}>("/products",{
        method:"POST",
        body:JSON.stringify({name,sku,department,garmentType:garmentType||undefined,brand:brand||undefined,categoryId:categoryId||undefined}),
      },session.token);
      const cleanVariantSku=variantSku.trim() || sku.trim()+"-"+size.toUpperCase()+"-"+colour.toUpperCase().replace(/\s+/g,"");
      await apiRequest("/products/"+created.data.id+"/variants",{
        method:"POST",
        body:JSON.stringify({variants:[{size,colour,sku:cleanVariantSku,mrp:Number(mrp||price),sellingPrice:Number(price),costPrice:0,taxRate:0}]}),
      },session.token);
      setShowForm(false); setName(""); setSku(""); setGarmentType(""); setBrand(""); setVariantSku(""); setPrice(""); setMrp(""); setStock("0");
      await load();
    } catch(e) { setError(e instanceof Error ? e.message : "Could not save product"); }
    finally { setSaving(false); }
  }

  return <section className="space-y-6">
    <header className="flex flex-wrap items-center justify-between gap-3">
      <div><p className="text-xs font-semibold uppercase tracking-[0.2em] text-emerald-400">Product catalogue</p><h1 className="mt-2 text-3xl font-bold text-white">Garment Inventory</h1><p className="mt-1 text-sm text-slate-400">Manage products, sizes, colours, SKUs and selling prices.</p></div>
      <button onClick={()=>setShowForm(v=>!v)} className="inline-flex items-center gap-2 rounded-xl bg-emerald-400 px-4 py-3 font-semibold text-slate-950"><Plus size={18}/> Add product</button>
    </header>

    {error && <div role="alert" className="rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</div>}

    {showForm && <form onSubmit={submit} className="grid gap-4 rounded-2xl border border-slate-800 bg-[#111520] p-5 md:grid-cols-3">
      <h2 className="md:col-span-3 text-lg font-semibold text-white">New garment product</h2>
      <label className="text-sm text-slate-300">Product name<input required value={name} onChange={e=>setName(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Product SKU<input required value={sku} onChange={e=>setSku(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Department<select value={department} onChange={e=>setDepartment(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"><option value="unisex">Unisex</option><option value="men">Men</option><option value="women">Women</option><option value="kids">Kids</option></select></label>
      <label className="text-sm text-slate-300">Garment type<input value={garmentType} onChange={e=>setGarmentType(e.target.value)} placeholder="T-shirt, jeans, kurti..." className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Brand<input value={brand} onChange={e=>setBrand(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Category<select value={categoryId} onChange={e=>setCategoryId(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"><option value="">No category</option>{categories.map(c=><option key={c.id} value={c.id}>{c.name}</option>)}</select></label>
      <div className="md:col-span-3 border-t border-slate-800 pt-4"><p className="mb-3 flex items-center gap-2 font-semibold text-white"><Layers3 size={17}/> First size-colour variant</p></div>
      <label className="text-sm text-slate-300">Size<input required value={size} onChange={e=>setSize(e.target.value)} placeholder="S / M / L / 32 / 34" className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Colour<input required value={colour} onChange={e=>setColour(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Variant SKU (optional)<input value={variantSku} onChange={e=>setVariantSku(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Selling price (₹)<input type="number" min="0" step="0.01" required value={price} onChange={e=>setPrice(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">MRP (₹)<input type="number" min="0" step="0.01" value={mrp} onChange={e=>setMrp(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <div className="md:col-span-3 flex justify-end gap-2"><button type="button" onClick={()=>setShowForm(false)} className="rounded-lg border border-slate-700 px-4 py-2 text-slate-300">Cancel</button><button disabled={saving} className="rounded-lg bg-emerald-400 px-5 py-2 font-semibold text-slate-950 disabled:opacity-60">{saving?"Saving...":"Save product"}</button></div>
    </form>}

    <form onSubmit={submitTransfer} className="grid gap-3 rounded-2xl border border-slate-800 bg-[#111520] p-5 md:grid-cols-4">
      <div className="md:col-span-4"><h2 className="font-semibold text-white">Inter-warehouse stock transfer</h2><p className="text-xs text-slate-500">Transfer sellable stock between your active warehouses. Both stock movements are recorded atomically.</p></div>
      <label className="text-sm text-slate-300">From warehouse<select required value={transferFrom} onChange={e=>setTransferFrom(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"><option value="">Select source</option>{warehouses.map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label className="text-sm text-slate-300">To warehouse<select required value={transferTo} onChange={e=>setTransferTo(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"><option value="">Select destination</option>{warehouses.filter(w=>w.id!==transferFrom).map(w=><option key={w.id} value={w.id}>{w.name}</option>)}</select></label>
      <label className="text-sm text-slate-300">Variant<select required value={transferVariant} onChange={e=>setTransferVariant(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"><option value="">Select variant</option>{variantOptions.map(v=><option key={v.id} value={v.id}>{v.product_name} · {v.size}/{v.colour} · {v.sku}</option>)}</select></label>
      <label className="text-sm text-slate-300">Quantity<input type="number" min="1" step="1" required value={transferQty} onChange={e=>setTransferQty(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300 md:col-span-3">Notes (optional)<input value={transferNotes} onChange={e=>setTransferNotes(e.target.value)} placeholder="Reason / dispatch reference" className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <div className="flex items-end"><button disabled={saving||!transferFrom||!transferTo||transferFrom===transferTo||!transferVariant||warehouses.length<2} className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">Transfer stock</button></div>
    </form>
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]"><div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-white">Recent warehouse transfers</div>{transfers.length===0?<p className="p-5 text-sm text-slate-400">No warehouse transfers recorded.</p>:transfers.map(t=><div key={t.id} className="flex flex-wrap justify-between gap-3 border-b border-slate-800/70 px-5 py-3 text-sm last:border-0"><div><p className="font-semibold text-white">{t.transfer_number}</p><p className="text-xs text-slate-500">{t.from_warehouse} → {t.to_warehouse}</p></div><div className="text-right"><p className="text-emerald-300">{t.total_units} units</p><p className="text-xs text-slate-500">{new Date(t.created_at).toLocaleDateString("en-IN")}</p></div></div>)}</div>

    <form onSubmit={adjustStock} className="grid gap-3 rounded-2xl border border-slate-800 bg-[#111520] p-5 md:grid-cols-4">
      <div className="md:col-span-4"><h2 className="font-semibold text-white">Stock adjustment / opening balance</h2><p className="text-xs text-slate-500">Adjustments are recorded in the stock movement ledger.</p></div>
      <label className="text-sm text-slate-300">Variant<select required value={adjustVariant} onChange={e=>setAdjustVariant(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"><option value="">Select variant</option>{variantOptions.map(v=><option key={v.id} value={v.id}>{v.product_name} · {v.size}/{v.colour} · {v.sku}</option>)}</select></label>
      <label className="text-sm text-slate-300">Quantity change (+/-)<input type="number" step="1" required value={adjustQty} onChange={e=>setAdjustQty(e.target.value)} className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <label className="text-sm text-slate-300">Reason<input required minLength={3} value={adjustReason} onChange={e=>setAdjustReason(e.target.value)} placeholder="Opening count / correction / damage" className="mt-2 w-full rounded-lg border border-slate-700 bg-[#0a0d14] p-3 text-white"/></label>
      <div className="flex items-end"><button disabled={saving||!adjustVariant} className="w-full rounded-lg bg-emerald-400 px-4 py-3 font-semibold text-slate-950 disabled:opacity-50">Save adjustment</button></div>
    </form>
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]"><div className="border-b border-slate-800 px-5 py-3 text-sm font-semibold text-white">Stock by size and colour</div>{stockRows.length===0?<p className="p-5 text-sm text-slate-400">No stock recorded. Receive a purchase or enter an opening stock adjustment.</p>:stockRows.map((v,i)=><div key={v.variant_id+i} className="grid grid-cols-12 gap-2 border-b border-slate-800/70 px-5 py-3 text-sm last:border-0"><span className="col-span-5 text-white">{v.product_name} · {v.size}/{v.colour}</span><span className="col-span-2 text-slate-400">{v.sku}</span><span className="col-span-2 text-slate-400">{v.warehouse_name}</span><span className="col-span-1 text-right text-white">{v.on_hand}</span><span className="col-span-2 text-right font-semibold text-emerald-300">{v.available} avail.</span></div>)}</div>

    <div className="flex flex-wrap items-center gap-3"><div className="relative min-w-[240px] flex-1"><Search className="absolute left-3 top-3.5 text-slate-500" size={17}/><input value={query} onChange={e=>setQuery(e.target.value)} placeholder="Search product, SKU, brand..." className="w-full rounded-xl border border-slate-800 bg-[#111520] py-3 pl-10 pr-4 text-sm text-white"/></div><button onClick={()=>void load()} className="rounded-xl border border-slate-700 p-3 text-slate-300" aria-label="Refresh inventory"><RefreshCw size={17}/></button></div>
    <div className="overflow-hidden rounded-2xl border border-slate-800 bg-[#111520]">
      <div className="grid grid-cols-12 gap-3 border-b border-slate-800 px-5 py-3 text-xs font-semibold uppercase tracking-wide text-slate-500"><span className="col-span-4">Product</span><span className="col-span-2">SKU</span><span className="col-span-2">Department</span><span className="col-span-2">Variants</span><span className="col-span-2 text-right">Price</span></div>
      {loading ? <p className="p-6 text-sm text-slate-400">Loading inventory...</p> : filtered.length===0 ? <div className="p-10 text-center text-slate-400"><Shirt className="mx-auto mb-3 opacity-50" size={28}/><p>No products found. Add your first garment product.</p></div> : filtered.map(p=><div key={p.id} className="grid grid-cols-12 items-center gap-3 border-b border-slate-800/70 px-5 py-4 last:border-0"><div className="col-span-4 min-w-0"><p className="truncate font-semibold text-white">{p.name}</p><p className="truncate text-xs text-slate-500">{p.brand||p.garment_type||p.category||"Garment"}</p></div><span className="col-span-2 truncate text-sm text-slate-300">{p.sku}</span><span className="col-span-2 text-sm capitalize text-slate-300">{p.department}</span><span className="col-span-2 text-sm text-slate-300">{p.variant_count}</span><span className="col-span-2 text-right text-sm font-semibold text-emerald-300">₹{Number(p.min_selling_price||0).toFixed(2)}</span></div>)}
    </div>
  </section>;
}
