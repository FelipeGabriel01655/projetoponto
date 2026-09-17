import { supabase } from "@/integrations/supabase/client";

/**
 * Cria o cadastro do motoboy no primeiro acesso quando ele ainda não existe
 * (por exemplo quando o e-mail precisou ser confirmado antes de entrar).
 */
export async function garantirPerfil(): Promise<void> {
  const { data } = await supabase.auth.getUser();
  const usuario = data.user;
  if (!usuario) return;

  const { data: existente } = await supabase
    .from("motoboys")
    .select("id")
    .eq("id", usuario.id)
    .maybeSingle();
  if (existente) return;

  const meta = (usuario.user_metadata ?? {}) as Record<string, string | undefined>;
  await supabase.from("motoboys").insert({
    id: usuario.id,
    nome: meta["nome"] || usuario.email?.split("@")[0] || "Motoboy",
    telefone: meta["telefone"] ?? "",
    email: usuario.email ?? "",
    pix_key: meta["pix_key"] ?? "",
    moto_modelo: meta["moto_modelo"] ?? "",
    moto_placa: meta["moto_placa"] ?? "",
  } as never);
}
