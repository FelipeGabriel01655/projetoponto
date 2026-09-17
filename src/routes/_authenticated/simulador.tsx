import { useState } from "react";
import { createFileRoute, Link } from "@tanstack/react-router";
import { ArrowLeft } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useSessao } from "@/features/motoboy/useMotoboy";
import { useHistorico } from "@/features/corridas/hooks";
import { VALOR_PASSAGEIRO, type FormaPagamento, type TipoCorrida } from "@/features/corridas/types";

export const Route = createFileRoute("/_authenticated/simulador")({
  head: () => ({
    meta: [
      { title: "Painel de teste | Corre.ai Motoboy" },
      {
        name: "description",
        content: "Crie solicitações de teste para validar o fluxo de corridas e entregas.",
      },
      { property: "og:title", content: "Painel de teste | Corre.ai Motoboy" },
      { property: "og:description", content: "Crie solicitações de teste de corridas e entregas." },
    ],
  }),
  component: TelaSimulador,
});

function TelaSimulador() {
  const { usuarioId } = useSessao();
  const { data: historico = [] } = useHistorico(usuarioId);
  const [tipo, setTipo] = useState<TipoCorrida>("passageiro");
  const [pagamento, setPagamento] = useState<FormaPagamento>("pix");
  const [origem, setOrigem] = useState("Av. Paulista, 1000");
  const [destino, setDestino] = useState("Rua Augusta, 500");
  const [valor, setValor] = useState("12");
  const [solicitante, setSolicitante] = useState("Lanchonete Teste");
  const [enviando, setEnviando] = useState(false);

  async function criar() {
    setEnviando(true);
    try {
      const { error } = await supabase.from("corridas").insert({
        tipo,
        status: "pendente",
        origem_endereco: origem,
        destino_endereco: destino,
        valor: tipo === "passageiro" ? VALOR_PASSAGEIRO : Number(valor || 0),
        forma_pagamento: pagamento,
        solicitante_nome: solicitante,
      } as never);
      if (error) throw error;
      toast.success("Solicitação de teste criada.");
    } catch {
      toast.error("Não foi possível criar a solicitação.");
    } finally {
      setEnviando(false);
    }
  }

  async function decidir(corridaId: string, decisao: "retorno" | "novo_destino") {
    const { error } = await supabase
      .from("corridas")
      .update({
        decisao_estabelecimento: decisao,
        novo_destino_endereco: decisao === "novo_destino" ? "Rua Nova, 123" : null,
      } as never)
      .eq("id", corridaId);
    if (error) toast.error("Só o motoboy responsável pode alterar essa corrida por aqui.");
    else toast.success("Decisão registrada.");
  }

  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="Voltar" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <h1 className="text-xl font-black">Painel de teste</h1>
          <p className="text-xs text-muted-foreground">
            Simula o app do cliente/estabelecimento até que ele exista.
          </p>
        </div>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
          {(["passageiro", "entrega"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setTipo(opcao)}
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                tipo === opcao ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {opcao}
            </button>
          ))}
        </div>

        <Campo label="Origem" value={origem} onChange={(e) => setOrigem(e.target.value)} />
        <Campo label="Destino" value={destino} onChange={(e) => setDestino(e.target.value)} />
        <Campo
          label="Solicitante"
          value={solicitante}
          onChange={(e) => setSolicitante(e.target.value)}
        />
        {tipo === "entrega" ? (
          <Campo label="Valor (R$)" value={valor} onChange={(e) => setValor(e.target.value)} />
        ) : (
          <p className="text-xs text-muted-foreground">
            Corrida de passageiro usa o valor fixo de R$ 8,00.
          </p>
        )}

        <div className="grid grid-cols-2 gap-1 rounded-lg bg-secondary p-1">
          {(["pix", "dinheiro"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setPagamento(opcao)}
              className={`rounded-md px-3 py-2 text-sm font-semibold capitalize ${
                pagamento === opcao ? "bg-primary text-primary-foreground" : "text-muted-foreground"
              }`}
            >
              {opcao === "pix" ? "Pix" : "Dinheiro"}
            </button>
          ))}
        </div>

        <Button className="h-12 w-full font-bold" onClick={() => void criar()} disabled={enviando}>
          Criar solicitação de teste
        </Button>
      </section>

      <section className="mt-4 rounded-2xl border border-border bg-card p-4">
        <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-muted-foreground">
          Resposta do estabelecimento
        </h2>
        <p className="mb-3 text-xs text-muted-foreground">
          Use quando uma entrega sua estiver aguardando decisão por destinatário ausente.
        </p>
        <DecisaoEntrega onDecidir={decidir} />
      </section>

      <p className="mt-4 text-center text-xs text-muted-foreground">
        {historico.length} corrida(s) já finalizadas nesta conta.
      </p>
    </main>
  );
}

function DecisaoEntrega({
  onDecidir,
}: {
  onDecidir: (corridaId: string, decisao: "retorno" | "novo_destino") => Promise<void>;
}) {
  const [id, setId] = useState("");
  return (
    <div className="space-y-3">
      <Campo label="ID da corrida" value={id} onChange={(e) => setId(e.target.value)} />
      <div className="grid grid-cols-2 gap-3">
        <Button
          variant="secondary"
          className="h-11 font-bold"
          disabled={!id}
          onClick={() => void onDecidir(id, "retorno")}
        >
          Pedir retorno
        </Button>
        <Button
          variant="secondary"
          className="h-11 font-bold"
          disabled={!id}
          onClick={() => void onDecidir(id, "novo_destino")}
        >
          Novo destino
        </Button>
      </div>
    </div>
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
