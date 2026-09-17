# Corre.ai Motoboy — app do entregador

App completo para motociclistas (corridas de passageiro e entregas), com mapa em tela cheia, status online/offline, recebimento de solicitações em tempo real e histórico. Backend próprio já preparado para o futuro app do cliente/estabelecimento usar a mesma base.

## Visual
Preto, branco, vermelho e cinza. Botões de ação principal em vermelho, fundo escuro, tipografia sóbria. Único ponto verde: o contador de faturamento do dia.

## O que será construído

**Cadastro e acesso**
- Cadastro: nome, telefone, e-mail, senha, chave Pix, modelo e placa da moto.
- Login por e-mail e senha. Só quem está logado acessa o app.

**Tela inicial (Home)**
- Mapa ocupando a tela inteira com a posição do motoboy.
- Topo: logo e acesso ao perfil.
- Canto superior esquerdo: contador fixo de faturamento do dia em verde, somando cada corrida finalizada e zerando à meia-noite.
- Botão para recentralizar o mapa.
- Painel inferior com o status atual e o botão "Ficar online" / "Ficar offline".

**GPS obrigatório**
- Só é possível ficar online com a localização ativa e sendo enviada continuamente.
- Se a localização for perdida ou negada durante o turno, o motoboy volta para offline automaticamente, com aviso na tela.

**Recebendo uma corrida**
- Card sobre o mapa com tipo (passageiro ou entrega), origem, destino, valor e forma de pagamento. Passageiro sempre R$ 8,00.
- Botões Recusar e Aceitar.
- O aceite é disputado: apenas o primeiro motoboy leva a corrida. Quem chegar depois vê "essa corrida não está mais disponível" e o card some sozinho.
- Chegada de corrida com alerta sonoro próprio.

**Corrida de passageiro**
A caminho → chegou (contagem regressiva de 3 minutos) → se o passageiro não aparecer, registra ausência sem cobrança e encerra; se aparecer, "Iniciar corrida" → "Corrida finalizada" com a forma de pagamento (Pix ou dinheiro).

**Entrega**
A caminho da retirada → "Cheguei" → "Entrega retirada" → a caminho do destino → "Entrega realizada".
Destinatário ausente: espera de 5 minutos, o estabelecimento é avisado em tempo real e decide entre retorno do pedido ou novo endereço. No retorno, soma R$ 4,00 extras ao faturamento do dia.

**Comprovante**
O app não processa pagamento. O comprovante enviado pelo cliente aparece somente para o motoboy daquela corrida, para conferência antes de finalizar.

**Perfil**
Histórico de corridas, dados da conta (nome, telefone, e-mail, moto, chave Pix) e alteração de senha. Sem ganhos do dia aqui — eles ficam na tela inicial.

**Painel de teste**
Uma tela separada para criar corridas de teste e simular pedidos chegando, já que o app do cliente ainda não existe.

## Detalhes técnicos
- Lovable Cloud (Supabase) ativado: tabelas `motoboys` (perfil, moto, Pix, status, localização), `corridas` (tipo, origem, destino, valor, pagamento, status, motoboy_id, timestamps, motivo de ausência/retorno) e `comprovantes` (ligado à corrida, visível só ao motoboy responsável). RLS em todas, com GRANTs explícitos.
- Aceite atômico: `update ... where id = X and motoboy_id is null`, retornando 0 linhas para o perdedor. Corridas disponíveis e mudanças de status via Supabase Realtime.
- Mapa: MapLibre GL com tiles públicos (sem chave de API), carregado só no cliente.
- Lógica de negócio isolada em hooks/serviços (`src/features/...`), separada dos componentes de tela, para o app do cliente reaproveitar tipos e regras.
- Rotas: `/auth`, `/` (home, protegida), `/perfil`, `/corrida/$id`, `/simulador`.
- Notificações: som + notificação do navegador enquanto online; a camada é escrita de forma que o Capacitor (push nativo em segundo plano) substitua só o adaptador. Push nativo real em background exige o empacotamento Capacitor e build nas lojas — fora do ambiente web.
- Projeto já organizado para empacotar com Capacitor depois (iOS/Android na mesma base).

## Suposições
- Geolocalização e endereços digitados manualmente no simulador (sem serviço pago de busca de endereços).
- Valores: passageiro R$ 8,00 fixo; entrega com valor informado na criação; retorno +R$ 4,00.
