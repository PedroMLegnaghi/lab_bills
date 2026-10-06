"use client";

import Link from "next/link";
import { useActionState } from "react";
import { signIn, signUp } from "@/app/actions";
import { FormError, SubmitButton } from "./form-bits";

export function SignInForm() {
  const [state, action] = useActionState(signIn, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="name">Nome</label>
        <input id="name" name="name" className="field" autoComplete="username" required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="field" autoComplete="current-password" required />
      </div>
      <FormError message={state?.error} />
      <SubmitButton pending="Entrando…">Entrar</SubmitButton>
      <p className="text-center text-sm text-muted">
        Primeira vez? <Link href="/cadastro" className="font-medium text-accent">Criar conta</Link>
      </p>
    </form>
  );
}

export function SignUpForm() {
  const [state, action] = useActionState(signUp, undefined);
  return (
    <form action={action} className="space-y-4">
      <div>
        <label className="label" htmlFor="code">Código do laboratório</label>
        <input id="code" name="code" className="field" autoComplete="off" required />
        <p className="mt-1 text-xs text-muted">Peça para alguém do lab.</p>
      </div>
      <div>
        <label className="label" htmlFor="name">Seu nome</label>
        <input id="name" name="name" className="field" autoComplete="username" minLength={2} maxLength={40} required />
      </div>
      <div>
        <label className="label" htmlFor="password">Senha</label>
        <input id="password" name="password" type="password" className="field" autoComplete="new-password" minLength={6} required />
      </div>
      <div>
        <label className="label" htmlFor="pixKey">Chave Pix (opcional)</label>
        <input id="pixKey" name="pixKey" className="field" autoComplete="off" maxLength={77} placeholder="CPF, e-mail, telefone ou aleatória" />
        <p className="mt-1 text-xs text-muted">
          Aparece para quem for contribuir nas suas compras. Visível só para membros do lab.
        </p>
      </div>
      <FormError message={state?.error} />
      <SubmitButton pending="Criando…">Criar conta</SubmitButton>
      <p className="text-center text-sm text-muted">
        Já tem conta? <Link href="/entrar" className="font-medium text-accent">Entrar</Link>
      </p>
    </form>
  );
}
