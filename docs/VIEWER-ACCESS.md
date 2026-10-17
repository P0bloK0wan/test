# Login de espectadores e administração

`backend/viewer-access.sql`, migração `cinema_viewer_access`, exige uma sessão autenticada para consultar os vídeos publicados do catálogo compartilhado e para gerar novos links assinados dos arquivos correspondentes no bucket privado `cinema-media`. Visitantes sem sessão não recebem linhas de `cinema_videos` nem podem assinar esses arquivos. A migração substitui somente as duas políticas de leitura de publicação; não muda registros, políticas administrativas, allowlist, funções de administrador nem confirmação de e-mail.

## Cadastro e confirmação

O cadastro cria uma conta comum de espectador. Não concede acesso ao painel, upload, publicação ou configurações TMDB. O administrador continua sendo uma conta com e-mail confirmado e presente na allowlist mantida pelo operador. Campos editáveis de perfil e metadados de cadastro não promovem usuários.

Manter a confirmação de e-mail habilitada no Supabase Auth. O novo usuário deve receber a mensagem, confirmar o endereço e entrar. Configurar SMTP legítimo, remetente verificado e limites apropriados para entrega de mensagens aos usuários reais; o serviço padrão de desenvolvimento tem restrições e não substitui essa configuração. Não desabilitar a confirmação para contornar falhas no envio. Cadastro, confirmação e recuperação de senha precisam ser testados com uma caixa de e-mail autorizada antes de afirmar que a entrega funciona.

Em Authentication → URL Configuration, configurar **Site URL** como `https://p0blok0wan.github.io/test/`. Em **Redirect URLs**, permitir exatamente `https://p0blok0wan.github.io/test/login.html` (confirmação e recuperação do espectador) e `https://p0blok0wan.github.io/test/admin.html` (confirmação e recuperação do painel). Para desenvolvimento, permitir também `http://127.0.0.1:4190/login.html` e `http://127.0.0.1:4190/admin.html` somente quando necessários. Não remover o prefixo `/test/` nem usar curingas amplos. Conferir o retorno de confirmação e de redefinição de senha nessas páginas. Manter login anônimo do Supabase desabilitado: uma sessão anônima do produto Auth usa o papel `authenticated`, que também é contemplado pelas políticas de espectadores. Não há criação de papéis especiais para usuários cadastrados.

## GitHub Pages e limites de privacidade

GitHub Pages serve HTML, CSS, JavaScript e outros arquivos estáticos publicamente. O código da interface administrativa, seus caminhos e os endpoints da API podem ser descobertos. Ocultar um botão ou endereço não é autorização. RLS, as RPCs administrativas e a verificação da sessão no backend protegem as operações mesmo quando alguém abre diretamente o HTML do painel ou inspeciona o código.

Apenas a URL do projeto Supabase e a chave publicável pertencem ao frontend. Senhas, tokens do TMDB e chaves secretas/service-role não pertencem ao código, ao bundle, aos assets ou ao repositório. Arquivos incluídos na pasta pública, vídeos demonstrativos e metadados escritos diretamente no JavaScript permanecem públicos; RLS protege o catálogo do banco, não transforma assets estáticos em conteúdo privado.

Os vídeos do Google Drive que foram compartilhados publicamente continuam públicos para quem tiver o link. O login do site controla a descoberta dos registros no catálogo, não revoga permissões no Drive e não constitui DRM ou autorização de assinatura. Para retirar acesso ao arquivo, alterar também o compartilhamento no Google Drive.

URLs assinadas do Storage já emitidas podem funcionar até expirar, inclusive depois de sair da conta ou após esta migração. A exigência de sessão bloqueia novas assinaturas anônimas; não invalida links anteriores. O modelo permite que qualquer conta de espectador confirmada veja os itens publicados. Não implementa cobrança, aprovação manual de espectadores ou assinaturas pagas.

## Verificação

Aplicar a migração depois do esquema inicial e manter todas as migrações seguintes no histórico. Não reaplicar o SQL inicial como forma de atualizar o ambiente, pois ele contém as antigas políticas públicas. Revisar as demais políticas permissivas existentes no banco: políticas adicionais podem ampliar o acesso.

`tests/viewer-access.test.mjs` executa uma integração HTTP real e optativa num projeto de teste dedicado. Requer `CINEMA_TEST_SUPABASE_URL`, `CINEMA_TEST_PUBLISHABLE_KEY`, `CINEMA_TEST_ADMIN_JWT` e `CINEMA_TEST_VIEWER_JWT` somente no ambiente do processo. A sessão de espectador deve ser confirmada e estar fora da allowlist. Executar:

```sh
node --test --test-isolation=none tests/viewer-access.test.mjs
```

Sem as sessões, o teste fica explicitamente ignorado; isso não comprova permissões do banco. O teste cria registro e capa temporários, verifica que visitante não recebe título nem assinatura, que espectador vê a publicação e assina a capa, e que espectador não publica nem promove a própria conta. Rascunho continua restrito ao administrador. A limpeza em `finally` é tentada; falhas de rede podem exigir remoção manual dos arquivos temporários.

Além do teste HTTP, verificar no navegador: cadastro, recebimento e confirmação de e-mail, login, logout, retorno após recarregar a página, acesso direto ao painel por espectador e acesso administrativo legítimo. Testes com sessões já existentes não comprovam entrega de e-mail nem o fluxo real de cadastro.
