"use client";
import Link from "next/link";
import { ScanBarcode } from "lucide-react";
export default function ScannerPage(){return <section className="mx-auto max-w-2xl space-y-5 rounded-2xl border border-slate-800 bg-[#111520] p-8 text-center"><ScanBarcode className="mx-auto text-emerald-400" size={42}/><h1 className="text-2xl font-bold text-white">Barcode sales</h1><p className="text-sm leading-6 text-slate-400">Sales and inventory are now managed through the PostgreSQL-backed GARMENTOS API. Open the POS workspace to add items to a bill and complete checkout.</p><Link href="/dashboard/pos" className="inline-flex rounded-xl bg-emerald-400 px-5 py-3 font-semibold text-slate-950">Open POS</Link></section>}
