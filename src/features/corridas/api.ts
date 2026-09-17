import { supabase } from "@/integrations/supabase/client";
import type { Comprovante, Corrida, StatusCorrida } from "./types";

/** Erro devolvido quando outro motoboy aceitou a corrida primeiro. */
export const ERRO_CORRIDA_INDISPONIVEL = "corrida_indisponivel";

export async function listarCorridasDisponiveis(): Promise<Corrida[]> {
  const { data, error } = await supabase
    .from("corridas")
    .select("*")
    .is("motoboy_id", null)
    .eq("status", "pendente")
    .order("created_at", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Corrida[];
}

export async function buscarCorridaAtiva(motoboyId: string): Promise<Corrida | null> {
  const { data, error } = await supabase
    .from("corridas")
    .select("*")
    .eq("motoboy_id", motoboyId)
    .is("finalizada_em", null)
    .not("status", "in", "(finalizada,cancelada)")
    .order("aceita_em", { ascending: false })
    .limit(1);
  if (error) throw error;
  return ((data ?? [])[0] as unknown as Corrida) ?? null;
}

export async function buscarCorrida(id: string): Promise<Corrida | null> {
  const { data, error } = await supabase.from("corridas").select("*").eq("id", id).maybeSingle();
  if (error) throw error;
  return (data as unknown as Corrida) ?? null;
}

export async function listarHistorico(motoboyId: string): Promise<Corrida[]> {
  const { data, error } = await supabase
    .from("corridas")
    .select("*")
    .eq("motoboy_id", motoboyId)
    .not("finalizada_em", "is", null)
    .order("finalizada_em", { ascending: false })
    .limit(100);
  if (error) throw error;
  return (data ?? []) as unknown as Corrida[];
}

/**
 * Aceite atômico: a rotina no banco só vincula a corrida se ela ainda estiver
 * sem motoboy. Se outro motoboy chegou antes, lança ERRO_CORRIDA_INDISPONIVEL.
 */
export async function aceitarCorrida(corridaId: string): Promise<Corrida> {
  const { data, error } = await supabase.rpc("aceitar_corrida", { p_corrida_id: corridaId });
  if (error) {
    if (error.message?.includes(ERRO_CORRIDA_INDISPONIVEL)) {
      throw new Error(ERRO_CORRIDA_INDISPONIVEL);
    }
    throw error;
  }
  return data as unknown as Corrida;
}

export async function atualizarStatus(
  corridaId: string,
  status: StatusCorrida,
  extra: Record<string, unknown> = {},
): Promise<Corrida> {
  const { data, error } = await supabase
    .from("corridas")
    .update({ status, ...extra } as never)
    .eq("id", corridaId)
    .select("*")
    .single();
  if (error) throw error;
  return data as unknown as Corrida;
}

export async function ganhosDoDia(motoboyId: string): Promise<number> {
  const inicioDoDia = new Date();
  inicioDoDia.setHours(0, 0, 0, 0);
  const { data, error } = await supabase
    .from("corridas")
    .select("valor, taxa_retorno, ausencia")
    .eq("motoboy_id", motoboyId)
    .eq("status", "finalizada")
    .gte("finalizada_em", inicioDoDia.toISOString());
  if (error) throw error;
  return (data ?? []).reduce((total, linha) => {
    const registro = linha as { valor: number | null; taxa_retorno: number | null; ausencia: boolean };
    if (registro.ausencia) return total + Number(registro.taxa_retorno ?? 0);
    return total + Number(registro.valor ?? 0) + Number(registro.taxa_retorno ?? 0);
  }, 0);
}

export async function listarComprovantes(corridaId: string): Promise<Comprovante[]> {
  const { data, error } = await supabase
    .from("comprovantes")
    .select("*")
    .eq("corrida_id", corridaId)
    .order("enviado_em", { ascending: false });
  if (error) throw error;
  return (data ?? []) as unknown as Comprovante[];
}
