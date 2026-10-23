# Métricas comerciais

Estas regras são a fonte dos indicadores exibidos em `/admin`. O CSV do mesmo período sai por `GET /api/admin/dashboard.csv`.

Fuso: `America/Recife`. O banco guarda UTC. Todo intervalo é semiaberto: inclui o início e exclui o fim, no formato `[início, fim)`.

## Períodos do filtro

A data de referência é o último dia incluído no filtro.

| Filtro | Intervalo |
| --- | --- |
| Hoje | do início do dia corrente até o dia seguinte |
| Ontem | o dia civil anterior |
| Últimos 7 dias | hoje e os 6 dias anteriores |
| Últimos 30 dias | hoje e os 29 dias anteriores |
| Semana atual | segunda 00:00 até a próxima segunda, semana ISO |
| Semana anterior | a semana ISO completa anterior |
| Mês atual | dia 1 até o dia 1 do mês seguinte |
| Mês anterior | mês civil completo anterior |
| Últimos 3, 6 ou 12 meses | do mesmo dia, N meses atrás, até o fim de hoje |
| Personalizado | da data inicial à data final, inclusive, no máximo 731 dias |

O período anterior equivalente tem a mesma duração e termina quando o período escolhido começa.

Exemplo com referência em 22/10/2026: hoje começa às 00:00 de Recife; a semana atual começa na segunda 19/10; os últimos 3 meses começam em 22/07.

## Cards de dia, semana e mês

Esses cards usam a data de referência, não o filtro inteiro quando o filtro é mais largo.

- Dia: o dia civil da referência, comparado ao dia anterior inteiro.
- Semana: da segunda até o fim do dia de referência. A comparação usa a mesma quantidade de dias da semana anterior.
- Mês: do dia 1 até o fim do dia de referência. A comparação usa o mesmo dia no mês anterior. Se a referência é o último dia do mês, a comparação usa o mês anterior inteiro.
- Faturamento total: histórico, sem filtro e sem variação.

Variação percentual = `(atual - anterior) / anterior`. Se o anterior é zero, a variação fica ausente. A tela não deve mostrar 0% nem infinito nesse caso.

## Faturamento

Entra no faturamento o pedido que, ao mesmo tempo:

- tem pagamento `PAID` ou `PARTIALLY_REFUNDED`;
- não está com status operacional `CANCELLED`;
- tem `paidAt` dentro do período;
- fica com valor líquido maior que zero.

Valor líquido = `totalCents - refundedAmountCents`.

`totalCents` já é `subtotal - desconto + frete`. O faturamento inclui o frete cobrado e desconta desconto e estorno. Não é o GMV dos itens.

Pedido `PENDING` não entra. Estorno integral (`REFUNDED`) sai do período original do pagamento; não vira valor negativo no mês do estorno. Estorno parcial reduz o líquido no período original. O ranking de produto ainda usa o `lineTotalCents` cheio quando o pedido continua parcialmente estornado, porque a versão atual não rateia o estorno entre os itens.

A data da venda é `Payment.paidAt`, não a data de criação do pedido.

## Ticket médio

`ticket = faturamento líquido do período / quantidade de pedidos que entraram nesse faturamento`.

Sem pedido válido, o ticket é zero. Não há divisão por zero.

## Pedidos

“Pedidos criados” conta pela data de criação, em qualquer status. Pagos, pendentes, cancelados, em processamento e estornados são contagens separadas. Criado não é sinônimo de pago.

## Clientes

- Cadastrados: contas `CLIENT`, ativas ou não. `ADMIN` fica de fora.
- Novos no mês: contas `CLIENT` criadas na janela do card mensal.
- Com compra no período: clientes distintos com pedido válido naquela janela.
- Recorrente: duas ou mais compras pagas no histórico.
- Recorrente no período: recorrente no histórico e com ao menos uma compra paga na janela.

## Fidelização

Limites iniciais, gravados em `loyaltyRules` e alteráveis depois:

- VIP: gasto líquido histórico de R$ 500 ou 5 pedidos pagos.
- Inativo: já comprou e a última compra paga foi há 90 dias ou mais, contados da data de referência.

Um segmento principal, nesta ordem: inativo, VIP, recorrente, primeira compra, novo. VIP inativo aparece como inativo.

Tempo médio entre compras: média dos intervalos entre pedidos pagos consecutivos do cliente. Com menos de duas compras, o valor fica ausente.

## Visitantes e conversão

Ainda não há coleta até o visitante permitir. Com o analytics ligado:

- Visitante único: identificador anônimo distinto com evento de navegação no período.
- Sessão: sessão iniciada no período.
- Visualização: somente evento `page_view`. `product_view` e `category_view` servem aos rankings e não são somados de novo às visualizações.
- Conversão = compradores identificados com compra paga no período / visitantes únicos do mesmo período.
- Sem visitante registrado, a conversão fica ausente.
- A taxa é aproximada. Compra em outro dispositivo, navegação sem consentimento ou limpeza do armazenamento impede ligar a visita à compra. Se o numerador superar o denominador, o número é mostrado assim, com essa ressalva, sem teto artificial.

## Produtos e categorias

Mais vendidos e maior faturamento de produto usam itens de pedidos que passam na regra de faturamento. A quantidade soma `quantity`. O valor do ranking soma `lineTotalCents`, sem frete e sem rateio de desconto do pedido.

Estoque baixo: ativo, quantidade maior que zero e até `lowStockThreshold` (5). Sem estoque: ativo e quantidade zero. A API pública não revela o número, só a faixa.

Sem venda paga, o ranking volta vazio.
