import { Bike, MapPin, User, Wallet } from "lucide-react";
import { Button } from "@/components/ui/button";
import { formatarBRL, valorTotal, type Corrida } from "@/features/corridas/types";

interface Props {
  corrida: Corrida;
  onAceitar: () => void;
  onRecusar: () => void;
  processando?: boolean;
}

export function CardSolicitacao({ corrida, onAceitar, onRecusar, processando }: Props) {
  const ehPassageiro = corrida.tipo === "passageiro";

  return (
    <div className="glass-panel animate-in slide-in-from-bottom-4 rounded-2xl p-4 shadow-2xl">
      <div className="flex items-center justify-between">
        <span className="inline-flex items-center gap-2 rounded-full bg-primary px-3 py-1 text-xs font-bold uppercase tracking-wide text-primary-foreground">
          {ehPassageiro ? <User className="size-3.5" /> : <Bike className="size-3.5" />}
          {ehPassageiro ? "Passageiro" : "Entrega"}
        </span>
        <span className="text-2xl font-black">{formatarBRL(valorTotal(corrida))}</span>
      </div>

      <div className="mt-4 space-y-3 text-sm">
        <Linha titulo="Origem" texto={corrida.origem_endereco} />
        <Linha titulo="Destino" texto={corrida.destino_endereco} />
        <div className="flex items-center gap-2 text-muted-foreground">
          <Wallet className="size-4" />
          <span className="capitalize">
            Pagamento: {corrida.forma_pagamento === "pix" ? "Pix" : "Dinheiro"}
          </span>
        </div>
      </div>

      <div className="mt-5 grid grid-cols-2 gap-3">
        <Button variant="secondary" className="h-12 font-bold" onClick={onRecusar} disabled={processando}>
          Recusar
        </Button>
        <Button className="h-12 font-bold" onClick={onAceitar} disabled={processando}>
          {processando ? "Aceitando..." : "Aceitar"}
        </Button>
      </div>
    </div>
  );
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
