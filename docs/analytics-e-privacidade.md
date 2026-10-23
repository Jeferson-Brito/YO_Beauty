# Analytics e privacidade

O acompanhamento de visitas está ligado e só grava dados depois do consentimento. `analyticsEnabled` nasce `true`. Nenhum evento é gravado pelo seed.

## O que será medido

Três coisas diferentes:

- Visitante único estimado: um identificador aleatório do navegador.
- Sessão: uma sequência de navegação. Expira depois de 30 minutos sem atividade (`sessionTimeoutMinutes`).
- Visualização de página: cada abertura de página enviada como `page_view`.

Cinco páginas na mesma sessão contam uma sessão e cinco visualizações, e continuam sendo um visitante. Uma volta no outro dia pode abrir outra sessão e permanece o mesmo visitante enquanto o identificador continuar no navegador.

Isso não identifica uma pessoa física. Outro aparelho, limpeza dos dados do navegador ou bloqueio de armazenamento criam outro visitante estimado.

## Identificadores

Depois do consentimento, o navegador gera um UUID aleatório e outro para a sessão. O servidor guarda somente o HMAC-SHA256 desses valores, com `ANALYTICS_HASH_SECRET`. O valor cru não entra no banco. Não há IP, fingerprinting, senha, endereço, cartão nem conteúdo de formulário.

Eventos previstos: `session_started`, `page_view`, `category_view`, `product_view`, `search`, `add_to_cart`, `remove_from_cart`, `begin_checkout`, `login_success`, `sign_up` e `purchase`.

`purchase` só pode nascer no servidor, quando um pagamento for confirmado por operação confiável. O navegador não poderá informar faturamento nem compra paga.

Cada evento leva um `eventId`. A coluna única impede contar de novo um reenvio.

## Consentimento e retenção

O identificador persistente só será criado depois de uma escolha explícita. Sem consentimento, a loja não grava evento de navegação. A escolha poderá ser revista.

Retenção inicial: 180 dias (`analyticsRetentionDays`). A exclusão de um visitante remove sessões e eventos. A conta do cliente, quando houver pedido, será anonimizada nas próximas etapas; o pedido conserva o retrato necessário à compra.

Se a pessoa entrar na conta durante a sessão consentida, os eventos daquela sessão e daquele identificador podem receber o vínculo com a conta. Não haverá tentativa de ligar outros aparelhos.

## Limites

A coleta não pode travar a navegação. O servidor vai validar tipo, tamanho e propriedades, limitar a frequência e descartar tráfego que não respeite o contrato. Evento de navegação é dado aproximado: bloqueador, automação e falha de rede alteram a contagem.

A página institucional `privacidade` descreve esse estágio para quem acessar a loja. O texto deve ser revisado pela proprietária antes de uma publicação externa.
