"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, LogIn } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function LoginForm({ next }: { next?: string }) {
  const router = useRouter();
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError(null);

    const { error: authError } = await authClient.signIn.email({
      email,
      password,
    });

    if (authError) {
      setError("Não foi possível entrar. Confira o e-mail e a senha.");
      setPending(false);
      return;
    }

    const safeNext =
      next && next.startsWith("/") && !next.startsWith("//")
        ? next
        : "/dashboard";

    router.push(safeNext);
    router.refresh();
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
          Bem-vindo de volta
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Entrar na sua conta
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Seus dados financeiros, organizados e protegidos.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Field label="E-mail" htmlFor="email">
          <Input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="voce@exemplo.com"
            value={email}
            onChange={(event) => setEmail(event.target.value)}
            required
          />
        </Field>

        <Field label="Senha" htmlFor="password">
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              placeholder="Sua senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              className="pr-10"
            />
            <button
              type="button"
              onClick={() => setShowPassword((value) => !value)}
              className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-slate-500 hover:text-slate-700"
              aria-label={showPassword ? "Ocultar senha" : "Mostrar senha"}
            >
              {showPassword ? (
                <EyeOff className="h-4 w-4" />
              ) : (
                <Eye className="h-4 w-4" />
              )}
            </button>
          </div>
        </Field>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <LogIn className="h-4 w-4" />
          )}
          {pending ? "Entrando..." : "Entrar"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">
        Ainda não tem conta?{" "}
        <Link
          href="/cadastro"
          className="font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Criar conta
        </Link>
      </p>
    </div>
  );
}
