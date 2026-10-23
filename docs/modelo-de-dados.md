# Modelo de dados

O schema está em `server/prisma/schema.prisma`. O banco local é SQLite. Os enums do Prisma são gravados como texto e podem se tornar enums nativos no PostgreSQL.

Dinheiro é sempre inteiro em centavos: `priceCents`, `totalCents`, `refundedAmountCents`.

## Catálogo

- `Category`: nome, slug, descrição, imagem, ativa, aparece no menu, aparece na home e ordem.
- `Product`: nome, slug, descrições, SKU, preços, preço efetivo, estoque, status (`ACTIVE`, `INACTIVE`, `ARCHIVED`), destaque, lançamento e texto normalizado de busca.
- `ProductCategory`: liga produto e categoria. `isPrimary` marca a categoria principal.
- `ProductImage`: várias imagens, com ordem. O seed não inventa foto.
- `ProductChangeLog`: histórico simples de alteração, preenchido quando o painel existir.
- `HomeSection` e `HomeSectionProduct`: a seção organiza a vitrine. A categoria organiza o catálogo. Os tipos são `manual`, `featured`, `new_arrivals`, `promotions`, `best_sellers` e `category`.
- `StoreBanner`: hero, promo-left e promo-right.
- `StorePage`: páginas institucionais.
- `StoreSettings`: uma linha `default` com mensagens comerciais, frete, redes, benefícios, formas de pagamento exibidas, limite de estoque baixo, fuso, regras de fidelização e flags de analytics.

`effectivePriceCents` repete o preço usado na ordenação. Ele vale o preço promocional somente quando esse preço é menor que o preço cheio. Toda gravação futura de preço precisa recalculá-lo.

## Contas e pedidos

- `User`: `ADMIN` ou `CLIENT`.
- `Session`: hash do token e expiração.
- `PasswordResetToken`: reservado para a recuperação de senha. O fluxo ainda não está exposto.
- `Address`: endereços do cliente.
- `Order`: número, cliente, retrato do endereço, totais, `paymentStatus` e `orderStatus`.
- `OrderItem`: nome, SKU e preço copiados no momento da compra.
- `Payment`: provedor, status, valor e `paidAt`.
- `Favorite`: favorito por cliente autenticado.

Status de pagamento: `PENDING`, `PAID`, `FAILED`, `REFUNDED`, `PARTIALLY_REFUNDED`, `CANCELLED`.

Status do pedido: `AWAITING_PAYMENT`, `PAID_AWAITING_PROCESSING`, `PROCESSING`, `SHIPPED`, `DELIVERED`, `CANCELLED`.

## Analytics

As tabelas já existem e começam vazias:

- `AnalyticsVisitor`: hash do identificador anônimo, primeira e última vez, consentimento.
- `AnalyticsSession`: hash da sessão, visitante, usuário opcional, início, última atividade, página de entrada e referência.
- `AnalyticsEvent`: `eventId` único para deduplicar, tipo, vínculos opcionais, caminho, propriedades validadas, horário informado e horário de recebimento.

Não há coluna de IP. O identificador cru do navegador não é gravado; a etapa de analytics vai guardar o HMAC.

## Integridade

Pedido não apaga o usuário (`Restrict`). Item de pedido mantém o texto se o produto for removido (`SetNull`). Imagens, favoritos e sessões acompanham o dono. Apagar um visitante de analytics remove sessões e eventos, para atender exclusão. Pedidos permanecem porque são o registro da compra.

Índices cobrem slug, status, data do pedido, status de pagamento e os recortes de analytics por data, tipo, sessão, visitante, produto e categoria.

## Seed

O seed cria categorias, 14 produtos, seções, banners, configurações e quatro páginas. Ele cria o registro só quando o slug ou o id ainda não existe.

Não cria administrador, pedido, pagamento nem evento. A seção “Mais vendidos” fica inativa e a consulta dela só enxerga pedido pago.
