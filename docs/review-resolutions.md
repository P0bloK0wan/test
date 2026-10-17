# Revisão e correções

Revisão independente: site_code_review; testes independentes de browser: web_browser_qa.

- P1, raiz HTTP: a normalização removia a barra final e o teste de limite rejeitava /. Reprodução em server-red.log; correção centralizou o limite canônico; teste de integração HTTP passou.
- P2, skip link: #main era interpretado como rota e voltava ao início. Corrigido com foco explícito no main sem alterar o hash; verificação de browser passou.
- P2, falha de trailer: source emitia erro não propagado ao video. Reprodução confirmou fallback oculto em browser-recovery-red.log. A mídia foi atribuída diretamente ao video.src; simulação de falha de rede passou com recuperação visível e link oficial.
- P3, notificações infantis: o indicador incluía conteúdo restrito. Um único seletor agora controla itens visíveis e contagem; teste de perfil infantil passou sem indicador permanente.
- A primeira asserção de progresso consultava a UI antes do evento close atualizar o DOM. A espera passou a observar a condição real de retomada; a persistência original permaneceu inalterada.

Validação final: sete testes Node e 17 verificações Chromium, incluindo reprodução/seek/retomada reais, sem mock de mídia. Filmes completos externos não foram exercitados; o QA bloqueou pedidos fora do servidor local.
