import { useEffect, useRef, useState } from "react";
import { useQueryClient } from "@tanstack/react-query";
import { ChevronDown, ChevronUp, Clock, GripHorizontal, MapPin } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { atualizarStatus } from "@/features/corridas/api";
import { useContagemRegressiva } from "@/features/corridas/hooks";
import {
  ESPERA_DESTINATARIO_SEGUNDOS,
  STATUS_LABEL,
  TAXA_RETORNO,
  formatarBRL,
  valorTotal,
  type Corrida,
} from "@/features/corridas/types";
import { notificar } from "@/features/notificacoes/alertas";

interface Props {
  corrida: Corrida;
  onFinalizada?: () => void;
}

/** Painel flutuante e arrastável exibido sobre o mapa da Home. */
export function PainelCorrida({ corrida, onFinalizada }: Props) {
  const queryClient = useQueryClient();
  const [salvando, setSalvando] = useState(false);
  const [minimizado, setMinimizado] = useState(false);
  const [deslocamento, setDeslocamento] = useState({ x: 0, y: 0 });
  const arrasto = useRef<{ x: number; y: number; ox: number; oy: number } | null>(null);

  useEffect(() => {
    setDeslocamento({ x: 0, y: 0 });
  }, [corrida.id]);

  function aoPressionar(evento: React.PointerEvent) {
    arrasto.current = {
      x: evento.clientX,
      y: evento.clientY,
      ox: deslocamento.x,
      oy: deslocamento.y,
    };
    evento.currentTarget.setPointerCapture(evento.pointerId);
  }

  function aoMover(evento: React.PointerEvent) {
    const inicio = arrasto.current;
    if (!inicio) return;
    setDeslocamento({
      x: inicio.ox + (evento.clientX - inicio.x),
      y: inicio.oy + (evento.clientY - inicio.y),
    });
  }

  function aoSoltar() {
    arrasto.current = null;
  }

  async function mudar(status: Corrida["status"], extra: Record<string, unknown> = {}) {
    setSalvando(true);
    try {
      await atualizarStatus(corrida.id, status, extra);
      await queryClient.invalidateQueries({ queryKey: ["corrida-ativa"] });
      await queryClient.invalidateQueries({ queryKey: ["corrida", corrida.id] });
      await queryClient.invalidateQueries({ queryKey: ["ganhos-do-dia"] });
      if (status === "finalizada") {
        toast.success("Corrida encerrada.");
        onFinalizada?.();
      }
    } catch {
      toast.error("Não foi possível atualizar a corrida.");
    } finally {
      setSalvando(false);
    }
  }

  return (
    <div
      className="glass-panel animate-in slide-in-from-bottom-4 rounded-2xl shadow-2xl"
      style={{ transform: `translate(${deslocamento.x}px, ${deslocamento.y}px)` }}
    >
      <div
        onPointerDown={aoPressionar}
        onPointerMove={aoMover}
        onPointerUp={aoSoltar}
        onPointerCancel={aoSoltar}
        className="flex cursor-grab touch-none items-center gap-3 px-4 py-3 active:cursor-grabbing"
      >
        <GripHorizontal className="size-4 shrink-0 text-muted-foreground" />
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            {corrida.tipo === "passageiro" ? "Passageiro" : "Entrega"}
          </p>
          <p className="truncate text-sm font-bold">{STATUS_LABEL[corrida.status]}</p>
        </div>
        <p className="ml-auto text-lg font-black">{formatarBRL(valorTotal(corrida))}</p>
        <button
          type="button"
          onClick={() => setMinimizado((valor) => !valor)}
          aria-label={minimizado ? "Expandir painel" : "Minimizar painel"}
          className="rounded-full border border-border p-1.5"
        >
          {minimizado ? <ChevronUp className="size-4" /> : <ChevronDown className="size-4" />}
        </button>
      </div>

      {!minimizado && (
        <div className="space-y-4 px-4 pb-4">
          <div className="space-y-2 text-sm">
            <Linha titulo="Origem" texto={corrida.origem_endereco} />
            <Linha
              titulo="Destino"
              texto={corrida.novo_destino_endereco ?? corrida.destino_endereco}
            />
            <p className="text-xs text-muted-foreground">
              Pagamento: {corrida.forma_pagamento === "pix" ? "Pix" : "Dinheiro"}
              {corrida.solicitante_nome ? ` · ${corrida.solicitante_nome}` : ""}
            </p>
          </div>

          <div className="space-y-3">
            {corrida.tipo === "passageiro" ? (
              <FluxoPassageiro corrida={corrida} salvando={salvando} mudar={mudar} />

            ) : (
              <FluxoEntrega corrida={corrida} salvando={salvando} mudar={mudar} />
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type Mudar = (status: Corrida["status"], extra?: Record<string, unknown>) => Promise<void>;

function FluxoPassageiro({
  corrida,
  salvando,
  mudar,
}: {
  corrida: Corrida;
  salvando: boolean;
  mudar: Mudar;
}) {
  // Primeiro estágio: apenas "Chegada ao destino de origem".
  if (corrida.status === "a_caminho" || corrida.status === "chegou_origem") {
    return (
      <Acao
        rotulo="Chegada ao destino de origem"
        onClick={() => mudar("em_andamento", { iniciada_em: new Date().toISOString() })}
        carregando={salvando}
      />
    );
  }

  if (corrida.status === "em_andamento") {
    return (
      <Acao
        rotulo="Corrida finalizada"
        carregando={salvando}
        onClick={() => mudar("finalizada", { finalizada_em: new Date().toISOString() })}
      />
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
    // Primeiro estágio da entrega: apenas "Entrega retirada".
    case "a_caminho_retirada":
    case "chegou_retirada":
      return (
        <Acao rotulo="Entrega retirada" onClick={() => mudar("a_caminho_destino")} carregando={salvando} />
      );
    case "a_caminho_destino":
      return (
        <>
          <Acao
            rotulo="Entrega finalizada"
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
            rotulo="Destinatário apareceu · Entrega finalizada"
            carregando={salvando}
            onClick={() => mudar("finalizada", { finalizada_em: new Date().toISOString() })}
          />
        </>
      );
    case "aguardando_decisao":
      if (corrida.decisao_estabelecimento === "retorno") {
        return (
          <>
            <Aviso
              texto={`O estabelecimento pediu o retorno do pedido. Taxa adicional de ${formatarBRL(TAXA_RETORNO)}.`}
            />
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

function Linha({ titulo, texto }: { titulo: string; texto: string }) {
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
    <div className="flex items-center gap-3 rounded-xl border border-border bg-card p-3">
      <Clock className="size-5 text-primary" />
      <div>
        <p className="text-xl font-black tabular-nums">{texto}</p>
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
      className="h-13 w-full py-3.5 text-base font-bold"
      disabled={carregando || desabilitado}
      onClick={() => void onClick()}
    >
      {rotulo}
    </Button>
  );
}
