"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { apiLogin } from "@/lib/api";

export default function LoginPage() {
  const router = useRouter();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      await apiLogin(username, password);
      router.replace("/");
      router.refresh();
    } catch {
      setError("Invalid username or password.");
      setSubmitting(false);
    }
  }

  return (
    <main className="flex min-h-dvh items-center justify-center px-4">
      <form onSubmit={handleSubmit} className="card flex w-full max-w-sm flex-col gap-4 p-6">
        <h1 className="pb-2 text-center text-xl font-semibold tracking-tight">Starter</h1>
        <label className="flex flex-col gap-1.5">
          <span className="label">Username</span>
          <input id="username" value={username} onChange={(e) => setUsername(e.target.value)} autoComplete="username" autoFocus className="field" />
        </label>
        <label className="flex flex-col gap-1.5">
          <span className="label">Password</span>
          <input id="password" type="password" value={password} onChange={(e) => setPassword(e.target.value)} autoComplete="current-password" className="field" />
        </label>
        {error && <p className="text-sm text-red-600">{error}</p>}
        <button type="submit" disabled={submitting || !username || !password} className="btn-primary">
          {submitting ? "Signing in…" : "Sign in"}
        </button>
      </form>
    </main>
  );
}
