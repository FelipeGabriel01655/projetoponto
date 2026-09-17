/**
 * Camada de alertas (som + notificação).
 * Isolada de propósito: ao empacotar com Capacitor, basta trocar a
 * implementação de `notificar` por @capacitor/push-notifications,
 * mantendo a mesma interface para o restante do app.
 */

type TipoAlerta = "nova_corrida" | "aviso";

let contexto: AudioContext | null = null;

function obterContexto(): AudioContext | null {
  if (typeof window === "undefined") return null;
  const Ctor = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctor) return null;
  if (!contexto) contexto = new Ctor();
  if (contexto.state === "suspended") void contexto.resume();
  return contexto;
}

function tocarNota(ctx: AudioContext, frequencia: number, inicio: number, duracao: number) {
  const osc = ctx.createOscillator();
  const ganho = ctx.createGain();
  osc.type = "square";
  osc.frequency.value = frequencia;
  ganho.gain.setValueAtTime(0.0001, ctx.currentTime + inicio);
  ganho.gain.exponentialRampToValueAtTime(0.25, ctx.currentTime + inicio + 0.02);
  ganho.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + inicio + duracao);
  osc.connect(ganho).connect(ctx.destination);
  osc.start(ctx.currentTime + inicio);
  osc.stop(ctx.currentTime + inicio + duracao + 0.02);
}

/** Efeito sonoro próprio do app, diferente para corrida e para aviso. */
export function tocarAlerta(tipo: TipoAlerta = "nova_corrida") {
  const ctx = obterContexto();
  if (!ctx) return;
  if (tipo === "nova_corrida") {
    tocarNota(ctx, 880, 0, 0.14);
    tocarNota(ctx, 1320, 0.18, 0.14);
    tocarNota(ctx, 1760, 0.36, 0.22);
  } else {
    tocarNota(ctx, 520, 0, 0.2);
    tocarNota(ctx, 380, 0.24, 0.3);
  }
}

/** Prepara o áudio dentro de um gesto do usuário (exigência dos navegadores). */
export function liberarAudio() {
  obterContexto();
}

export async function pedirPermissaoNotificacao(): Promise<boolean> {
  if (typeof window === "undefined" || !("Notification" in window)) return false;
  if (Notification.permission === "granted") return true;
  if (Notification.permission === "denied") return false;
  const resultado = await Notification.requestPermission();
  return resultado === "granted";
}

export function notificar(titulo: string, corpo: string, tipo: TipoAlerta = "nova_corrida") {
  tocarAlerta(tipo);
  if (typeof window === "undefined" || !("Notification" in window)) return;
  if (Notification.permission !== "granted") return;
  try {
    new Notification(titulo, { body: corpo, tag: "correai", renotify: true } as NotificationOptions);
  } catch {
    /* alguns navegadores exigem service worker; o som já alerta o motoboy */
  }
}
