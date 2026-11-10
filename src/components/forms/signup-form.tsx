"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Loader2, UserPlus } from "lucide-react";
import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { Input } from "@/components/ui/input";
import { Alert } from "@/components/ui/alert";

export function SignUpForm() {
  const router = useRouter();
  const [name, setName] = React.useState("");
  const [email, setEmail] = React.useState("");
  const [password, setPassword] = React.useState("");
  const [confirmPassword, setConfirmPassword] = React.useState("");
  const [showPassword, setShowPassword] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [pending, setPending] = React.useState(false);

  async function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);

    if (password.length < 8) {
      setError("A senha deve ter pelo menos 8 caracteres.");
      return;
    }

    if (password !== confirmPassword) {
      setError("As senhas não conferem.");
      return;
    }

    setPending(true);

    const { error: authError } = await authClient.signUp.email({
      name,
      email,
      password,
    });

    if (authError) {
      setError(
        "Não foi possível criar a conta. Verifique se o e-mail já está em uso.",
      );
      setPending(false);
      return;
    }

    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div>
      <div className="mb-7">
        <p className="text-xs font-medium uppercase tracking-[0.16em] text-emerald-700">
          Comece agora
        </p>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight text-slate-900">
          Criar sua conta
        </h1>
        <p className="mt-1 text-sm text-slate-500">
          Um espaço só seu para organizar a vida financeira.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        {error ? <Alert tone="error">{error}</Alert> : null}

        <Field label="Nome" htmlFor="name">
          <Input
            id="name"
            type="text"
            autoComplete="name"
            placeholder="Seu nome"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
          />
        </Field>

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

        <Field
          label="Senha"
          htmlFor="password"
          hint="Mínimo de 8 caracteres."
        >
          <div className="relative">
            <Input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="Crie uma senha"
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              required
              minLength={8}
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

        <Field label="Confirmar senha" htmlFor="confirmPassword">
          <Input
            id="confirmPassword"
            type={showPassword ? "text" : "password"}
            autoComplete="new-password"
            placeholder="Repita a senha"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            required
            minLength={8}
          />
        </Field>

        <Button type="submit" className="w-full" disabled={pending}>
          {pending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <UserPlus className="h-4 w-4" />
          )}
          {pending ? "Criando conta..." : "Criar conta"}
        </Button>
      </form>

      <p className="mt-6 text-center text-xs text-slate-600">
        Já tem uma conta?{" "}
        <Link
          href="/login"
          className="font-semibold text-emerald-700 hover:text-emerald-800"
        >
          Entrar
        </Link>
      </p>
    </div>
  );
}
