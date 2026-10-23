# Migração para Supabase e Render

A primeira versão roda só na máquina local. Supabase e Render não são dependências para desenvolver.

## O que já está preparado

- A API lê `PORT`.
- `GET /api/health` serve como health check.
- CORS aceita `CLIENT_ORIGIN`.
- Em produção, `trust proxy` fica em 1 e o processo recusa segredo que ainda contenha o texto `troque`.
- O cookie de sessão usa `Secure` quando `NODE_ENV=production`.
- Preços em centavos continuam inteiros no PostgreSQL.
- Campos JSON do Prisma passam de texto no SQLite para JSON no PostgreSQL sem mudar o código de leitura.
- `StorageProvider` isola o disco local. A implementação Supabase entra no lugar dela e devolve a URL pública.
- Não existe tabela que guarde número completo de cartão.

## SQLite e PostgreSQL

Trocar o datasource do Prisma para `postgresql` e gerar uma migration nova para o banco vazio de produção. Não reutilizar o arquivo SQL do SQLite: tipos, enums e JSON diferem.

Enums podem passar a ser enums nativos. Os valores em texto já são os mesmos (`ADMIN`, `PAID`, `AWAITING_PAYMENT`).

SQLite é folgado com algumas constraints. Antes da migração, vale revisar slugs, SKUs e e-mails duplicados. O volume de desenvolvimento cabe numa cópia lógica; não há ferramenta de dump automático nesta etapa.

Não usar o arquivo SQLite como banco da loja publicada. Ele não atende concorrência nem backup de uma operação real.

## Dados que seguem

Catálogo, usuários, sessões, pedidos e configurações são dados de negócio e devem ser migrados. Eventos de analytics locais de teste podem ser descartados. O seed demonstrativo não deve ser aplicado em cima de um catálogo já editado pela proprietária: ele não sobrescreve o que existe, mas também não é um catálogo de produção.

Senhas já estão em bcrypt e continuam válidas se as linhas de `User` forem copiadas.

Imagens que hoje viveriam em `server/uploads` precisam ir para o Supabase Storage, e as URLs salvas em produto, categoria, banner e logo precisam ser atualizadas.

## Render

O serviço web deve iniciar com `npm run start` depois de compilar a API e o cliente. Em produção a API também entrega o site em `client/dist`, no mesmo endereço, para o cookie de sessão continuar same-site. O comando de release aplica `npx prisma migrate deploy` com `DATABASE_URL` apontando para o Postgres do Supabase. Não defina `SEED_DEMO` nesse ambiente: o seed de produção não cria produtos fictícios.

Variáveis mínimas de produção: `NODE_ENV`, `PORT`, `DATABASE_URL`, `CLIENT_ORIGIN`, `SESSION_SECRET`, `ANALYTICS_HASH_SECRET`, `STORE_TIMEZONE`.

O administrador de produção é criado pelo mesmo script, com senha forte, fora do seed e fora do repositório.

## Publicação

1. Criar o projeto Postgres no Supabase e um serviço web no Render, com o repositório apontando para a raiz.
2. Comando de build: `npm install && npm run build -w server && npm run build -w client`.
3. Comando de start da API: `npm run start -w server`.
4. Comando de release: `npm run db:deploy -w server`.
5. Definir as variáveis da seção Render. `CLIENT_ORIGIN` é a URL pública da loja, com `https`.
6. Publicar o cliente estático gerado em `client/dist`, ou servi-lo no mesmo domínio da API para o cookie continuar same-site.
7. Conferir `GET /api/health` e um login de administrador criado fora do seed.
8. Não copiar `server/prisma/dev.db` para a produção. Imagens de `server/uploads` sobem ao Storage e as URLs salvas são atualizadas.

O gateway de pagamento não faz parte deste roteiro. Até ele existir, pedido pendente não pode ser lançado como venda.

## Autenticação futura

A sessão própria pode permanecer. Supabase Auth só entra se houver uma decisão explícita de substituir o login. As duas opções não devem ficar ativas ao mesmo tempo sem uma ponte de migração dos usuários.
