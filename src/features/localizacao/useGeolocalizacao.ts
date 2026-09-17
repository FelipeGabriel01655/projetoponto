import { useCallback, useEffect, useRef, useState } from "react";

export interface Posicao {
  lat: number;
  lng: number;
  precisao: number;
}

interface Retorno {
  posicao: Posicao | null;
  erro: string | null;
  rastreando: boolean;
  iniciar: () => void;
  parar: () => void;
}

/**
 * Rastreamento contínuo do GPS. A tela Home usa o `erro` para derrubar o
 * motoboy para offline automaticamente quando a localização é perdida.
 */
export function useGeolocalizacao(): Retorno {
  const [posicao, setPosicao] = useState<Posicao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [rastreando, setRastreando] = useState(false);
  const watchId = useRef<number | null>(null);

  const parar = useCallback(() => {
    if (watchId.current !== null && typeof navigator !== "undefined") {
      navigator.geolocation.clearWatch(watchId.current);
      watchId.current = null;
    }
    setRastreando(false);
  }, []);

  const iniciar = useCallback(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) {
      setErro("Este aparelho não oferece localização.");
      return;
    }
    if (watchId.current !== null) return;
    setErro(null);
    watchId.current = navigator.geolocation.watchPosition(
      (pos) => {
        setErro(null);
        setRastreando(true);
        setPosicao({
          lat: pos.coords.latitude,
          lng: pos.coords.longitude,
          precisao: pos.coords.accuracy,
        });
      },
      (falha) => {
        setRastreando(false);
        setErro(
          falha.code === falha.PERMISSION_DENIED
            ? "Permissão de localização negada. Ative o GPS para ficar online."
            : "Não foi possível obter sua localização.",
        );
      },
      { enableHighAccuracy: true, maximumAge: 5000, timeout: 20000 },
    );
  }, []);

  useEffect(() => parar, [parar]);

  return { posicao, erro, rastreando, iniciar, parar };
}
