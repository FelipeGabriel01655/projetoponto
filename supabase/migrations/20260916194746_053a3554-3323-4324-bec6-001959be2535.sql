CREATE TABLE public.motoboys (
  id uuid PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  nome text NOT NULL,
  telefone text NOT NULL DEFAULT '',
  email text NOT NULL DEFAULT '',
  pix_key text NOT NULL DEFAULT '',
  moto_modelo text NOT NULL DEFAULT '',
  moto_placa text NOT NULL DEFAULT '',
  online boolean NOT NULL DEFAULT false,
  lat double precision,
  lng double precision,
  localizacao_atualizada_em timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.motoboys TO authenticated;
GRANT ALL ON public.motoboys TO service_role;
ALTER TABLE public.motoboys ENABLE ROW LEVEL SECURITY;

CREATE POLICY "motoboy_select_own" ON public.motoboys FOR SELECT TO authenticated USING (id = auth.uid());
CREATE POLICY "motoboy_insert_own" ON public.motoboys FOR INSERT TO authenticated WITH CHECK (id = auth.uid());
CREATE POLICY "motoboy_update_own" ON public.motoboys FOR UPDATE TO authenticated USING (id = auth.uid()) WITH CHECK (id = auth.uid());

CREATE TABLE public.corridas (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  tipo text NOT NULL CHECK (tipo IN ('passageiro','entrega')),
  status text NOT NULL DEFAULT 'pendente',
  origem_endereco text NOT NULL,
  origem_lat double precision,
  origem_lng double precision,
  destino_endereco text NOT NULL,
  destino_lat double precision,
  destino_lng double precision,
  valor numeric(10,2) NOT NULL DEFAULT 0,
  taxa_retorno numeric(10,2) NOT NULL DEFAULT 0,
  forma_pagamento text NOT NULL DEFAULT 'dinheiro' CHECK (forma_pagamento IN ('pix','dinheiro')),
  motoboy_id uuid REFERENCES public.motoboys(id) ON DELETE SET NULL,
  solicitante_nome text NOT NULL DEFAULT '',
  solicitante_id uuid,
  observacoes text,
  ausencia boolean NOT NULL DEFAULT false,
  decisao_estabelecimento text,
  novo_destino_endereco text,
  created_at timestamptz NOT NULL DEFAULT now(),
  aceita_em timestamptz,
  iniciada_em timestamptz,
  finalizada_em timestamptz,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX corridas_pendentes_idx ON public.corridas (status) WHERE motoboy_id IS NULL;
CREATE INDEX corridas_motoboy_idx ON public.corridas (motoboy_id, finalizada_em);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.corridas TO authenticated;
GRANT ALL ON public.corridas TO service_role;
ALTER TABLE public.corridas ENABLE ROW LEVEL SECURITY;

CREATE POLICY "corridas_select_disponiveis_ou_minhas" ON public.corridas FOR SELECT TO authenticated
  USING (motoboy_id = auth.uid() OR (motoboy_id IS NULL AND status = 'pendente'));
CREATE POLICY "corridas_insert_autenticado" ON public.corridas FOR INSERT TO authenticated WITH CHECK (true);
CREATE POLICY "corridas_update_minhas" ON public.corridas FOR UPDATE TO authenticated
  USING (motoboy_id = auth.uid()) WITH CHECK (motoboy_id = auth.uid());

CREATE TABLE public.comprovantes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  corrida_id uuid NOT NULL REFERENCES public.corridas(id) ON DELETE CASCADE,
  imagem_url text,
  observacao text,
  enviado_em timestamptz NOT NULL DEFAULT now()
);

GRANT SELECT, INSERT, UPDATE, DELETE ON public.comprovantes TO authenticated;
GRANT ALL ON public.comprovantes TO service_role;
ALTER TABLE public.comprovantes ENABLE ROW LEVEL SECURITY;

CREATE POLICY "comprovantes_select_do_motoboy" ON public.comprovantes FOR SELECT TO authenticated
  USING (EXISTS (SELECT 1 FROM public.corridas c WHERE c.id = corrida_id AND c.motoboy_id = auth.uid()));
CREATE POLICY "comprovantes_insert_autenticado" ON public.comprovantes FOR INSERT TO authenticated WITH CHECK (true);

CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER
LANGUAGE plpgsql
SET search_path = public
AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER motoboys_updated_at BEFORE UPDATE ON public.motoboys FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();
CREATE TRIGGER corridas_updated_at BEFORE UPDATE ON public.corridas FOR EACH ROW EXECUTE FUNCTION public.set_updated_at();

CREATE OR REPLACE FUNCTION public.aceitar_corrida(p_corrida_id uuid)
RETURNS public.corridas
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_corrida public.corridas;
BEGIN
  IF auth.uid() IS NULL THEN
    RAISE EXCEPTION 'nao_autenticado';
  END IF;

  UPDATE public.corridas
     SET motoboy_id = auth.uid(),
         status = CASE WHEN tipo = 'passageiro' THEN 'a_caminho' ELSE 'a_caminho_retirada' END,
         aceita_em = now()
   WHERE id = p_corrida_id
     AND motoboy_id IS NULL
     AND status = 'pendente'
  RETURNING * INTO v_corrida;

  IF v_corrida.id IS NULL THEN
    RAISE EXCEPTION 'corrida_indisponivel';
  END IF;

  RETURN v_corrida;
END;
$$;

REVOKE ALL ON FUNCTION public.aceitar_corrida(uuid) FROM public;
GRANT EXECUTE ON FUNCTION public.aceitar_corrida(uuid) TO authenticated;

ALTER PUBLICATION supabase_realtime ADD TABLE public.corridas;
ALTER PUBLICATION supabase_realtime ADD TABLE public.comprovantes;
ALTER PUBLICATION supabase_realtime ADD TABLE public.motoboys;
ALTER TABLE public.corridas REPLICA IDENTITY FULL;
ALTER TABLE public.comprovantes REPLICA IDENTITY FULL;