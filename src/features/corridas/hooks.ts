import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { supabase } from "@/integrations/supabase/client";
import { notificar } from "@/features/notificacoes/alertas";
import {
  buscarCorrida,
  buscarCorridaAtiva,
  ganhosDoDia,
  listarComprovantes,
  listarCorridasDisponiveis,
  listarHistorico,
} from "./api";
import type { Corrida } from "./types";

function chaveDoDia() {
  return new Date().toDateString();
}

/** Corridas em aberto, atualizadas em tempo real enquanto o motoboy está online. */
export function useCorridasDisponiveis(online: boolean) {
  const queryClient = useQueryClient();
  const vistas = useRef<Set<string>>(new Set());

  const consulta = useQuery({
    queryKey: ["corridas-disponiveis"],
    queryFn: listarCorridasDisponiveis,
    enabled: online,
    refetchInterval: online ? 15000 : false,
  });

  useEffect(() => {
    if (!online) {
      vistas.current.clear();
      return;
    }
    const canal = supabase
      .channel("corridas-disponiveis")
      .on("postgres_changes", { event: "*", schema: "public", table: "corridas" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["corridas-disponiveis"] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [online, queryClient]);

  const corridas = useMemo(() => consulta.data ?? [], [consulta.data]);

  useEffect(() => {
    if (!online) return;
    for (const corrida of corridas) {
      if (vistas.current.has(corrida.id)) continue;
      vistas.current.add(corrida.id);
      notificar(
        corrida.tipo === "passageiro" ? "Nova corrida de passageiro" : "Nova entrega",
        `${corrida.origem_endereco} → ${corrida.destino_endereco}`,
      );
    }
  }, [corridas, online]);

  return consulta;
}

export function useCorridaAtiva(motoboyId: string | null) {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["corrida-ativa", motoboyId],
    enabled: !!motoboyId,
    queryFn: () => buscarCorridaAtiva(motoboyId!),
  });

  useEffect(() => {
    if (!motoboyId) return;
    const canal = supabase
      .channel(`corrida-ativa-${motoboyId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "corridas" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["corrida-ativa", motoboyId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [motoboyId, queryClient]);

  return consulta;
}

export function useCorrida(id: string) {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["corrida", id],
    queryFn: () => buscarCorrida(id),
  });

  useEffect(() => {
    const canal = supabase
      .channel(`corrida-${id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "corridas", filter: `id=eq.${id}` },
        (payload) => {
          queryClient.setQueryData(["corrida", id], payload.new as unknown as Corrida);
        },
      )
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [id, queryClient]);

  return consulta;
}

export function useComprovantes(corridaId: string) {
  const queryClient = useQueryClient();
  const consulta = useQuery({
    queryKey: ["comprovantes", corridaId],
    queryFn: () => listarComprovantes(corridaId),
  });

  useEffect(() => {
    const canal = supabase
      .channel(`comprovantes-${corridaId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "comprovantes" }, () => {
        void queryClient.invalidateQueries({ queryKey: ["comprovantes", corridaId] });
      })
      .subscribe();
    return () => {
      void supabase.removeChannel(canal);
    };
  }, [corridaId, queryClient]);

  return consulta;
}

/** Faturamento do dia: soma as corridas finalizadas e zera à meia-noite. */
export function useGanhosDoDia(motoboyId: string | null) {
  const [dia, setDia] = useState(chaveDoDia());

  useEffect(() => {
    const intervalo = setInterval(() => {
      const atual = chaveDoDia();
      setDia((anterior) => (anterior === atual ? anterior : atual));
    }, 30000);
    return () => clearInterval(intervalo);
  }, []);

  return useQuery({
    queryKey: ["ganhos-do-dia", motoboyId, dia],
    enabled: !!motoboyId,
    queryFn: () => ganhosDoDia(motoboyId!),
    refetchInterval: 60000,
  });
}

export function useHistorico(motoboyId: string | null) {
  return useQuery({
    queryKey: ["historico", motoboyId],
    enabled: !!motoboyId,
    queryFn: () => listarHistorico(motoboyId!),
  });
}

/** Contagem regressiva reutilizada nas esperas de 3 e 5 minutos. */
export function useContagemRegressiva(inicioIso: string | null, segundos: number) {
  const [restante, setRestante] = useState(segundos);

  useEffect(() => {
    if (!inicioIso) {
      setRestante(segundos);
      return;
    }
    const calcular = () => {
      const decorrido = (Date.now() - new Date(inicioIso).getTime()) / 1000;
      setRestante(Math.max(0, Math.round(segundos - decorrido)));
    };
    calcular();
    const intervalo = setInterval(calcular, 1000);
    return () => clearInterval(intervalo);
  }, [inicioIso, segundos]);

  const minutos = Math.floor(restante / 60);
  const segundosRestantes = restante % 60;
  return {
    restante,
    texto: `${minutos}:${String(segundosRestantes).padStart(2, "0")}`,
    terminou: restante <= 0,
  };
}
