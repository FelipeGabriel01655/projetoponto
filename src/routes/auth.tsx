import { useState } from "react";
import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  ssr: false,
  head: () => ({
    meta: [
      { title: "Entrar | Corre.ai Motoboy" },
      {
        name: "description",
        content: "Acesse sua conta Corre.ai Motoboy para receber corridas de passageiro e entregas.",
      },
      { property: "og:title", content: "Entrar | Corre.ai Motoboy" },
      {
        property: "og:description",
        content: "Acesse sua conta Corre.ai Motoboy para receber corridas de passageiro e entregas.",
      },
    ],
  }),
  component: TelaAuth,
});

function TelaAuth() {
  const navigate = useNavigate();
  const [modo, setModo] = useState<"entrar" | "cadastrar">("entrar");
  const [enviando, setEnviando] = useState(false);
  const [form, setForm] = useState({
    nome: "",
    telefone: "",
    email: "",
    senha: "",
    pix: "",
    modelo: "",
    placa: "",
  });

  const alterar = (campo: keyof typeof form) => (evento: React.ChangeEvent<HTMLInputElement>) =>
    setForm((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function enviar(evento: React.FormEvent) {
    evento.preventDefault();
    setEnviando(true);
    try {
      if (modo === "entrar") {
        const { error } = await supabase.auth.signInWithPassword({
          email: form.email.trim(),
          password: form.senha,
        });
        if (error) throw error;
        await navigate({ to: "/" });
        return;
      }

      const { data, error } = await supabase.auth.signUp({
        email: form.email.trim(),
        password: form.senha,
        options: {
          emailRedirectTo: window.location.origin,
          data: {
            nome: form.nome.trim(),
            telefone: form.telefone.trim(),
            pix_key: form.pix.trim(),
            moto_modelo: form.modelo.trim(),
            moto_placa: form.placa.trim().toUpperCase(),
          },
        },
      });
      if (error) throw error;

      const usuarioId = data.user?.id;
      if (usuarioId) {
        const { error: erroPerfil } = await supabase.from("motoboys").insert({
          id: usuarioId,
          nome: form.nome.trim(),
          telefone: form.telefone.trim(),
          email: form.email.trim(),
          pix_key: form.pix.trim(),
          moto_modelo: form.modelo.trim(),
          moto_placa: form.placa.trim().toUpperCase(),
        } as never);
        if (erroPerfil && !data.session) {
          // perfil será criado no primeiro acesso confirmado
        } else if (erroPerfil) {
          throw erroPerfil;
        }
      }

      if (data.session) {
        toast.success("Cadastro concluído. Bem-vindo ao Corre.ai!");
        await navigate({ to: "/" });
      } else {
        toast.success("Cadastro enviado. Confirme o e-mail para entrar.");
        setModo("entrar");
      }
    } catch (erro) {
      toast.error(erro instanceof Error ? erro.message : "Não foi possível continuar.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <main className="flex min-h-screen items-center justify-center bg-background px-4 py-10">
      <div className="w-full max-w-md">
        <div className="mb-8 text-center">
          <p className="text-3xl font-black tracking-tight">
            CORRE<span className="text-primary">.AI</span>
          </p>
          <p className="mt-1 text-xs uppercase tracking-[0.35em] text-muted-foreground">Motoboy</p>
        </div>

        <div className="mb-6 grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
          {(["entrar", "cadastrar"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setModo(opcao)}
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize transition-colors ${
                modo === opcao ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>

        <form onSubmit={enviar} className="space-y-4 rounded-xl border border-border bg-card p-5">
          <h1 className="text-lg font-bold">
            {modo === "entrar" ? "Entrar na conta" : "Criar conta de motoboy"}
          </h1>

          {modo === "cadastrar" && (
            <>
              <Campo label="Nome completo" value={form.nome} onChange={alterar("nome")} required />
              <Campo
                label="Telefone"
                value={form.telefone}
                onChange={alterar("telefone")}
                required
                type="tel"
              />
            </>
          )}

          <Campo label="E-mail" value={form.email} onChange={alterar("email")} required type="email" />
          <Campo
            label="Senha"
            value={form.senha}
            onChange={alterar("senha")}
            required
            type="password"
            minLength={6}
          />

          {modo === "cadastrar" && (
            <>
              <Campo label="Chave Pix" value={form.pix} onChange={alterar("pix")} required />
              <div className="grid grid-cols-2 gap-3">
                <Campo label="Modelo da moto" value={form.modelo} onChange={alterar("modelo")} required />
                <Campo label="Placa" value={form.placa} onChange={alterar("placa")} required />
              </div>
            </>
          )}

          <Button type="submit" className="h-12 w-full text-base font-bold" disabled={enviando}>
            {enviando ? "Aguarde..." : modo === "entrar" ? "Entrar" : "Cadastrar"}
          </Button>
        </form>
      </div>
    </main>
  );
}

function Campo({
  label,
  ...props
}: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input {...props} className="h-11 bg-secondary" />
    </div>
  );
}
