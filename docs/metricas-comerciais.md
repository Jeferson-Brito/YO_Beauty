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

## Faturamento e vendas confirmadas

O botão “Confirmar e abrir WhatsApp” registra o pedido e o considera uma venda. O site abre a mensagem para envio, mas não consegue observar o envio efetivo, a entrega da mensagem ou o pagamento dentro do WhatsApp. Esse botão é o marco de confirmação da venda no sistema.

Todo pedido não cancelado entra nos indicadores pela data `Order.createdAt`. O valor é `totalCents` (subtotal menos desconto mais frete), sem consultar `Payment`, `paidAt` ou qualquer estado de pagamento. Isso inclui os pedidos existentes, antes tratados como pendentes. Não há cobrança, gateway ou verificação de recebimento no site.

O cliente escolhe a forma de pagamento no checkout. `Order.paymentMethod` preserva essa escolha, exibida no WhatsApp, no pedido e na impressão. A informação não significa pagamento recebido.

## Ticket médio

Faturamento dos pedidos confirmados dividido pela quantidade de pedidos não cancelados no período. Sem vendas, o ticket é zero.

## Cancelamentos

Cliente autenticado pode cancelar apenas o próprio pedido. Administrador pode cancelar qualquer pedido. O cancelamento retira a venda, os itens vendidos, o ticket e a compra da fidelização na data original de criação. Não há lançamento de estorno financeiro: o site não acompanha pagamentos externos.

O estoque é devolvido dentro da mesma transação, após assumir atomicamente o cancelamento. Chamadas concorrentes ou repetidas não devolvem estoque duas vezes. O histórico do pedido permanece disponível.

## Clientes

- Cadastrados: contas `CLIENT`, ativas ou não. `ADMIN` fica de fora.
- Novos no mês: contas `CLIENT` criadas na janela do card mensal.
- Com compra no período: clientes distintos com pedido válido naquela janela.
- Recorrente: duas ou mais compras confirmadas e não canceladas no histórico.
- Recorrente no período: recorrente no histórico e com ao menos uma compra confirmada e não cancelada na janela.

## Fidelização

Limites iniciais, gravados em `loyaltyRules` e alteráveis depois:

- VIP: gasto líquido histórico de R$ 500 ou 5 pedidos confirmados e não cancelados.
- Inativo: já comprou e a última compra confirmada e não cancelada foi há 90 dias ou mais, contados da data de referência.

Um segmento principal, nesta ordem: inativo, VIP, recorrente, primeira compra, novo. VIP inativo aparece como inativo.

Tempo médio entre compras: média dos intervalos entre pedidos confirmados e não cancelados consecutivos do cliente. Com menos de duas compras, o valor fica ausente.

## Visitantes e conversão

Ainda não há coleta até o visitante permitir. Com o analytics ligado:

- Visitante único: identificador anônimo distinto com evento de navegação no período.
- Sessão: sessão iniciada no período.
- Visualização: somente evento `page_view`. `product_view` e `category_view` servem aos rankings e não são somados de novo às visualizações.
- Conversão = compradores identificados com compra confirmada e não cancelada no período / visitantes únicos do mesmo período.
- Sem visitante registrado, a conversão fica ausente.
- A taxa é aproximada. Compra em outro dispositivo, navegação sem consentimento ou limpeza do armazenamento impede ligar a visita à compra. Se o numerador superar o denominador, o número é mostrado assim, com essa ressalva, sem teto artificial.

## Produtos e categorias

Mais vendidos e maior faturamento de produto usam itens de pedidos que passam na regra de faturamento. A quantidade soma `quantity`. O valor do ranking soma `lineTotalCents`, sem frete e sem rateio de desconto do pedido.

Estoque baixo: ativo, quantidade maior que zero e até `lowStockThreshold` (5). Sem estoque: ativo e quantidade zero. A API pública não revela o número, só a faixa.

Sem venda confirmada e não cancelada, o ranking volta vazio.
