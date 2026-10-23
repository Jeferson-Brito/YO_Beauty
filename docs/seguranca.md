# Segurança

Revisão da versão local, antes da integração de pagamento.

## O que a loja já faz

- Sessão em cookie `httpOnly`, `SameSite=Lax` e `Secure` em produção. O banco guarda só o hash do token.
- Login responde a mesma mensagem quando o e-mail não existe, a senha está errada ou a conta foi encerrada.
- Cadastro público só cria `CLIENT`. Administrador nasce pelo script `admin:create` e um cliente não é promovido.
- Não existe atalho de login sem senha. O Google só entra numa conta que ele mesmo criou; um e-mail que já tem senha precisa entrar com essa senha, para o Google não assumir a conta da proprietária nem uma conta criada antes por outra pessoa.
- Rotas de painel exigem sessão de `ADMIN`. Pedido de outra pessoa responde como não encontrado.
- `next` do login só aceita caminho interno que não começa com `//` nem com `/admin`.
- Preço e estoque do pedido são lidos no servidor. O carrinho do navegador não define valor.
- Upload confere o tipo pela assinatura do arquivo, limita tamanho e gera o nome no servidor.
- Arquivos em `/uploads` recusam caminho com `..`.
- Capacete HTTP do Helmet está ativo e o cabeçalho `X-Powered-By` sai desligado.
- Segredo de exemplo que contém `troque` impede a API de subir em produção.
- Analytics guarda HMAC do identificador, nunca o valor cru, IP ou conteúdo de formulário. `purchase` não entra pelo navegador.
- O CSV neutraliza célula que começa com `=`, `+`, `-` ou `@`.

## O que continua de fora

- Não há cobrança nem armazenamento de cartão. O pedido nasce pendente.
- A publicação em PostgreSQL ainda não foi executada. O arquivo SQLite local não deve ser o banco da loja aberta.
- O texto de privacidade é a base operacional e deve ser revisado pela proprietária antes de uma campanha pública.
