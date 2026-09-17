# Diagnóstico: mapa em branco depois do F5

Nenhum código, estilo, provedor ou funcionalidade foi alterado.

## O que foi medido

Rodei o **componente de mapa real do app**, dentro do app em execução, três vezes: primeira abertura, F5 e segundo F5. Em cada ciclo capturei rede, console, estado do canvas e do WebGL, e uma captura de tela.

| Medição | 1ª abertura | Após F5 | Após 2º F5 |
| --- | --- | --- | --- |
| Estilo `bright` (openfreemap) | 1 requisição, 200 | 1, 200 | 1, 200 |
| Índice de tiles (`/planet`) | 1, 200 | 1, 200 | 1, 200 |
| Tiles vetoriais (`.pbf`) | 4, 200 | 4, 200 | 4, 200 |
| Fontes (glyphs) | 3, 200 | 3, 200 | 3, 200 |
| Sprites/ícones | 2, 200 | 2, 200 | 2, 200 |
| Respostas com erro (≥400) | nenhuma | nenhuma | nenhuma |
| Requisições bloqueadas / CORS | nenhuma | nenhuma | nenhuma |
| Erro de CSS da biblioteca (404 antigo) | não ocorre mais | não ocorre | não ocorre |
| Contexto gráfico (WebGL) perdido | não | não | não |
| Canvas | 432×600, filtro `none` | igual | igual |
| Marcador vermelho | 1, no lugar | 1 | 1 |
| Erros no console | nenhum | nenhum | nenhum |
| Ruas e nomes na captura | sim | sim | sim |

Avisos (inofensivos, iguais nos três ciclos): WebGL por software no ambiente de teste e três filtros de camadas de placas de rodovia dos EUA.

Capturas: `/tmp/browser/diag3/x_first.png`, `x_reload1.png`, `x_reload2.png` — visualmente idênticas, com "Rua Tabatinguera", "Largo Pateo Do Colégio", "Avenida Da Liberdade", "Sé" e o ponto vermelho centrado.

## Limitação importante desta medição

A tela inicial exige login, e **este projeto não tem backend (Lovable Cloud) ativo neste ambiente**: qualquer acesso a `/` é redirecionado para `/auth`, e não consegui criar uma sessão de teste. Por isso o mapa foi medido com o componente real, mas **fora da Home**, sem os cards, indicadores, atualização de GPS e as consultas de corridas que rodam em volta dele.

Os registros do seu preview (console, erros e rede) chegaram **vazios** nesta mensagem, então também não tenho evidência da sua sessão.

Conclusão honesta: **não consegui reproduzir a falha** e, com o que medi, não é possível apontar causa raiz. O que ficou descartado: provedor, estilo `bright`, tiles, fontes, sprites, CORS, worker, CSS da biblioteca e perda de contexto gráfico — todos saudáveis e idênticos antes e depois do reload.

## Hipóteses ainda em aberto (não confirmadas)

1. **Algo que só existe na Home.** Após o F5, a Home volta a montar tudo ao mesmo tempo (perfil, GPS, corridas). Uma nova montagem do mapa logo após a primeira, ou uma remontagem causada por mudança de estado, pode deixar um mapa "morto" na tela enquanto o marcador (que é HTML comum) continua visível.
2. **Ambiente do seu navegador.** WebGL por software, memória baixa ou vários mapas ao mesmo tempo podem gerar o mesmo sintoma; o app hoje só se recupera quando o navegador avisa a perda de contexto, não quando o desenho falha em silêncio.
3. **Cache do navegador após reload** servindo o estilo do cache em um momento em que o mapa ainda não tem tamanho — não observado aqui, mas não descartável no seu aparelho.

## Próximo passo sugerido (nada será feito sem sua autorização)

Para transformar hipótese em causa confirmada, o caminho mais curto é conseguir reproduzir na Home real. Preciso de uma destas coisas:

- ativar o backend (Lovable Cloud) neste ambiente para eu logar e testar a Home de verdade; ou
- você reproduzir o problema e me mandar: aparelho/navegador, se acontece em todo F5 ou às vezes, e o que aparece no console nesse momento; ou
- autorizar apenas um registro temporário de diagnóstico no mapa (log de montagem/desmontagem e de falha de desenho), para que a próxima ocorrência fique documentada.
