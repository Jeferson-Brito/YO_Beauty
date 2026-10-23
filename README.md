# Yo Beauty

Loja virtual da **Yo Beauty — Makes, Cosméticos e Acessórios**. A vitrine, o carrinho, o painel e os indicadores funcionam no ambiente local. A cobrança real entra na integração com o gateway.

## O que já funciona

- API REST em `http://localhost:3333`.
- Loja React em `http://localhost:5173`, com a identidade da marca e dados reais do banco.
- SQLite, migration e seed idempotente.
- Catálogo público: categorias, produtos, seções, banners e páginas institucionais.
- Cadastro de cliente e sessão em cookie `httpOnly`.
- Procedimento separado para criar o primeiro administrador.
- Cálculo de períodos, faturamento, ticket médio, conversão e fidelização, com testes.
- Visitas anônimas somente depois do consentimento.
- Indicadores comerciais e exportação CSV no painel.

O seed não cria visitas, pedidos nem faturamento.

## Requisitos

- Windows, Node.js 20 ou superior e npm.
- Não precisa de Docker, Supabase ou Render para esta versão.

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
npm run db:setup
npm run admin:create
npm run dev
```

- Loja: http://localhost:5173
- Painel: http://localhost:5173/admin
- API: http://localhost:3333/api/health

O painel usa o e-mail e a senha do administrador criado por `npm run admin:create`. Uma conta de cliente não entra nessa área.

`db:setup` aplica as migrations e executa o seed. Rodar o seed de novo não duplica registros e não desfaz edições já feitas no catálogo.

## Comandos

| Comando | Efeito |
| --- | --- |
| `npm run dev` | API e loja juntas |
| `npm run dev:server` | Só a API |
| `npm run dev:client` | Só a loja |
| `npm test` | Testes do servidor |
| `npm run typecheck` | Checagem TypeScript |
| `npm run db:setup` | Migration + seed |
| `npm run db:reset` | Apaga o banco local, recria e semeia de novo |
| `npm run admin:create` | Cria ou, com confirmação, redefine o administrador |

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
- `client/public/brand/logo-fundo-branco.jpg` e `logo-magenta.jpeg` são as logos oficiais.
- `client/public/brand/banner-marca.jpeg` é uma peça da marca. A vitrine ainda não a usa como banner, para a próxima etapa reproduzir a referência em componentes.

Os produtos demonstrativos não têm foto. O card mostra a ausência de imagem em vez de uma fotografia genérica.

## Próxima etapa

Integração com um gateway de pagamento. Até lá, o pedido fica aguardando pagamento e não entra no faturamento.
