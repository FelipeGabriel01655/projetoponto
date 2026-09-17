# Diagnóstico: por que o mapa da Home não aparece

Nenhum código foi alterado. Abaixo, o que foi verificado e a causa encontrada.

## Resultado das verificações

| Verificação | Resultado |
| --- | --- |
| Tiles do mapa carregam | Sim. Estilo, sprites, fontes e tiles do OpenFreeMap respondem 200 no preview real |
| Erros no console | Nenhum erro de mapa. Só um aviso inofensivo: imagem "wood-pattern" ausente no sprite |
| Overlay cobrindo o mapa | Nenhum. A busca por elementos de tela cheia sobre o mapa não achou nada |
| Filtro deixando tudo preto | Não. O filtro atual (`grayscale(1) brightness(1.35) contrast(1.05)`) foi testado isoladamente e o mapa fica escuro, porém legível, com ruas e nomes |
| Marcador do motoboy | Criado. Existe 1 marcador na página |
| Tamanho do container | **Problema aqui: altura 0 px** (largura 432, altura 0) |

## Causa raiz

A caixa do mapa na Home tem **altura zero**, então não sobra nenhum espaço para desenhar — por isso a tela parece preta mesmo com tudo o mais funcionando.

Detalhe técnico: o container usa as classes `absolute inset-0`, mas a folha de estilo da biblioteca de mapas define `.maplibregl-map { position: relative }`. Essa regra entra depois na cascata e vence, então o elemento deixa de ser posicionado e `inset-0` é ignorado; sem altura declarada, ele colapsa para 0 px. A tela de desenho cai para o tamanho padrão (432x300) dentro de um pai de altura zero.

Medição no preview aberto:

```text
div.mapa-monocromatico  -> position: relative (esperado: absolute), height: 0px
main.relative h-dvh     -> height: 764px  (ok)
canvas                  -> 432x300, filtro correto, opacidade 1
marcadores              -> 1
```

## Correção sugerida (a aplicar só se você aprovar)

Uma única mudança de estilo no componente do mapa, sem tocar em layout, cards, indicadores ou provedor:

- Garantir que o container do mapa ocupe a área toda mesmo com a regra da biblioteca — por exemplo trocando `absolute inset-0` por um `h-full w-full` com posicionamento forçado (`!absolute`), ou envolvendo o mapa numa div `absolute inset-0` e deixando o container interno com `h-full w-full`.

Arquivo afetado: `src/components/mapa/Mapa.tsx` (ou `MapaTelaCheia.tsx`, se optarmos pelo wrapper).

O aviso do "wood-pattern" pode ser ignorado; não afeta a exibição.
