export type TipoCorrida = "passageiro" | "entrega";
export type FormaPagamento = "pix" | "dinheiro";

export type StatusCorrida =
  | "pendente"
  // passageiro
  | "a_caminho"
  | "chegou_origem"
  | "em_andamento"
  // entrega
  | "a_caminho_retirada"
  | "chegou_retirada"
  | "a_caminho_destino"
  | "destinatario_ausente"
  | "aguardando_decisao"
  | "retorno_estabelecimento"
  // finais
  | "finalizada"
  | "cancelada";

export interface Corrida {
  id: string;
  tipo: TipoCorrida;
  status: StatusCorrida;
  origem_endereco: string;
  origem_lat: number | null;
  origem_lng: number | null;
  destino_endereco: string;
  destino_lat: number | null;
  destino_lng: number | null;
  valor: number;
  taxa_retorno: number;
  forma_pagamento: FormaPagamento;
  motoboy_id: string | null;
  solicitante_nome: string;
  solicitante_id: string | null;
  observacoes: string | null;
  ausencia: boolean;
  decisao_estabelecimento: string | null;
  novo_destino_endereco: string | null;
  created_at: string;
  aceita_em: string | null;
  iniciada_em: string | null;
  finalizada_em: string | null;
  updated_at: string;
}

export interface Comprovante {
  id: string;
  corrida_id: string;
  imagem_url: string | null;
  observacao: string | null;
  enviado_em: string;
}

export interface Motoboy {
  id: string;
  nome: string;
  telefone: string;
  email: string;
  pix_key: string;
  moto_modelo: string;
  moto_placa: string;
  online: boolean;
  lat: number | null;
  lng: number | null;
  localizacao_atualizada_em: string | null;
}

/** Regras de negócio fixas do Corre.ai */
export const VALOR_PASSAGEIRO = 8;
export const TAXA_RETORNO = 4;
export const ESPERA_PASSAGEIRO_SEGUNDOS = 3 * 60;
export const ESPERA_DESTINATARIO_SEGUNDOS = 5 * 60;

export const STATUS_LABEL: Record<StatusCorrida, string> = {
  pendente: "Aguardando motoboy",
  a_caminho: "A caminho",
  chegou_origem: "Aguardando passageiro",
  em_andamento: "Em corrida",
  a_caminho_retirada: "A caminho da retirada",
  chegou_retirada: "No estabelecimento",
  a_caminho_destino: "A caminho do destino",
  destinatario_ausente: "Destinatário ausente",
  aguardando_decisao: "Aguardando o estabelecimento",
  retorno_estabelecimento: "Retornando ao estabelecimento",
  finalizada: "Finalizada",
  cancelada: "Cancelada",
};

export function ehCorridaAtiva(status: StatusCorrida): boolean {
  return status !== "finalizada" && status !== "cancelada" && status !== "pendente";
}

export function valorTotal(corrida: Pick<Corrida, "valor" | "taxa_retorno">): number {
  return Number(corrida.valor ?? 0) + Number(corrida.taxa_retorno ?? 0);
}

export function formatarBRL(valor: number): string {
  return valor.toLocaleString("pt-BR", { style: "currency", currency: "BRL" });
}
