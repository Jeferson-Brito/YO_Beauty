# Arquitetura

## Leitura da referência

A página inicial obrigatória, na imagem `img/Templeta_site.jpeg`, segue esta ordem:

1. Barra magenta com frete grátis, parcelamento e WhatsApp.
2. Cabeçalho rosa-claro com busca à esquerda, logo dourada ao centro e conta, favoritos e carrinho à direita.
3. Menu horizontal: Início, Maquiagem, Skincare, Cabelos, Acessórios, Kits, Lançamentos e Promoções.
4. Banner grande em magenta, com o nome da marca, a frase de autocuidado e o botão “Compre agora”.
5. Faixa de benefícios: entrega, produtos originais, compra segura e formas de pagamento.
6. Título “Categorias” e seis cards com imagem.
7. Grade “Produtos em destaque”, com preço e botão de carrinho.
8. Dois banners: kits especiais e lançamentos.
9. Rodapé magenta com institucional, atendimento, pagamento e redes.

A paleta é magenta, rosa-claro, branco e dourado. A logo oficial já está em `client/public/brand`. A etapa 2 constrói essa composição em componentes. A etapa 1 só fixa os tokens e prova que os dados saem da API.

## Decisões

- Monorepo npm com `client/` e `server/`. O navegador fala com `/api`, e o Vite encaminha para a porta 3333. O cookie de sessão fica no mesmo site durante o desenvolvimento.
- Preços em centavos inteiros. SQLite não oferece decimal confiável, e o mesmo inteiro segue para o PostgreSQL sem conversão ambígua.
- A categoria principal do produto não é uma coluna única. A associação é de muitos para muitos, com uma categoria marcada como principal, porque um item pode estar em Maquiagem e também em Kits ou Lançamentos.
- Autenticação própria. A senha fica com bcrypt. A sessão é um token aleatório; o banco guarda só o SHA-256. O cookie `yb_session` é `httpOnly`, `SameSite=Lax` e `Secure` em produção.
- O cadastro público grava somente `CLIENT`. O administrador nasce pelo comando `npm run admin:create`. Um cliente existente não é promovido.
- Pedido pendente não é venda. O faturamento usa a data `paidAt` do pagamento confirmado. A regra está em código e em [métricas comerciais](metricas-comerciais.md).
- Analytics fica desligado (`analyticsEnabled = false`) até a etapa própria, com consentimento. O modelo das tabelas já existe.
- Imagens locais passam pela interface `StorageProvider`. Nesta etapa não há rota de upload. A troca futura para Supabase Storage não muda o restante da loja.
- Fuso comercial inicial: `America/Recife`. Os instantes são gravados em UTC e os limites dos períodos são calculados nesse fuso.

## Pastas

```text
client/
  src/pages, routes, services, types, utils, styles
server/
  src/config, controllers, services, repositories, routes
  src/middlewares, schemas, domain, mappers, storage, scripts
  prisma/schema.prisma, prisma/seed.ts
  tests/
docs/
```

Rotas HTTP chamam controllers. Controllers validam e respondem. Services aplicam a regra. Repositories falam com o Prisma. O domínio de período, preço, faturamento e fidelização não importa o banco.

## API desta etapa

Públicas:

- `GET /api/health`
- `GET /api/store`
- `GET /api/home`
- `GET /api/categories` e `GET /api/categories/:slug`
- `GET /api/products`, `/featured`, `/new-arrivals` e `/:slug`
- `GET /api/banners`
- `GET /api/home-sections`
- `GET /api/pages/:slug`

Autenticação:

- `POST /api/auth/register`
- `POST /api/auth/login`
- `POST /api/auth/logout`
- `GET /api/auth/me`

Administração, somente com sessão de `ADMIN`:

- `GET /api/admin/ping`
- Produtos, imagens e histórico em `/api/admin/products`
- Categorias em `/api/admin/categories`
- Seções em `/api/admin/sections`
- Banners em `/api/admin/banners`
- Páginas institucionais em `/api/admin/pages`
- Configurações e logo em `/api/admin/settings`
- Pedidos da loja em `/api/admin/orders`
- Indicadores em `GET /api/admin/dashboard` e CSV em `GET /api/admin/dashboard.csv`

As imagens enviadas ficam em `server/uploads` e são servidas em `/uploads`. O painel da loja fica em `/admin`.

Pedidos e visitas:

- `POST /api/checkout/quote` recalcula preço, estoque e frete sem gravar nada
- `POST /api/orders` e `GET /api/orders` exigem sessão
- `POST /api/analytics/consent` e `POST /api/analytics/events` exigem consentimento e não aceitam compra vinda do navegador

O carrinho do visitante fica no navegador. O pedido só é gravado depois do login, com preço e estoque conferidos no servidor, e nasce aguardando pagamento. Nenhuma cobrança é processada.

A resposta pública de produto não expõe a quantidade exata em estoque. Informa `in_stock`, `low_stock` ou `out_of_stock`.

## Plano

1. Fundação. Esta etapa.
2. Vitrine fiel à referência, em desktop e depois em telas menores.
3. Painel: produtos, categorias, seções, banners, configurações e autorização completa.
4. Carrinho de visitante, login no checkout e pedido pendente, com estoque validado no servidor.
5. Analytics anônimo, com consentimento, sessão de 30 minutos e deduplicação. Entregue.
6. Dashboard com os indicadores, gráficos, fidelização e exportação CSV. Entregue.
7. Testes, revisão de segurança e documentação de publicação. Entregue.

A integração de pagamento fica para uma etapa própria. Pedido pendente continua fora do faturamento.

Cada etapa seguinte espera validação antes de um bloco grande de funcionalidade.
