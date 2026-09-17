# Diagnóstico: mapa fica branco com apenas o ponto vermelho

Nenhum código, estilo, provedor ou funcionalidade foi alterado. Abaixo, o que foi medido e a conclusão.

## Evidências coletadas

| Verificação | Resultado |
| --- | --- |
| URL do estilo carregada | `https://tiles.openfreemap.org/styles/bright` — HTTP 200, 48 KB, 119 camadas |
| JSON do estilo | Válido; fontes: raster `ne2_shaded` + vetorial `openmaptiles` (`/planet`) |
| Fonte vetorial (TileJSON) | `https://tiles.openfreemap.org/planet` — HTTP 200, aponta para `.../planet/20260913_164504_pt/{z}/{x}/{y}.pbf` |
| Tile vetorial de amostra | HTTP 200, 9 KB, `application/vnd.mapbox-vector-tile` |
| Sprites | `sprites/ofm_f384/ofm.json` — HTTP 200 |
| Glyphs (fontes de texto) | `fonts/Noto Sans Regular/0-255.pbf` — HTTP 200 |
| Requisições no preview | 13 respostas do OpenFreeMap, **nenhuma diferente de 200**, nenhum bloqueio |
| Filtro/opacidade/overlay | `filter: none`, `opacity: 1`, nenhum elemento por cima |
| Tamanho da tela de desenho | 432×764 (ocupa a área toda), marcador posicionado no centro (207, 373) |
| Erros no console | Nenhum erro. Só avisos: WebGL por software no ambiente de teste e um filtro de camada de placas de rodovia dos EUA |

Rodando o **próprio componente de mapa do app** dentro do app em execução, o mapa apareceu completo: ruas, nomes ("Avenida Radial Leste-Oeste", "Rua Tabatinguera", "Largo Pateo Do Colégio"), estações, parques e o ponto vermelho no lugar certo. Captura: `/tmp/browser/diag2/app3.png`.

Também deixei um mapa rodando 30 segundos com zoom e deslocamento contínuos: nenhuma perda de contexto gráfico, tiles sempre carregados.

## Conclusão

O provedor, o estilo, os tiles, as fontes e os ícones estão 100% saudáveis, e não há CSS, filtro ou sobreposição escondendo camadas. O desenho do mapa em si funciona.

Como o sintoma é "funcionou por alguns instantes e depois ficou branco só com o ponto vermelho", a causa está no **ciclo de vida do desenho na sua sessão**, não nos dados: o ponto vermelho é um elemento HTML comum (continua visível mesmo quando a tela de desenho morre), enquanto ruas e nomes só existem dentro da tela de desenho acelerada por GPU. Dois fatores concretos encontrados no ambiente sustentam isso:

1. **Perda do contexto gráfico (WebGL) sem recuperação.** O componente não escuta o evento de perda de contexto nem recria o mapa. Quando o navegador descarta o contexto (comum em celular, aba em segundo plano, memória baixa ou vários mapas abertos), o fundo fica branco e só os marcadores HTML permanecem — exatamente o que você viu. Não consegui reproduzir isso à força no ambiente de teste, então essa é a hipótese mais forte, ainda não confirmada na sua sessão.
2. **Folha de estilo da biblioteca de mapas com 404 intermitente no preview.** O log do servidor de desenvolvimento registra três vezes:
   `The file does not exist at ".../node_modules/.vite/deps/maplibre-gl.css?direct"`.
   Confirmei: essa URL responde **404**. A biblioteca está fora do otimizador (`optimizeDeps.exclude`), mas o CSS dela continua sendo resolvido para a pasta do otimizador. Depois de um recarregamento automático do preview, o mapa pode ficar sem esse CSS, e aí a área do mapa perde posicionamento/recorte.

## Correção recomendada (não aplicada)

Somente no código do mapa, sem tocar em provedor, estilo, localização, zoom, layout, cards ou indicadores:

1. Tratar a perda de contexto: escutar `webglcontextlost`/`webglcontextrestored` na tela de desenho e recriar o mapa preservando centro e zoom; adicionar também um `resize` ao voltar para a aba.
2. Resolver o 404 do CSS da biblioteca: importar a folha de estilo por um caminho que não passe pelo otimizador (ou incluir o CSS no `optimizeDeps`), eliminando o aviso do servidor.
3. Opcional, para confirmar em campo: registrar no console os eventos de erro do mapa e de perda de contexto, para que uma próxima ocorrência fique documentada.

## Como reproduzir as medições

- Verificação de rede do provedor: requisições diretas a estilo, `/planet`, tile `.pbf`, sprite e glyph.
- Render do componente real do app dentro do app em execução, com captura de rede, console e estilos computados.
- Teste de estresse de 30 segundos com zoom/pan monitorando `isContextLost()`, `isStyleLoaded()` e `areTilesLoaded()`.
