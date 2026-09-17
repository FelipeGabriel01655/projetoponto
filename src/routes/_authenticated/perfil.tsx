import { useEffect, useState } from "react";
import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, LogOut } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessao, usePerfilMotoboy, useAtualizarMotoboy } from "@/features/motoboy/useMotoboy";
import { useHistorico } from "@/features/corridas/hooks";
import { STATUS_LABEL, formatarBRL, valorTotal } from "@/features/corridas/types";

export const Route = createFileRoute("/_authenticated/perfil")({
  head: () => ({
    meta: [
      { title: "Meu perfil | Corre.ai Motoboy" },
      {
        name: "description",
        content: "Veja seu histórico de corridas, atualize seus dados e altere sua senha.",
      },
      { property: "og:title", content: "Meu perfil | Corre.ai Motoboy" },
      { property: "og:description", content: "Histórico de corridas e dados da conta do motoboy." },
    ],
  }),
  component: TelaPerfil,
});

function TelaPerfil() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuarioId } = useSessao();
  const { data: perfil } = usePerfilMotoboy(usuarioId);
  const atualizar = useAtualizarMotoboy(usuarioId);
  const { data: historico = [] } = useHistorico(usuarioId);

  const [form, setForm] = useState({ nome: "", telefone: "", pix_key: "", moto_modelo: "", moto_placa: "" });
  const [novaSenha, setNovaSenha] = useState("");
  const [salvando, setSalvando] = useState(false);

  useEffect(() => {
    if (!perfil) return;
    setForm({
      nome: perfil.nome,
      telefone: perfil.telefone,
      pix_key: perfil.pix_key,
      moto_modelo: perfil.moto_modelo,
      moto_placa: perfil.moto_placa,
    });
  }, [perfil]);

  const alterar = (campo: keyof typeof form) => (evento: React.ChangeEvent<HTMLInputElement>) =>
    setForm((atual) => ({ ...atual, [campo]: evento.target.value }));

  async function salvar() {
    setSalvando(true);
    try {
      await atualizar(form);
      toast.success("Dados atualizados.");
    } catch {
      toast.error("Não foi possível salvar.");
    } finally {
      setSalvando(false);
    }
  }

  async function trocarSenha() {
    if (novaSenha.length < 6) {
      toast.error("A nova senha precisa ter ao menos 6 caracteres.");
      return;
    }
    const { error } = await supabase.auth.updateUser({ password: novaSenha });
    if (error) {
      toast.error(error.message);
      return;
    }
    setNovaSenha("");
    toast.success("Senha alterada.");
  }

  async function sair() {
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut();
    await navigate({ to: "/auth", replace: true });
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="Voltar" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-xl font-black">Meu perfil</h1>
        <button
          type="button"
          onClick={() => void sair()}
          className="ml-auto flex items-center gap-1.5 text-sm text-muted-foreground"
        >
          <LogOut className="size-4" /> Sair
        </button>
      </header>

      <section className="rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Dados da conta
        </h2>
        <div className="space-y-3">
          <Campo label="Nome" value={form.nome} onChange={alterar("nome")} />
          <Campo label="Telefone" value={form.telefone} onChange={alterar("telefone")} />
          <div className="space-y-1.5">
            <Label className="text-xs uppercase tracking-wide text-muted-foreground">E-mail</Label>
            <Input value={perfil?.email ?? ""} readOnly className="h-11 bg-muted text-muted-foreground" />
          </div>
          <Campo label="Chave Pix" value={form.pix_key} onChange={alterar("pix_key")} />
          <div className="grid grid-cols-2 gap-3">
            <Campo label="Modelo da moto" value={form.moto_modelo} onChange={alterar("moto_modelo")} />
            <Campo label="Placa" value={form.moto_placa} onChange={alterar("moto_placa")} />
          </div>
          <Button className="h-12 w-full font-bold" onClick={() => void salvar()} disabled={salvando}>
            Salvar alterações
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Alterar senha
        </h2>
        <div className="space-y-3">
          <Campo
            label="Nova senha"
            type="password"
            value={novaSenha}
            onChange={(evento) => setNovaSenha(evento.target.value)}
          />
          <Button variant="secondary" className="h-12 w-full font-bold" onClick={() => void trocarSenha()}>
            Alterar senha
          </Button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-4 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Histórico de corridas
        </h2>
        {historico.length === 0 ? (
          <p className="text-sm text-muted-foreground">Nenhuma corrida finalizada ainda.</p>
        ) : (
          <ul className="divide-y divide-border">
            {historico.map((corrida) => (
              <li key={corrida.id} className="flex items-center justify-between gap-3 py-3">
                <div>
                  <p className="text-sm font-semibold">
                    {corrida.tipo === "passageiro" ? "Passageiro" : "Entrega"}
                    {corrida.ausencia ? " · ausência" : ""}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    {corrida.destino_endereco} ·{" "}
                    {corrida.finalizada_em
                      ? new Date(corrida.finalizada_em).toLocaleString("pt-BR")
                      : STATUS_LABEL[corrida.status]}
                  </p>
                </div>
                <span className="shrink-0 font-bold">{formatarBRL(valorTotal(corrida))}</span>
              </li>
            ))}
          </ul>
        )}
      </section>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        <Link to="/simulador" className="underline">
          Painel de teste de solicitações
        </Link>
      </p>
    </main>
  );
}

function Campo({ label, ...props }: { label: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs uppercase tracking-wide text-muted-foreground">{label}</Label>
      <Input {...props} className="h-11 bg-secondary" />
    </div>
  );
}
