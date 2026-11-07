# Yo Beauty

Loja virtual da **Yo Beauty — Makes, Cosméticos e Acessórios**. A vitrine, o carrinho, o painel e os indicadores funcionam no ambiente local. O cliente escolhe a forma de pagamento no checkout; o pedido confirmado abre a mensagem no WhatsApp e já conta como venda. O site não cobra nem verifica pagamentos.

## O que já funciona

- API REST em `http://localhost:3333`.
- Loja React em `http://localhost:5173`, com a identidade da marca e dados reais do banco.
- PostgreSQL, migrations e seed idempotente.
- Fotos persistidas no banco, com URLs estáveis em `/uploads`, preservadas entre deploys.
- Catálogo público: categorias, produtos, seções, banners e páginas institucionais.
- Cadastro de cliente e sessão em cookie `httpOnly`.
- Procedimento separado para criar o primeiro administrador.
- Cálculo de períodos, faturamento, ticket médio, conversão e fidelização, com testes.
- Visitas anônimas somente depois do consentimento.
- Indicadores comerciais e exportação CSV no painel.

O seed não cria visitas, pedidos nem faturamento.

## Requisitos

- Node.js 22 e npm. A prévia local inicia PostgreSQL automaticamente, sem Docker.
- Produção: PostgreSQL (Supabase) e serviço Node no Render.

## Primeira execução

No PowerShell, na pasta do projeto:

```powershell
Copy-Item .env.example server\.env
```

Abra `server/.env` e troque:

- `SESSION_SECRET`
- `ANALYTICS_HASH_SECRET`
- `ADMIN_PASSWORD` (mínimo de 10 caracteres, com letra e número)

Depois:

```powershell
npm install
npm run dev:local
```

- Loja: http://localhost:5173
- Painel: http://localhost:5173/admin
- API: http://localhost:3333/api/health

A prévia usa `yo_beauty_preview` em `127.0.0.1:55440`, em `.local/dev-postgres`, com catálogo demonstrativo. As variáveis de produção de `server/.env` não são usadas por essa prévia. Para usar um PostgreSQL próprio, configure `DATABASE_URL`, execute `npm run db:setup` e `npm run dev`.

O painel usa o administrador criado por `npm run admin:create`. Esse comando usa o banco configurado no ambiente: para criar um administrador da prévia, defina antes `DATABASE_URL=postgresql://yo_local:yo_local_dev@127.0.0.1:55440/yo_beauty_preview`. Uma conta de cliente não entra nessa área.

`db:setup` aplica as migrations e executa o seed. Rodar o seed de novo não duplica registros e não desfaz edições já feitas no catálogo.

## Comandos

| Comando | Efeito |
| --- | --- |
| `npm run dev:local` | Prévia com PostgreSQL local isolado, API e loja |
| `npm run dev` | API e loja juntas |
| `npm run dev:server` | Só a API |
| `npm run dev:client` | Só a loja |
| `npm test` | Testes com PostgreSQL temporário isolado na porta 55439 |
| `npm run typecheck` | Checagem TypeScript |
| `npm run db:setup` | Migration + seed |
| `npm run db:reset` | Apaga o banco local, recria e semeia de novo |
| `npm run admin:create` | Cria ou, com confirmação, redefine o administrador |
| `npm run images:preserve -w server` | Copia uploads antigos para o armazenamento persistente |

Os testes criam e encerram o próprio banco; não utilizam `DATABASE_URL` de produção. Depois de alterar o schema, execute `npx prisma generate --schema server/prisma/schema.prisma` com a API parada no Windows, para atualizar o cliente. O build de produção já faz isso automaticamente.

Para trocar a senha de um administrador que já existe:

```powershell
$env:ADMIN_RESET_PASSWORD='true'
npm run admin:create
Remove-Item Env:ADMIN_RESET_PASSWORD
```

O comando recusa promover um e-mail que já pertence a um cliente.

## Documentação

- [Arquitetura e plano](docs/arquitetura.md)
- [Modelo de dados](docs/modelo-de-dados.md)
- [Métricas comerciais](docs/metricas-comerciais.md)
- [Analytics e privacidade](docs/analytics-e-privacidade.md)
- [Migração para Supabase e Render](docs/migracao-supabase-render.md)
- [Segurança](docs/seguranca.md)

## Imagens da marca

- `img/Templeta_site.jpeg` é a referência visual da página inicial. Ela não deve ser usada como imagem de fundo.
- `client/public/brand/` contém as logos oficiais e `client/public/home/` as peças da vitrine.
- Fotos enviadas pelo painel ficam em `StoredImage` no PostgreSQL, incluindo os bytes do arquivo. O disco local é somente uma compatibilidade de leitura para uploads antigos.

Os produtos demonstrativos não têm foto. O card mostra a ausência de imagem em vez de uma fotografia genérica.

## Vendas pelo WhatsApp

Ao clicar em **Confirmar e abrir WhatsApp**, o pedido é registrado como confirmado e conta nos indicadores, sem confirmação de pagamento. A forma escolhida aparece na mensagem e no comprovante impresso. Cliente ou administrador podem cancelar: a venda sai dos indicadores e o estoque é devolvido uma única vez. O site não verifica o envio efetivo da mensagem nem acompanha o que ocorre no WhatsApp.
