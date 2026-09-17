import { useCallback, useEffect, useRef, useState } from "react";
import * as maplibregl from "maplibre-gl";

export interface PontoMapa {
  lat: number;
  lng: number;
  cor: "vermelho" | "branco" | "cinza";
  rotulo?: string;
}

interface Props {
  posicao: { lat: number; lng: number } | null;
  pontos?: PontoMapa[];
  /** Muda de valor para pedir o recentralizar no motoboy. */
  recentralizarToken?: number;
}

const CORES: Record<PontoMapa["cor"], string> = {
  vermelho: "#e11d2e",
  branco: "#ffffff",
  cinza: "#8a8a8a",
};

/**
 * Basemap claro: estilo vetorial "bright" do OpenFreeMap, gratuito e sem chave
 * de API. Foi o estilo claro do OpenFreeMap com os nomes de rua de maior
 * contraste no teste lado a lado com "liberty" e "positron" (este último quase
 * invisível no celular), então ruas, nomes e pontos de referência ficam
 * legíveis.
 *
 * O CSS da maplibre é importado em src/styles.css (e não aqui), porque o
 * import dentro do módulo TS era resolvido para a pasta do otimizador do Vite
 * e devolvia 404 no preview.
 */
const ESTILO = "https://tiles.openfreemap.org/styles/bright";

export default function Mapa({ posicao, pontos = [], recentralizarToken = 0 }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcadorMotoboy = useRef<maplibregl.Marker | null>(null);
  const marcadores = useRef<maplibregl.Marker[]>([]);
  const jaCentralizou = useRef(false);
  /** Centro/zoom preservados entre recriações do mapa (perda de contexto WebGL). */
  const ultimaVista = useRef<{ center: [number, number]; zoom: number; bearing: number; pitch: number } | null>(
    null,
  );
  /** Incrementa para forçar a recriação do mapa quando o contexto WebGL volta. */
  const [versao, setVersao] = useState(0);

  const recriar = useCallback(() => setVersao((valor) => valor + 1), []);

  useEffect(() => {
    if (!container.current) return;

    const vista = ultimaVista.current;
    const instancia = new maplibregl.Map({
      container: container.current,
      style: ESTILO,
      center: vista?.center ?? [posicao?.lng ?? -46.6333, posicao?.lat ?? -23.5505],
      zoom: vista?.zoom ?? (posicao ? 15 : 11),
      bearing: vista?.bearing ?? 0,
      pitch: vista?.pitch ?? 0,
      attributionControl: false,
    });
    mapa.current = instancia;
    // Marcadores pertencem à instância antiga; serão recriados pelos efeitos.
    marcadorMotoboy.current = null;
    marcadores.current = [];

    const guardarVista = () => {
      const centro = instancia.getCenter();
      ultimaVista.current = {
        center: [centro.lng, centro.lat],
        zoom: instancia.getZoom(),
        bearing: instancia.getBearing(),
        pitch: instancia.getPitch(),
      };
    };
    instancia.on("moveend", guardarVista);
    instancia.on("zoomend", guardarVista);

    // Registro de falhas de carregamento/renderização (tiles, glyphs, sprites).
    const aoErrar = (evento: maplibregl.ErrorEvent) => {
      console.error("[mapa] erro do MapLibre:", evento.error?.message ?? evento.error, evento);
    };
    instancia.on("error", aoErrar);

    const canvas = instancia.getCanvas();

    const aoPerderContexto = (evento: Event) => {
      // preventDefault permite que o navegador restaure o contexto depois.
      evento.preventDefault();
      guardarVista();
      console.warn("[mapa] contexto WebGL perdido; aguardando restauração.");
    };
    const aoRestaurarContexto = () => {
      console.warn("[mapa] contexto WebGL restaurado; recriando o mapa.");
      recriar();
    };
    canvas.addEventListener("webglcontextlost", aoPerderContexto);
    canvas.addEventListener("webglcontextrestored", aoRestaurarContexto);

    // Ao voltar para a aba/preview, a área pode ter mudado de tamanho.
    const aoVoltar = () => {
      if (document.visibilityState !== "visible") return;
      instancia.resize();
      const gl = canvas.getContext("webgl2") ?? canvas.getContext("webgl");
      if (gl && gl.isContextLost()) {
        console.warn("[mapa] contexto WebGL ainda perdido ao reativar; recriando o mapa.");
        recriar();
      }
    };
    document.addEventListener("visibilitychange", aoVoltar);
    window.addEventListener("focus", aoVoltar);
    window.addEventListener("pageshow", aoVoltar);

    return () => {
      canvas.removeEventListener("webglcontextlost", aoPerderContexto);
      canvas.removeEventListener("webglcontextrestored", aoRestaurarContexto);
      document.removeEventListener("visibilitychange", aoVoltar);
      window.removeEventListener("focus", aoVoltar);
      window.removeEventListener("pageshow", aoVoltar);
      instancia.remove();
      if (mapa.current === instancia) mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [versao, recriar]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia || !posicao) return;

    if (!marcadorMotoboy.current) {
      const elemento = document.createElement("div");
      elemento.style.cssText =
        "width:18px;height:18px;border-radius:9999px;background:#e11d2e;border:3px solid #fff;box-shadow:0 0 0 6px rgba(225,29,46,.25)";
      marcadorMotoboy.current = new maplibregl.Marker({ element: elemento })
        .setLngLat([posicao.lng, posicao.lat])
        .addTo(instancia);
    } else {
      marcadorMotoboy.current.setLngLat([posicao.lng, posicao.lat]);
    }

    if (!jaCentralizou.current) {
      jaCentralizou.current = true;
      instancia.easeTo({ center: [posicao.lng, posicao.lat], zoom: 15 });
    }
  }, [posicao, versao]);

  useEffect(() => {
    const instancia = mapa.current;
    if (!instancia) return;
    marcadores.current.forEach((m) => m.remove());
    marcadores.current = pontos.map((ponto) => {
      const elemento = document.createElement("div");
      elemento.style.cssText = `width:14px;height:14px;border-radius:3px;background:${CORES[ponto.cor]};border:2px solid #111`;
      elemento.title = ponto.rotulo ?? "";
      return new maplibregl.Marker({ element: elemento })
        .setLngLat([ponto.lng, ponto.lat])
        .addTo(instancia);
    });
  }, [pontos, versao]);

  useEffect(() => {
    if (!recentralizarToken || !mapa.current || !posicao) return;
    mapa.current.easeTo({ center: [posicao.lng, posicao.lat], zoom: 16 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recentralizarToken]);

  // O CSS da maplibre define `.maplibregl-map { position: relative }`, o que
  // anulava o `absolute inset-0` do container e o deixava com altura 0 (mapa
  // invisível). Por isso o posicionamento fica no wrapper e o container só
  // preenche 100% dele.
  return (
    <div className="absolute inset-0">
      <div ref={container} className="h-full w-full" />
    </div>
  );
}
