# Streamlab: publicação simples, área pessoal e reprodução

Pedido autorizado: implementar as cinco prioridades da lista apresentada e acrescentar um player próprio.

## Entrega

- Painel existente passa a quatro etapas: vídeo, informações, capa e revisão. Salvar cria rascunho; publicar continua sendo decisão separada. Prévia não publica nem envia dados sozinha.
- Área Minha Streamlab agrega perfil, continuar assistindo, avaliações e lista. Avatares próprios, sem personagens protegidos.
- Perfis, listas, avaliações e progresso usam armazenamento privado por conta no Supabase. RLS impede acesso de outras contas. Sessões continuam sendo validadas no servidor. Cache local preserva alterações offline; conflitos entre dispositivos precisam ser mostrados e resolvidos explicitamente, sem descartar mudanças silenciosamente.
- Player HTML5 com controles Streamlab para mídia compatível: reprodução, busca temporal, volume, velocidade e tela cheia. Drive e YouTube incorporados não oferecem acesso ao elemento de vídeo; mantêm players oficiais. Progresso do iframe do Drive continua indisponível.

## Integração e teste

Três tarefas independentes: painel, biblioteca/sincronização, interface pessoal; uma quarta implementa controles do player. Integrar por módulos públicos com contratos explícitos. Testar unidades de sanitização e conflitos, navegador com mídia local real, painel sem publicação acidental e sincronização Supabase entre dois contextos. Publicar código em main e dist em gh-pages somente após verificação.

## Limites mantidos

SMTP e URLs de confirmação dependem da configuração já documentada. Não há promessa de downloads, transcodificação, HLS, DRM, busca TMDB sem chave configurada ou progresso de iframe. O player próprio controla reprodução e interface; não substitui hospedagem nem converte arquivos.
