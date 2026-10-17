# Administração: implementação e verificação

Solicitação: login administrativo por e-mail/senha, upload pelo navegador e publicação sem editar o código; novidades para visitantes com o site aberto. Código enviado ao repositório indicado pelo usuário.

Escolha: Supabase Auth, Postgres com RLS, Storage privado e SDK oficial empacotado localmente. Catálogo público na API do projeto, com arquivos privados assinados apenas quando publicados. O acesso ao site hospedado permanece privado na plataforma Sites.

O administrador precisa de identidade existente, e-mail confirmado e entrada na allowlist restrita. Senhas são processadas pelo Supabase Auth e não integram o código. O usuário pediu uma conta de teste; credenciais entregues separadamente. Não há serviço de envio de mensagens ou push fora do site.

Testes: sete testes Node; dezessete verificações do catálogo; quatorze verificações UI do painel com transporte simulado; um teste HTTP real de RLS/Storage com dois perfis; sete verificações reais de navegador contra Supabase incluindo upload TUS, rascunho privado, publicação no outro navegador, reprodução MP4, retirada durante reprodução, exclusão e bloqueio de usuário comum. Evidências em browser-results.json, admin-browser-results.json, cloud-browser-results.json e supabase-live-tests.log.

Confirmação de e-mail está habilitada (mailer_autoconfirm=false). Entrega de mensagens, links de recuperação/URLs de redirecionamento e Realtime WebSocket não foram exercitados no QA real. A alternativa HTTP de 10 segundos foi testada. Conta de teste não possui caixa de e-mail.

Limites: vídeo50MiB, capa5MiB, sem transcodificação; cotas gratuitas de armazenamento e tráfego do provedor. Uploads interrompidos podem deixar objetos privados órfãos para limpeza no Storage. Links assinados já emitidos podem valer até a expiração mesmo após retirar do catálogo. Advisors: somente aviso informativo RLS sem políticas na tabela de administradores, intencional para negar acesso direto.

Correção da revisão: publicação retirada durante reprodução não pode interromper cleanup por falha ao salvar progresso. Teste real cobre a sequência.
