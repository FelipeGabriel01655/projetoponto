import { useEffect, useRef, useState } from "react";
import { createFileRoute, redirect, useNavigate, Link } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { Crosshair, LoaderCircle, Navigation, UserRound } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { MapaTelaCheia } from "@/components/mapa/MapaTelaCheia";
import { CardSolicitacao } from "@/components/corridas/CardSolicitacao";
import { useGeolocalizacao } from "@/features/localizacao/useGeolocalizacao";
import { useSessao, usePerfilMotoboy, useAtualizarMotoboy } from "@/features/motoboy/useMotoboy";
import { garantirPerfil } from "@/features/motoboy/garantirPerfil";
import { useCorridaAtiva, useCorridasDisponiveis, useGanhosDoDia } from "@/features/corridas/hooks";
import { aceitarCorrida, ERRO_CORRIDA_INDISPONIVEL } from "@/features/corridas/api";
import { liberarAudio, notificar, pedirPermissaoNotificacao } from "@/features/notificacoes/alertas";
import { formatarBRL, STATUS_LABEL } from "@/features/corridas/types";

export const Route = createFileRoute("/")({
  ssr: false,
  beforeLoad: async () => {
    const { data, error } = await supabase.auth.getUser();
    if (error || !data.user) throw redirect({ to: "/auth" });
  },
  head: () => ({
    meta: [
      { title: "Corre.ai Motoboy | Corridas e entregas" },
      {
        name: "description",
        content:
          "Fique online, receba corridas de passageiro e entregas em tempo real e acompanhe seu faturamento do dia.",
      },
      { property: "og:title", content: "Corre.ai Motoboy" },
      {
        property: "og:description",
        content: "Receba corridas de passageiro e entregas em tempo real com o Corre.ai Motoboy.",
      },
    ],
  }),
  component: Home,
});

function Home() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { usuarioId } = useSessao();
  const { data: perfil } = usePerfilMotoboy(usuarioId);
  const atualizarMotoboy = useAtualizarMotoboy(usuarioId);
  const { posicao, erro, iniciar, parar } = useGeolocalizacao();

  const [online, setOnline] = useState(false);
  const [aceitando, setAceitando] = useState(false);
  const [recusadas, setRecusadas] = useState<string[]>([]);
  const [tokenCentralizar, setTokenCentralizar] = useState(0);
  const ultimoEnvio = useRef(0);

  const { data: corridaAtiva } = useCorridaAtiva(usuarioId);
  const { data: disponiveis = [] } = useCorridasDisponiveis(online && !corridaAtiva);
  const { data: ganhos = 0 } = useGanhosDoDia(usuarioId);

  useEffect(() => {
    void garantirPerfil().then(() => queryClient.invalidateQueries({ queryKey: ["motoboy"] }));
  }, [queryClient]);

  // GPS obrigatório: sem localização, o motoboy volta para offline.
  useEffect(() => {
    if (online && erro) {
      setOnline(false);
      parar();
      void atualizarMotoboy({ online: false });
      notificar("Você ficou offline", erro, "aviso");
      toast.error(erro);
    }
  }, [online, erro, parar, atualizarMotoboy]);

  // Compartilhamento da localização em tempo real enquanto online.
  useEffect(() => {
    if (!online || !posicao || !usuarioId) return;
    const agora = Date.now();
    if (agora - ultimoEnvio.current < 10000) return;
    ultimoEnvio.current = agora;
    void supabase
      .from("motoboys")
      .update({
        lat: posicao.lat,
        lng: posicao.lng,
        localizacao_atualizada_em: new Date().toISOString(),
      } as never)
      .eq("id", usuarioId);
  }, [online, posicao, usuarioId]);

  async function alternarStatus() {
    if (online) {
      setOnline(false);
      parar();
      await atualizarMotoboy({ online: false });
      toast("Você está offline.");
      return;
    }

    liberarAudio();
    await pedirPermissaoNotificacao();
    iniciar();

    const permitido = await new Promise<boolean>((resolver) => {
      if (typeof navigator === "undefined" || !navigator.geolocation) return resolver(false);
      navigator.geolocation.getCurrentPosition(
        () => resolver(true),
        () => resolver(false),
        { enableHighAccuracy: true, timeout: 15000 },
      );
    });

    if (!permitido) {
      toast.error("Ative a permissão de localização para ficar online.");
      parar();
      return;
    }

    setOnline(true);
    await atualizarMotoboy({ online: true });
    toast.success("Você está online. Boas corridas!");
  }

  async function aceitar(corridaId: string) {
    setAceitando(true);
    try {
      await aceitarCorrida(corridaId);
      toast.success("Corrida aceita!");
      await queryClient.invalidateQueries({ queryKey: ["corrida-ativa"] });
      void queryClient.invalidateQueries({ queryKey: ["corridas-disponiveis"] });
    } catch (falha) {
      const mensagem = falha instanceof Error ? falha.message : "";
      if (mensagem.includes(ERRO_CORRIDA_INDISPONIVEL)) {
        toast.error("Essa corrida não está mais disponível.");
        setRecusadas((atual) => [...atual, corridaId]);
        void queryClient.invalidateQueries({ queryKey: ["corridas-disponiveis"] });
      } else {
        toast.error("Não foi possível aceitar a corrida.");
      }
    } finally {
      setAceitando(false);
    }
  }


  const solicitacao = disponiveis.find((corrida) => !recusadas.includes(corrida.id));
  const pontos = solicitacao
    ? [
        ...(solicitacao.origem_lat && solicitacao.origem_lng
          ? [{ lat: solicitacao.origem_lat, lng: solicitacao.origem_lng, cor: "branco" as const }]
          : []),
        ...(solicitacao.destino_lat && solicitacao.destino_lng
          ? [{ lat: solicitacao.destino_lat, lng: solicitacao.destino_lng, cor: "vermelho" as const }]
          : []),
      ]
    : [];

  return (
    <main className="relative h-dvh w-full overflow-hidden bg-background">
      <MapaTelaCheia posicao={posicao} pontos={pontos} recentralizarToken={tokenCentralizar} />

      <header className="glass-panel absolute inset-x-0 top-0 z-20 flex items-center justify-between px-4 py-3">
        <p className="text-lg font-black tracking-tight">
          CORRE<span className="text-primary">.AI</span>
          <span className="ml-2 text-[10px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
            Motoboy
          </span>
        </p>
        <Link
          to="/perfil"
          aria-label="Abrir perfil"
          className="flex size-10 items-center justify-center rounded-full border border-border bg-secondary"
        >
          <UserRound className="size-5" />
        </Link>
      </header>

      <div className="glass-panel absolute left-4 top-20 z-20 rounded-xl px-3 py-2">
        <p className="text-[10px] uppercase tracking-widest text-muted-foreground">Hoje</p>
        <p className="text-xl font-black text-success">{formatarBRL(ganhos)}</p>
      </div>

      <button
        type="button"
        onClick={() => setTokenCentralizar((valor) => valor + 1)}
        aria-label="Recentralizar mapa"
        className="glass-panel absolute right-4 top-20 z-20 flex size-11 items-center justify-center rounded-full"
      >
        <Crosshair className="size-5" />
      </button>

      <div className="absolute inset-x-0 bottom-0 z-20 space-y-3 p-4 pb-6">
        {solicitacao && !corridaAtiva && (
          <CardSolicitacao
            corrida={solicitacao}
            processando={aceitando}
            onAceitar={() => void aceitar(solicitacao.id)}
            onRecusar={() => setRecusadas((atual) => [...atual, solicitacao.id])}
          />
        )}

        {corridaAtiva ? (
          <Link
            to="/corrida/$id"
            params={{ id: corridaAtiva.id }}
            className="glass-panel flex items-center justify-between rounded-2xl p-4"
          >
            <div>
              <p className="text-[11px] uppercase tracking-widest text-muted-foreground">
                {corridaAtiva.tipo === "passageiro" ? "Corrida de passageiro" : "Entrega"}
              </p>
              <p className="text-lg font-bold">{STATUS_LABEL[corridaAtiva.status]}</p>
            </div>
            <Navigation className="size-6 text-primary" />
          </Link>
        ) : (
          <div className="glass-panel rounded-2xl p-4">
            <div className="mb-3 flex items-center gap-2">
              <span
                className={`size-2.5 rounded-full ${online ? "bg-success" : "bg-muted-foreground"}`}
              />
              <p className="text-sm font-semibold">
                {online ? "Você está online" : "Você está offline"}
              </p>
              {online && !posicao && (
                <LoaderCircle className="ml-auto size-4 animate-spin text-muted-foreground" />
              )}
            </div>
            <p className="mb-4 text-xs text-muted-foreground">
              {online
                ? "Aguardando novas solicitações na sua região."
                : "Ative a localização para receber corridas."}
            </p>
            <Button
              className="h-14 w-full text-base font-black uppercase tracking-wide"
              variant={online ? "secondary" : "default"}
              onClick={() => void alternarStatus()}
            >
              {online ? "Ficar offline" : "Ficar online"}
            </Button>
            {perfil && (
              <p className="mt-3 text-center text-xs text-muted-foreground">
                {perfil.nome} · {perfil.moto_modelo} {perfil.moto_placa}
              </p>
            )}
          </div>
        )}
      </div>
    </main>
  );
}
