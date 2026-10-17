# Publicação no GitHub Pages

> Regra atual: o catálogo e os vídeos publicados podem ser acessados sem conta. Cadastro/login são necessários para salvar lista e progresso. A administração e as bibliotecas pessoais continuam protegidas. Veja [acesso público](PUBLIC-VIEWING.md).

Site: https://p0blok0wan.github.io/test/
Código: https://github.com/P0bloK0wan/test (branch main)
Publicação: branch gh-pages, pasta /(root). A branch main contém código e documentação, não é o endereço do site.

## Acesso

Todos entram por login.html. A conta administrativa de teste foi entregue ao proprietário fora do repositório; não há senha pública neste código. Troque a senha pelo painel. O endereço administrativo é tecnicamente descobrível em um site estático; a segurança é a autorização do Supabase e suas políticas RLS, não o segredo da URL. Contas comuns não recebem links administrativos.

## Ativar cadastros por e-mail

O proprietário informou ainda não ter SMTP. O login de contas confirmadas foi testado; envio real de confirmação e recuperação permanece pendente. A confirmação continua ativada.

1. Contrate/configure um provedor de e-mail transacional (por exemplo Brevo ou Resend, conferindo limites atuais) e um remetente autorizado. Não envie senhas ou chaves pelo chat nem pelo GitHub.
2. No Supabase, abra Authentication → Email/SMTP Settings e configure o SMTP do provedor. A localização pode variar conforme a versão do painel.
3. Em Authentication → URL Configuration configure Site URL `https://p0blok0wan.github.io/test/` e Redirect URLs `https://p0blok0wan.github.io/test/login.html` e `https://p0blok0wan.github.io/test/admin.html`.
4. Mantenha confirmação de e-mail ativa e login anônimo desativado. Cadastre uma conta real pelo site e teste recebimento, confirmação, entrada e recuperação antes de divulgar o cadastro como disponível.

## Publicar vídeos do Google Drive

Entre na sua conta → Administrar catálogo. Preencha título e informações, selecione Google Drive, cole o link de um arquivo de vídeo compartilhado com “Qualquer pessoa com o link → Leitor”, salve e publique. O catálogo consulta novas publicações periodicamente. O player usa a visualização do Drive, sujeita a processamento, cookies, limites e disponibilidade do Google; o login do site não torna privado um arquivo público do Drive. O teste de reprodução com um vídeo seu continua pendente porque ele ainda não foi enviado.

Para preencher sinopse/classificação, configure sua própria credencial TMDB dentro do painel protegido; a chave é guardada no backend. A consulta real ao TMDB permanece pendente dessa credencial. Revise resultados e direitos de conteúdo antes de publicar.

## Atualizar

Execute `npm ci`, `npm run build` e os testes. Envie o código para main e o conteúdo de dist/ para a raiz da branch gh-pages, incluindo .nojekyll. Nunca envie .env ou credenciais privadas. Não é necessário hospedar o servidor Node no Pages: Supabase executa autenticação, banco e função de metadados.

## Verificação em 2026-10-17

No endereço público, navegador real com Supabase real confirmou: visitante redirecionado ao login; conta comum acessa catálogo sem links administrativos; conta comum não abre administração; administrador abre painel; logout retorna ao login. Dois testes HTTP de RLS passaram, incluindo mídia publicada acessível somente com sessão e bloqueio de escrita para conta comum. Identidade temporária de QA e seus dados foram removidos.

A aplicação antiga hospedada em ChatGPT Sites foi substituída por um aviso de mudança; o registro do projeto antigo continua existindo, pois não há operação de exclusão disponível na integração. Deploy de retirada: appgdep_6ad37c7ca38481918cf82a593678afac, status succeeded.

## Entrega pessoal/player (2026-10-17)

A área Minha Streamlab, avatares originais e player próprio fazem parte do frontend estático. A sincronização usa a tabela privada cinema_libraries no projeto Supabase; veja as migrações library-sync.sql e library-sync-validation-fix.sql. Ambas foram aplicadas neste projeto. Perfis e listas passam a pertencer à conta; cache offline e conflitos são exibidos na área pessoal. Outro dispositivo busca o estado ao abrir/recarregar a página.

Testes reais com contas temporárias confirmaram isolamento entre contas, recuperação de lista/progresso em outro contexto, gravação condicional por revisão e escolha explícita de conflito. A interface real de edição de avatar foi gravada no Supabase e recuperada em outro navegador. As contas temporárias são removidas após a QA.

A revisão de segurança do Supabase não apontou falha nova na biblioteca. A ausência de policies em cinema_admins e cinema_integrations é intencional (negação ao cliente). Continua o aviso de proteção contra senhas vazadas desativada: [configuração e documentação](https://supabase.com/docs/guides/auth/password-security#password-strength-and-leaked-password-protection).
