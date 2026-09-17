import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import type { Session } from "@supabase/supabase-js";
import { supabase } from "@/integrations/supabase/client";
import type { Motoboy } from "@/features/corridas/types";

export function useSessao() {
  const [sessao, setSessao] = useState<Session | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    let ativo = true;
    supabase.auth.getSession().then(({ data }) => {
      if (!ativo) return;
      setSessao(data.session);
      setCarregando(false);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_evento, nova) => {
      setSessao(nova);
    });
    return () => {
      ativo = false;
      sub.subscription.unsubscribe();
    };
  }, []);

  return { sessao, carregando, usuarioId: sessao?.user.id ?? null };
}

export function usePerfilMotoboy(usuarioId: string | null) {
  return useQuery({
    queryKey: ["motoboy", usuarioId],
    enabled: !!usuarioId,
    queryFn: async (): Promise<Motoboy | null> => {
      const { data, error } = await supabase
        .from("motoboys")
        .select("*")
        .eq("id", usuarioId!)
        .maybeSingle();
      if (error) throw error;
      return (data as unknown as Motoboy) ?? null;
    },
  });
}

export function useAtualizarMotoboy(usuarioId: string | null) {
  const queryClient = useQueryClient();
  return async (campos: Partial<Motoboy>) => {
    if (!usuarioId) return;
    const { error } = await supabase
      .from("motoboys")
      .update(campos as never)
      .eq("id", usuarioId);
    if (error) throw error;
    await queryClient.invalidateQueries({ queryKey: ["motoboy", usuarioId] });
  };
}
