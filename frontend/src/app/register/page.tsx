"use client";

import { FormEvent, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Shirt, Loader2 } from "lucide-react";
import { apiRequest } from "@/lib/api";
import { AuthSession, saveSession } from "@/lib/auth";

export default function RegisterPage() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [shopName, setShopName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    if (password.length < 10) { setError("Password must be at least 10 characters."); return; }
    setLoading(true);
    try {
      const session = await apiRequest<AuthSession>("/auth/register", {
        method: "POST",
        body: JSON.stringify({ fullName: fullName.trim(), shopName: shopName.trim(), email: email.trim(), password }),
      });
      saveSession(session);
      router.replace("/dashboard");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Unable to create account. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  return <main className="min-h-screen bg-[#0a0d14] text-slate-100 flex items-center justify-center p-5">
    <section className="w-full max-w-lg rounded-3xl border border-slate-800 bg-[#111520] p-8 shadow-2xl">
      <div className="mb-7 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-emerald-400 text-slate-950"><Shirt /></div>
        <h1 className="text-2xl font-bold">Create your GARMENTOS account</h1>
        <p className="mt-2 text-sm text-slate-400">Set up your shop workspace</p>
      </div>
      {error && <p role="alert" className="mb-4 rounded-xl border border-rose-500/30 bg-rose-500/10 p-3 text-sm text-rose-300">{error}</p>}
      <form onSubmit={submit} className="space-y-4">
        <label className="block text-sm text-slate-300">Your full name
          <input required minLength={2} value={fullName} onChange={e=>setFullName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1019] p-3 text-white outline-none focus:border-emerald-400" placeholder="Full name" />
        </label>
        <label className="block text-sm text-slate-300">Shop / business name
          <input required minLength={2} value={shopName} onChange={e=>setShopName(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1019] p-3 text-white outline-none focus:border-emerald-400" placeholder="Your garment store" />
        </label>
        <label className="block text-sm text-slate-300">Email
          <input type="email" autoComplete="email" required value={email} onChange={e=>setEmail(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1019] p-3 text-white outline-none focus:border-emerald-400" placeholder="you@business.com" />
        </label>
        <label className="block text-sm text-slate-300">Password (minimum 10 characters)
          <input type="password" autoComplete="new-password" minLength={10} required value={password} onChange={e=>setPassword(e.target.value)} className="mt-2 w-full rounded-xl border border-slate-700 bg-[#0b1019] p-3 text-white outline-none focus:border-emerald-400" placeholder="Create a strong password" />
        </label>
        <button disabled={loading} className="flex w-full items-center justify-center gap-2 rounded-xl bg-emerald-400 p-3 font-bold text-slate-950 disabled:opacity-60">
          {loading && <Loader2 className="h-4 w-4 animate-spin" />} {loading ? "Creating account..." : "Create account"}
        </button>
      </form>
      <p className="mt-6 text-center text-sm text-slate-400">Already registered? <Link className="font-semibold text-emerald-300" href="/login">Sign in</Link></p>
    </section>
  </main>;
}
