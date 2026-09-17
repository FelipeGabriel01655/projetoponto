import { useState } from "react";
import { createFileRoute, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { ArrowLeft, Clock, FileCheck2, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { useComprovantes, useContagemRegressiva, useCorrida } from "@/features/corridas/hooks";
import { atualizarStatus } from "@/features/corridas/api";
import {
  ESPERA_DESTINATARIO_SEGUNDOS,
  ESPERA_PASSAGEIRO_SEGUNDOS,
  STATUS_LABEL,
  TAXA_RETORNO,
  formatarBRL,
  valorTotal,
  type Corrida,
  type FormaPagamento,
} from "@/features/corridas/types";
import { notificar } from "@/features/notificacoes/alertas";

export const Route = createFileRoute("/_authenticated/corrida/$id")({
  head: () => ({
    meta: [
      { title: "Corrida em andamento | Corre.ai Motoboy" },
      { name: "description", content: "Acompanhe e atualize o andamento da corrida em tempo real." },
      { property: "og:title", content: "Corrida em andamento | Corre.ai Motoboy" },
      { property: "og:description", content: "Acompanhe e atualize o andamento da corrida." },
    ],
  }),
  component: TelaCorrida,
});

function TelaCorrida() {
  const { id } = Route.useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { data: corrida, isLoading } = useCorrida(id);
  const { data: comprovantes = [] } = useComprovantes(id);
  const [salvando, setSalvando] = useState(false);
  const [pagamento, setPagamento] = useState<FormaPagamento | null>(null);

  async function mudar(status: Corrida["status"], extra: Record<string, unknown> = {}) {
    setSalvando(true);
    try {
      await atualizarStatus(id, status, extra);
      await queryClient.invalidateQueries({ queryKey: ["corrida", id] });
      await queryClient.invalidateQueries({ queryKey: ["corrida-ativa"] });
      await queryClient.invalidateQueries({ queryKey: ["ganhos-do-dia"] });
      if (status === "finalizada") {
        toast.success("Corrida encerrada.");
        await navigate({ to: "/" });
      }
    } catch {
      toast.error("Não foi possível atualizar a corrida.");
    } finally {
      setSalvando(false);
    }
  }

  if (isLoading) {
    return <Tela><p className="text-muted-foreground">Carregando corrida...</p></Tela>;
  }
  if (!corrida) {
    return (
      <Tela>
        <p className="text-muted-foreground">Corrida não encontrada.</p>
        <Link to="/" className="mt-4 inline-block text-primary underline">
          Voltar para o mapa
        </Link>
      </Tela>
    );
  }

  return (
    <Tela>
      <header className="mb-6 flex items-center gap-3">
        <Link to="/" aria-label="Voltar" className="rounded-full border border-border p-2">
          <ArrowLeft className="size-5" />
        </Link>
        <div>
          <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
            {corrida.tipo === "passageiro" ? "Passageiro" : "Entrega"}
          </p>
          <h1 className="text-xl font-black">{STATUS_LABEL[corrida.status]}</h1>
        </div>
        <p className="ml-auto text-xl font-black">{formatarBRL(valorTotal(corrida))}</p>
      </header>

      <section className="space-y-3 rounded-2xl border border-border bg-card p-4">
        <Endereco titulo="Origem" texto={corrida.origem_endereco} />
        <Endereco
          titulo="Destino"
          texto={corrida.novo_destino_endereco ?? corrida.destino_endereco}
        />
        <p className="text-xs text-muted-foreground">
          Pagamento combinado: {corrida.forma_pagamento === "pix" ? "Pix" : "Dinheiro"}
          {corrida.solicitante_nome ? ` · Solicitante: ${corrida.solicitante_nome}` : ""}
        </p>
      </section>

      {comprovantes.length > 0 && (
        <section className="mt-4 rounded-2xl border border-border bg-card p-4">
          <p className="mb-2 flex items-center gap-2 text-sm font-bold">
            <FileCheck2 className="size-4 text-success" /> Comprovante enviado pelo cliente
          </p>
          {comprovantes.map((comprovante) => (
            <div key={comprovante.id} className="mt-2 text-sm">
              {comprovante.imagem_url && (
                <a
                  href={comprovante.imagem_url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary underline"
                >
                  Abrir comprovante
                </a>
              )}
              {comprovante.observacao && (
                <p className="text-muted-foreground">{comprovante.observacao}</p>
              )}
            </div>
          ))}
          <p className="mt-3 text-xs text-muted-foreground">
            Confira o recebimento no seu aplicativo do banco antes de finalizar. O Corre.ai não
            processa pagamentos.
          </p>
        </section>
      )}

      <section className="mt-6 space-y-3">
        {corrida.tipo === "passageiro" ? (
          <FluxoPassageiro
            corrida={corrida}
            salvando={salvando}
            pagamento={pagamento}
            setPagamento={setPagamento}
            mudar={mudar}
          />
        ) : (
          <FluxoEntrega corrida={corrida} salvando={salvando} mudar={mudar} />
        )}
      </section>
    </Tela>
  );
}

type Mudar = (status: Corrida["status"], extra?: Record<string, unknown>) => Promise<void>;

function FluxoPassageiro({
  corrida,
  salvando,
  pagamento,
  setPagamento,
  mudar,
}: {
  corrida: Corrida;
  salvando: boolean;
  pagamento: FormaPagamento | null;
  setPagamento: (valor: FormaPagamento) => void;
  mudar: Mudar;
}) {
  const espera = useContagemRegressiva(
    corrida.status === "chegou_origem" ? corrida.updated_at : null,
    ESPERA_PASSAGEIRO_SEGUNDOS,
  );

  if (corrida.status === "a_caminho") {
    return (
      <Acao rotulo="Cheguei na origem" onClick={() => mudar("chegou_origem")} carregando={salvando} />
    );
  }

  if (corrida.status === "chegou_origem") {
    return (
      <>
        <Cronometro texto={espera.texto} descricao="Tempo de espera do passageiro" />
        <Acao
          rotulo="Iniciar corrida"
          onClick={() => mudar("em_andamento", { iniciada_em: new Date().toISOString() })}
          carregando={salvando}
        />
        <Acao
          variante="secondary"
          rotulo={espera.terminou ? "Registrar ausência e encerrar" : "Passageiro não apareceu"}
          desabilitado={!espera.terminou}
          onClick={() =>
            mudar("finalizada", {
              ausencia: true,
              valor: 0,
              finalizada_em: new Date().toISOString(),
            })
          }
          carregando={salvando}
        />
        {!espera.terminou && (
          <p className="text-center text-xs text-muted-foreground">
            A ausência pode ser registrada após 3 minutos, sem nenhuma cobrança adicional.
          </p>
        )}
      </>
    );
  }

  if (corrida.status === "em_andamento") {
    return (
      <>
        <p className="text-sm font-semibold">Forma de pagamento recebida</p>
        <div className="grid grid-cols-2 gap-3">
          {(["pix", "dinheiro"] as const).map((opcao) => (
            <button
              key={opcao}
              type="button"
              onClick={() => setPagamento(opcao)}
              className={`h-12 rounded-xl border text-sm font-bold capitalize ${
                pagamento === opcao
                  ? "border-primary bg-primary text-primary-foreground"
                  : "border-border bg-secondary"
              }`}
            >
              {opcao === "pix" ? "Pix" : "Dinheiro"}
            </button>
          ))}
        </div>
        <Acao
          rotulo="Corrida finalizada"
          desabilitado={!pagamento}
          carregando={salvando}
          onClick={() =>
            mudar("finalizada", {
              forma_pagamento: pagamento,
              finalizada_em: new Date().toISOString(),
            })
          }
        />
      </>
    );
  }

  return <p className="text-sm text-muted-foreground">Corrida encerrada.</p>;
}

function FluxoEntrega({
  corrida,
  salvando,
  mudar,
}: {
  corrida: Corrida;
  salvando: boolean;
  mudar: Mudar;
}) {
  const espera = useContagemRegressiva(
    corrida.status === "destinatario_ausente" ? corrida.updated_at : null,
    ESPERA_DESTINATARIO_SEGUNDOS,
  );

  switch (corrida.status) {
    case "a_caminho_retirada":
      return <Acao rotulo="Cheguei" onClick={() => mudar("chegou_retirada")} carregando={salvando} />;
    case "chegou_retirada":
      return (
        <Acao rotulo="Entrega retirada" onClick={() => mudar("a_caminho_destino")} carregando={salvando} />
      );
    case "a_caminho_destino":
      return (
        <>
          <Acao
            rotulo="Entrega realizada"
            carregando={salvando}
            onClick={() => mudar("finalizada", { finalizada_em: new Date().toISOString() })}
          />
          <Acao
            variante="secondary"
            rotulo="Destinatário ausente"
            carregando={salvando}
            onClick={() => {
              notificar("Destinatário ausente", "Aguarde 5 minutos no local.", "aviso");
              return mudar("destinatario_ausente");
            }}
          />
        </>
      );
    case "destinatario_ausente":
      return (
        <>
          <Cronometro texto={espera.texto} descricao="Espera pelo destinatário" />
          <Acao
            rotulo="Avisar o estabelecimento"
            desabilitado={!espera.terminou}
            carregando={salvando}
            onClick={() => mudar("aguardando_decisao")}
          />
          <Acao
            variante="secondary"
            rotulo="Destinatário apareceu · Entrega realizada"
            carregando={salvando}
            onClick={() => mudar("finalizada", { finalizada_em: new Date().toISOString() })}
          />
        </>
      );
    case "aguardando_decisao":
      if (corrida.decisao_estabelecimento === "retorno") {
        return (
          <>
            <Aviso texto={`O estabelecimento pediu o retorno do pedido. Taxa adicional de ${formatarBRL(TAXA_RETORNO)}.`} />
            <Acao
              rotulo="Iniciar retorno"
              carregando={salvando}
              onClick={() => mudar("retorno_estabelecimento", { taxa_retorno: TAXA_RETORNO })}
            />
          </>
        );
      }
      if (corrida.decisao_estabelecimento === "novo_destino") {
        return (
          <>
            <Aviso texto={`Novo destino informado: ${corrida.novo_destino_endereco ?? "-"}`} />
            <Acao
              rotulo="Seguir para o novo destino"
              carregando={salvando}
              onClick={() => mudar("a_caminho_destino")}
            />
          </>
        );
      }
      return <Aviso texto="Aguardando o estabelecimento decidir entre retorno ou novo destino." />;
    case "retorno_estabelecimento":
      return (
        <Acao
          rotulo="Retorno concluído"
          carregando={salvando}
          onClick={() => mudar("finalizada", { finalizada_em: new Date().toISOString() })}
        />
      );
    default:
      return <p className="text-sm text-muted-foreground">Entrega encerrada.</p>;
  }
}

function Tela({ children }: { children: React.ReactNode }) {
  return (
    <main className="mx-auto min-h-dvh w-full max-w-md px-4 py-6">{children}</main>
  );
}

function Endereco({ titulo, texto }: { titulo: string; texto: string }) {
  return (
    <div className="flex gap-2">
      <MapPin className="mt-0.5 size-4 shrink-0 text-primary" />
      <div>
        <p className="text-[11px] uppercase tracking-wide text-muted-foreground">{titulo}</p>
        <p className="font-medium leading-snug">{texto}</p>
      </div>
    </div>
  );
}

function Cronometro({ texto, descricao }: { texto: string; descricao: string }) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-border bg-card p-4">
      <Clock className="size-5 text-primary" />
      <div>
        <p className="text-2xl font-black tabular-nums">{texto}</p>
        <p className="text-xs text-muted-foreground">{descricao}</p>
      </div>
    </div>
  );
}

function Aviso({ texto }: { texto: string }) {
  return (
    <p className="rounded-xl border border-border bg-secondary p-3 text-sm text-muted-foreground">
      {texto}
    </p>
  );
}

function Acao({
  rotulo,
  onClick,
  carregando,
  desabilitado,
  variante = "default",
}: {
  rotulo: string;
  onClick: () => void | Promise<void>;
  carregando?: boolean;
  desabilitado?: boolean;
  variante?: "default" | "secondary";
}) {
  return (
    <Button
      variant={variante}
      className="h-14 w-full text-base font-bold"
      disabled={carregando || desabilitado}
      onClick={() => void onClick()}
    >
      {rotulo}
    </Button>
  );
}
