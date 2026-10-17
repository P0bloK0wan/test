# Navegação pública e biblioteca particular

O catálogo publicado e a reprodução ficam disponíveis a visitantes sem cadastro. Login é necessário para salvar e sincronizar a biblioteca da conta, incluindo lista, perfis, preferências e progresso do player nativo. O acesso administrativo continua exigindo conta com e-mail confirmado e presente na allowlist; criar uma conta comum não concede poderes de publicação.

`backend/public-viewing.sql`, migração `cinema_public_viewing`, é aplicada depois de `cinema_viewer_access` e `cinema_library_sync`. Ela substitui somente as políticas de leitura `cinema_published_read` e `cinema_media_published_read` para contemplar `anon` e `authenticated`. Não muda registros, administradores, confirmação de e-mail, permissões de escrita ou qualquer política da tabela `cinema_libraries`. Documentos sobre a antiga exigência de login para assistir descrevem a configuração anterior; esta migração estabelece a regra atual.

## O que permanece protegido

- Rascunhos não aparecem para visitantes nem espectadores comuns; continuam disponíveis ao administrador autorizado.
- Arquivos sem referência em um registro publicado, incluindo uploads órfãos, continuam sem leitura por visitantes.
- O bucket `cinema-media` continua privado. Visitantes recebem URLs assinadas temporárias apenas para objetos associados a um título publicado; a URL pública irrestrita do bucket continua bloqueada.
- Bibliotecas da conta têm RLS pelo UID autenticado. Visitantes não possuem privilégios; usuários comuns não acessam bibliotecas de outras contas. Um administrador do catálogo também não ganha acesso às bibliotecas alheias por este papel.
- Enviar arquivos, alterar vídeos, publicar e excluir continuam operações administrativas. Visitantes e usuários comuns não podem editar a allowlist nem ler segredos do TMDB.

Não há DRM. Um link assinado já emitido pode continuar funcionando até expirar mesmo após despublicação ou logout. A assinatura pública não permite controlar uma validade máxima somente pela interface; um cliente pode solicitar outro prazo aceito pelo provedor. Compartilhamento e revogação de arquivos do Google Drive continuam sendo controlados no próprio Drive. Conteúdo compartilhado publicamente ali permanece público.

## Interface e autenticação

O site público não precisa redirecionar visitantes para login ao abrir o catálogo ou iniciar a reprodução. A ação de salvar algo na conta pode abrir o convite para entrar ou criar conta, retornando à navegação depois do login. A experiência de convidado não deve gravar estado na biblioteca de outra pessoa nem alegar sincronização sem sessão. O funcionamento de cadastro, confirmação de e-mail, SMTP e recuperação de senha permanece o descrito no guia de acesso; não desabilitar confirmação para contornar problemas de entrega.

O GitHub Pages serve arquivos estáticos publicamente. O código da interface administrativa pode ser descoberto; a proteção efetiva está nas RPCs e no RLS do backend. Chave publicável e URL do projeto podem aparecer no código, mas senhas, chaves administrativas e token do TMDB não pertencem ao bundle ou ao GitHub.

## Verificação

Os testes de integração atuais de `tests/schema.test.mjs` e `tests/viewer-access.test.mjs` usam a regra pública: visitante e espectador consultam o título publicado e assinam sua capa; ao despublicar, novas consultas e assinaturas são bloqueadas para ambos; o administrador mantém acesso ao rascunho. Os testes também verificam que visitantes e espectadores não alteram publicação e que bibliotecas continuam particulares. A assinatura de uma capa comprova o controle de acesso do Storage, não a reprodução ou compatibilidade de um vídeo real.

```sh
node --test --test-isolation=none tests/schema.test.mjs tests/viewer-access.test.mjs
```

Executar somente com projeto dedicado e sessões temporárias reais nas variáveis `CINEMA_TEST_SUPABASE_URL`, `CINEMA_TEST_PUBLISHABLE_KEY`, `CINEMA_TEST_ADMIN_JWT` e `CINEMA_TEST_VIEWER_JWT`, fora dos arquivos e do Git. Sem elas, os testes ficam explicitamente ignorados e não comprovam o banco remoto. A migração é revisável neste repositório; sua presença não significa que já foi aplicada. Depois da aplicação, testar navegação e reprodução real como convidado, convite de login ao salvar, persistência da conta e isolamento entre dois usuários.
