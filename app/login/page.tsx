"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || "Authentication failed");
      }

      router.push(data.redirectUrl || "/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Failed to sign in");
    } finally {
      setLoading(false);
    }
  };

  const populateDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword("GyrexDemo2026!");
    setError(null);
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-zinc-950 px-4 py-12 text-zinc-100">
      <div className="w-full max-w-md space-y-8 rounded-2xl border border-zinc-800 bg-zinc-900/80 p-8 shadow-2xl backdrop-blur-xl">
        <div className="text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 font-bold text-xl">
            G
          </div>
          <h2 className="mt-4 text-2xl font-bold tracking-tight text-white">Gyrex Labs</h2>
          <p className="mt-1 text-sm text-zinc-400">Diagnostic Commerce & Patient Platform</p>
        </div>

        {error && (
          <div className="rounded-lg border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-400">
            {error}
          </div>
        )}

        <form onSubmit={handleLogin} className="mt-6 space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Email Address
            </label>
            <input
              type="email"
              required
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@example.com"
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-zinc-400">
              Password
            </label>
            <input
              type="password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="••••••••••••"
              className="mt-1 block w-full rounded-lg border border-zinc-800 bg-zinc-950 px-3.5 py-2.5 text-sm text-white placeholder-zinc-500 transition focus:border-sky-500 focus:outline-none focus:ring-1 focus:ring-sky-500"
            />
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full rounded-lg bg-sky-500 px-4 py-2.5 text-sm font-semibold text-white shadow-lg shadow-sky-500/25 transition hover:bg-sky-400 focus:outline-none focus:ring-2 focus:ring-sky-500 disabled:opacity-50"
          >
            {loading ? "Authenticating..." : "Sign In to Platform"}
          </button>
        </form>

        <div className="border-t border-zinc-800/80 pt-6">
          <p className="text-xs font-medium text-zinc-400 text-center mb-3">Quick Demo Credentials:</p>
          <div className="grid grid-cols-2 gap-2 text-xs">
            <button
              type="button"
              onClick={() => populateDemo("admin@gyrex.in")}
              className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-300 hover:border-sky-500/50 hover:text-white"
            >
              Superadmin
            </button>
            <button
              type="button"
              onClick={() => populateDemo("dr.sharma@sharmadiagnostics.com")}
              className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-300 hover:border-sky-500/50 hover:text-white"
            >
              Lab Owner
            </button>
            <button
              type="button"
              onClick={() => populateDemo("staff@sharmadiagnostics.com")}
              className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-300 hover:border-sky-500/50 hover:text-white"
            >
              Lab Staff
            </button>
            <button
              type="button"
              onClick={() => populateDemo("director@apexlabs.in")}
              className="rounded border border-zinc-800 bg-zinc-950 px-2.5 py-1.5 text-zinc-300 hover:border-sky-500/50 hover:text-white"
            >
              Apex Lab Owner
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
