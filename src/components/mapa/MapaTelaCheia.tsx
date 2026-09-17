import { Suspense, lazy } from "react";
import { ClientOnly } from "@tanstack/react-router";
import type { PontoMapa } from "./Mapa";

const Mapa = lazy(() => import("./Mapa"));

interface Props {
  posicao: { lat: number; lng: number } | null;
  pontos?: PontoMapa[];
  recentralizarToken?: number;
}

function Esqueleto() {
  return <div className="absolute inset-0 bg-secondary" />;
}

export function MapaTelaCheia(props: Props) {
  return (
    <ClientOnly fallback={<Esqueleto />}>
      <Suspense fallback={<Esqueleto />}>
        <Mapa {...props} />
      </Suspense>
    </ClientOnly>
  );
}
