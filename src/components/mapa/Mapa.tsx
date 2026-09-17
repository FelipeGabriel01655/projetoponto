import { useEffect, useRef } from "react";
import * as maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

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
 */
const ESTILO = "https://tiles.openfreemap.org/styles/bright";



export default function Mapa({ posicao, pontos = [], recentralizarToken = 0 }: Props) {
  const container = useRef<HTMLDivElement | null>(null);
  const mapa = useRef<maplibregl.Map | null>(null);
  const marcadorMotoboy = useRef<maplibregl.Marker | null>(null);
  const marcadores = useRef<maplibregl.Marker[]>([]);
  const jaCentralizou = useRef(false);

  useEffect(() => {
    if (!container.current || mapa.current) return;
    mapa.current = new maplibregl.Map({
      container: container.current,
      style: ESTILO,
      center: [posicao?.lng ?? -46.6333, posicao?.lat ?? -23.5505],
      zoom: posicao ? 15 : 11,
      attributionControl: false,
    });
    return () => {
      mapa.current?.remove();
      mapa.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

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
  }, [posicao]);

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
  }, [pontos]);

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
