# Contas próprias do Cinema

A página `login.html` oferece entrada, cadastro e recuperação de senha para usuários comuns. Ela usa identidade visual original Cinema e arte dos filmes abertos Blender, creditada na própria página. Essas contas pertencem a este site independente; não são contas Netflix nem de qualquer outra plataforma.

## Usar

- **Criar uma conta:** informe seu e-mail, uma senha exclusiva de pelo menos 8 caracteres e, se desejar, seu nome. Se o provedor exigir confirmação, confira o e-mail e volte para entrar. A mensagem do site não garante que o e-mail já tenha sido entregue.
- **Entrar:** use seu e-mail e senha. O aplicativo consulta a identidade no serviço de autenticação antes de redirecionar ao catálogo.
- **Esqueci minha senha:** informe o e-mail. Caso exista uma conta, o provedor poderá enviar um link de recuperação. O site não revela se um endereço está cadastrado.
- **Nova senha:** o link de recuperação abre o formulário apropriado. Ao concluir, entre novamente com a nova senha.

O botão Mostrar/Ocultar altera apenas a visibilidade do campo de senha. As senhas são apagadas do campo após o envio. A sessão segue as configurações do SDK oficial; não há promessa de navegação anônima ou modo temporário. Não use senhas de outras plataformas.

Criar uma conta comum **não concede função administrativa**. O responsável precisa autorizar administradores no servidor; a página de login não decide permissões. A proteção efetiva do catálogo e dos vídeos deve ser aplicada pelo backend e pelo armazenamento, não apenas por redirecionamentos da interface. Links públicos do Google Drive permanecem públicos fora do site.

## Integração

O módulo usa `cloud.ready` e `cloud.client.auth` de `cloud-client.mjs`. Sem backend configurado, mostra configuração pendente e não solicita credenciais. Cadastros adicionam somente `display_name` opcional aos metadados editáveis; esse campo não pode ser usado para autorização.

Configure `login.html` no endereço HTTPS final como redirecionamento permitido do Supabase Auth, inclusive sob o caminho do GitHub Pages, por exemplo `https://usuario.github.io/test/login.html`. Endereços de teste precisam de configuração própria. Ative a confirmação de e-mail conforme os requisitos do projeto e configure o serviço de entrega de e-mails; limites e falhas do provedor podem impedir confirmação ou recuperação.

O parâmetro `next` aceita somente `index.html` ou `admin.html` sob a mesma origem e pasta da página de login. Outros destinos são descartados; a página não oferece redirecionamento aberto. Ir à página administrativa continua sujeito à autorização no servidor.

Somente a chave pública/publicável pode estar no cliente. Nunca inclua `service_role`, senha de banco ou credenciais particulares no repositório. Publicar o frontend no GitHub Pages não publica automaticamente o backend nem configura autenticação.

## Testar

Execute `node tests/login-browser.mjs` com Chromium e Playwright disponíveis. O teste usa navegador real e autenticação **simulada** para verificar cadastro comum, confirmação orientada, login validado, recuperação, Mostrar/Ocultar senha, redirecionamentos permitidos, bloqueio de destino externo, erro de rede, configuração pendente e largura móvel. Não comprova entrega de e-mail, confirmação real ou políticas de um projeto Supabase.
