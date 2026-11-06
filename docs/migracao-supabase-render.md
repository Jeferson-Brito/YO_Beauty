# Publicação no Supabase e Render

A loja usa PostgreSQL no Supabase e um serviço Node no Render. A API entrega também o cliente React, mantendo sessão e arquivos no mesmo domínio.

## Comandos e ambiente

- Build: `npm install --include=dev && npm run build -w server && npm run build -w client`.
- Start: `npm run start -w server`. O comando aplica migrations aditivas antes de iniciar a API.
- Health check: `/api/health`.
- Variáveis: `NODE_ENV=production`, `DATABASE_URL`, `CLIENT_ORIGIN`, `SESSION_SECRET`, `ANALYTICS_HASH_SECRET`, `STORE_TIMEZONE`. `GOOGLE_CLIENT_ID` habilita Google.
- `CLIENT_ORIGIN` deve ser o domínio público com HTTPS.
- Não use `SEED_DEMO=true` em produção, nem execute reset do banco publicado.

## Fotos que sobrevivem ao deploy

Os arquivos enviados pelo painel são gravados na tabela `StoredImage` do PostgreSQL, com bytes e tipo de conteúdo, antes de retornar a URL. A rota `/uploads/:pasta/:arquivo` lê essa tabela. Não depende do filesystem efêmero do Render, de um disco pago nem de chaves adicionais. As fotos acompanham os backups do banco; monitore a cota de armazenamento do Supabase. Cada upload continua limitado a 4 MB.

O disco antigo permanece como fallback de leitura, mas todos os novos uploads usam o banco. URLs existentes são mantidas, para não quebrar referências de produtos, banners, categorias, seções e logo.

### Primeira transição do armazenamento antigo

Antes de publicar a primeira versão com persistência:

1. Preserve os arquivos disponíveis enquanto o deploy antigo está no ar: na raiz, `node scripts/backup-public-images.mjs`. O resultado vai para `.local/image-backup`, ignorado pelo Git. O script percorre o catálogo público, não lê dados de clientes.
2. Confira `DATABASE_URL` do banco correto e execute `npm run db:deploy -w server`. As novas migrations acrescentam a opção de impressão automática e a tabela de arquivos, sem apagar catálogo ou pedidos.
3. No PowerShell, defina `IMAGE_SOURCE_ORIGIN` como o domínio antigo e `IMAGE_BACKUP_DIR` como o caminho absoluto de `.local/image-backup`.
4. Execute `npm run images:preserve -w server`. Ele preserva todas as referências `/uploads`, prioriza o backup local e o disco, depois tenta o domínio antigo. É idempotente e não substitui arquivos já preservados.
5. Confira o relatório. Arquivos indisponíveis permanecem referenciados; o script não os apaga nem inventa substitutos. Para exigir que todos existam, acrescente `-- --require-all`.
6. Publique e confira as imagens. Em deploys seguintes não é necessário recadastrar nem migrar novamente.

Se um arquivo já foi perdido em um deploy anterior e não está no backup, será preciso obter o original. Um placeholder na vitrine evita o ícone de imagem quebrada, mas não recupera esse original.

## Desenvolvimento e testes

`npm run dev:local` sobe PostgreSQL na máquina, em `127.0.0.1:55440`, e usa o banco `yo_beauty_preview`. `npm test` cria outro cluster temporário na porta 55439 e o remove ao terminar. Nenhum dos dois usa as credenciais do banco publicado. Os diretórios locais não entram no repositório.

## Pedidos e pagamentos

Pedidos nascem pendentes, reservam estoque e abrem uma mensagem no WhatsApp. A loja ainda não cobra no site. Só pagamentos confirmados entram no faturamento. O cancelamento assume o pedido atomicamente antes de devolver estoque, impedindo devolução duplicada por cliques simultâneos.
