# Motoboy Swift

PROMPT MESTRE - APP CORRE.AI MOTOBOY (LOVABLE)

CONTEXTO GERAL
Criar um aplicativo completo chamado "Corre.ai Motoboy", voltado para motociclistas que realizam corridas de passageiros e entregas. Este e o app do lado do motoboy. Existira futuramente um segundo app, "Corre.ai", voltado ao cliente/estabelecimento, que compartilhara o MESMO backend Supabase, permitindo comunicacao em tempo real entre os dois lados.

Gerar o projeto completo em uma unica geracao: todas as telas, estados, fluxos, componentes e integracao com Supabase. O mapa deve ser o elemento central da experiencia visual.

IDENTIDADE VISUAL
Paleta fixa: preto, branco, vermelho e cinza. Nao usar neons ou cores vibrantes fora dessa paleta. Interface sobria, moderna, com bom contraste. Botoes de acao principal (ex: "Ficar online") em vermelho.

BACKEND (SUPABASE)
Usar Supabase como banco de dados e backend desde o inicio, ja estruturado para ser compartilhado futuramente com o app do cliente/estabelecimento "Corre.ai". Estruturar tabelas para: motoboys (perfil, dados da moto, chave Pix, status online/offline, localizacao atual), corridas (tipo passageiro ou entrega, origem, destino, valor, forma de pagamento, status, motoboy_id responsavel, timestamps), e comprovantes (referencia a corrida, anexado pelo cliente, visivel apenas ao motoboy responsavel).

Regra critica de concorrencia: o aceite de uma corrida deve ser atomico. Implementar via update condicional no Supabase (ex: update na linha da corrida com clausula where motoboy_id is null), garantindo que apenas o primeiro motoboy que aceitar consiga vincular a corrida a si mesmo. Qualquer outro motoboy que tentar aceitar depois deve receber erro e a corrida deve sumir da tela dele automaticamente.

Como o app do estabelecimento ainda nao existe, criar tambem um painel simples (pode ser uma tela interna ou rota separada) para inserir corridas de teste diretamente no banco, simulando solicitacoes chegando, para validar o fluxo do motoboy de forma independente.

CADASTRO E AUTENTICACAO
Tela de cadastro com: nome completo, telefone, e-mail, senha, chave Pix (armazenada de forma protegida), dados da moto (modelo, placa). Login com e-mail e senha via Supabase Auth.

PERMISSAO DE GPS
GPS e obrigatorio. O motoboy so pode ficar online se a permissao de localizacao estiver ativa e sendo compartilhada em tempo real. Se o GPS for desativado enquanto online, o motoboy deve ser automaticamente colocado offline.

TELA HOME
Mapa em tela cheia como fundo principal. Barra superior com logo do app e icone de perfil. No canto superior esquerdo da tela, um contador fixo de faturamento do dia, com simbolo de cifrao e numeros em verde, que soma o valor de cada corrida (passageiro ou entrega) assim que ela e finalizada, e zera automaticamente a meia-noite. Botao de recentralizar mapa na posicao do motoboy. Painel inferior flutuante mostrando status atual, offline ou online, com botao principal "Ficar online" em vermelho (e "Ficar offline" quando ja online).

RECEBIMENTO DE SOLICITACAO
Quando uma corrida e recebida, exibir um card flutuante sobreposto ao mapa contendo: tipo da solicitacao (passageiro ou entrega), endereco de origem, endereco de destino, valor, forma de pagamento. Passageiro tem valor fixo de 8 reais. Botoes "Recusar" e "Aceitar". Ao aceitar, tentar o update atomico no Supabase; se outro motoboy ja aceitou, mostrar mensagem informando que a corrida nao esta mais disponivel e remover o card.

NOTIFICACOES
Notificacoes push reais, funcionando inclusive em segundo plano, disparadas apenas quando o motoboy estiver com status online ativo dentro do app. Toda notificacao de nova corrida ou de alerta (como destinatario ausente) deve tocar um efeito sonoro proprio para facilitar a identificacao imediata.

FLUXO PASSAGEIRO
Sequencia de estados apos aceite: "A caminho" (motoboy se dirige ate a origem) - ao chegar, iniciar contagem regressiva de 3 minutos aguardando o passageiro - se o passageiro nao for localizado nesse tempo, registrar "ausencia" no sistema, sem nenhuma cobranca adicional, e encerrar a corrida - se o passageiro for encontrado, motoboy aciona "Iniciar corrida", segue ate o destino, e finaliza com "Corrida finalizada", registrando a forma de pagamento (Pix ou dinheiro).

FLUXO ENTREGA
Sequencia de estados apos aceite: "A caminho da retirada" - botao "Cheguei" ao chegar no estabelecimento - "Entrega retirada" apos confirmar retirada - "A caminho do destino" - finaliza em "Entrega realizada", atualizando o status para o solicitante em tempo real. Se o destinatario nao estiver presente na entrega, aguardar 5 minutos, notificar o estabelecimento (via Supabase realtime, refletido no futuro app do cliente), que decide entre solicitar o retorno do pedido ou indicar novo destino. Caso seja retorno, o motoboy leva o pedido de volta ao estabelecimento e recebe uma taxa adicional de 4 reais, paga pelo cliente, somada ao contador de faturamento do dia.

COMPROVANTE E PAGAMENTO
O app nao processa pagamentos. O comprovante de pagamento e anexado pelo CLIENTE no aplicativo dele (Corre.ai), e fica visivel apenas para o motoboy responsavel por aquela corrida especifica, dentro do app Corre.ai Motoboy, para que ele possa conferir e confirmar manualmente o recebimento do valor em seu aplicativo bancario antes de finalizar.

PERFIL DO MOTOBOY
Tela de perfil enxuta contendo: historico de corridas realizadas, dados da conta (nome, telefone, e-mail, dados da moto, chave Pix), e opcao de alterar senha. Os ganhos do dia NAO ficam nesta tela, pois ja aparecem fixos no contador da tela Home.

ARQUITETURA E PORTABILIDADE
Estruturar o codigo de forma desacoplada (logica de negocio separada da camada visual), utilizando React, para permitir evolucao futura sem reescrever o projeto do zero. Preparar o projeto para ser posteriormente empacotado com Capacitor, permitindo publicacao nativa tanto na Apple App Store quanto na Google Play Store, mantendo a mesma base de codigo.

ENTREGA
Ao final da geracao, disponibilizar a exportacao completa do codigo do projeto.

This project was built with [Lovable](https://lovable.dev).

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/6958355c-a5b5-4ec2-bea9-eea8ebc9fcdc).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
