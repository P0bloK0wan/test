# Netflix Web — implementação independente

> Regra atual: o catálogo e os vídeos publicados podem ser acessados sem conta. Cadastro/login são necessários para salvar lista e progresso. A administração e as bibliotecas pessoais continuam protegidas. Veja [acesso público](docs/PUBLIC-VIEWING.md).

**[ABRIR O SITE](https://p0blok0wan.github.io/test/)** · **[ENTRAR OU CRIAR CONTA](https://p0blok0wan.github.io/test/login.html)** · **[PAINEL DE ADMINISTRAÇÃO](https://p0blok0wan.github.io/test/admin.html)**

A aba `main` do GitHub exibe os arquivos do projeto. O endereço de publicação do site é https://p0blok0wan.github.io/test/. O GitHub Pages serve a interface publicamente; para acessar o catálogo compartilhado, crie uma conta, confirme seu e-mail e entre. O painel exige também autorização administrativa no servidor. Descobrir ou abrir `admin.html` não concede permissão de administração.

Site responsivo funcional, baseado em investigação estática do APK fornecido e em código original. Catálogo com 11 filmes abertos; não utiliza servidores, contas ou conteúdo privado da Netflix.

## Publicar por link do Google Drive

No Drive, envie o vídeo e escolha **Compartilhar → Acesso geral → Qualquer pessoa com o link → Leitor**. Copie o link de arquivo e abra o **Painel do administrador**. A fonte padrão é **Link público Google Drive**: cole o link, preencha título/descrição/duração/classificação/créditos e, opcionalmente, envie uma capa. Salve o rascunho e depois toque em **Publicar**.

O arquivo continua no Drive e é exibido pelo visualizador oficial em iframe, com botão para abrir no Drive. Esta opção não usa o limite de 50 MiB do upload direto ao Supabase. Links de pastas não são aceitos. Não há conexão OAuth ou busca automática de pastas: cada link é cadastrado manualmente.

O Drive precisa concluir o processamento e permitir acesso público e incorporação. Limites de tráfego, cookies ou configurações do Google podem impedir a reprodução. O site não consegue medir/salvar progresso dentro do player do Drive. Excluir o título no painel não exclui o arquivo original nem revoga o link público.

Consulte [o guia do painel](docs/PAINEL-ADMIN.md). A primeira reprodução real aguarda um vídeo público fornecido pelo proprietário; os testes de links e publicação não são uma prova de reprodução no Google.

## Abrir localmente

Requer Node.js 22.19+ (testado com 24.19). Não é preciso instalar dependências para executar o site.

```sh
cd netflix-web
node server.mjs
```

Abra http://127.0.0.1:4190. Ctrl+C encerra o servidor. A porta pode ser escolhida com a variável PORT. Abrir index.html diretamente por file:// não carrega os módulos corretamente: use o servidor ou hospedagem estática.

## Funcionalidades

Busca por títulos/gêneros/sinopse, filtros, detalhes, minha lista, avaliações, até 5 perfis com listas separadas, filtro infantil, preferências, progresso real dos trailers e retomada, leitura de novidades, ajuda/créditos e player. Perfil e lista persistem neste navegador; login/cadastro e acesso administrativo usam Supabase, e as listas não sincronizam entre dispositivos. Cadastro comum não permite enviar ou publicar vídeos.

Os trailers de Sintel e Big Buck Bunny estão disponíveis localmente. “Filme completo” usa uma incorporação oficial YouTube e oferece alternativa para abrir no canal do criador. [Créditos e licenças](ASSET-CREDITS.md).

## Testes

```sh
node --test --test-isolation=none tests/library.test.mjs tests/server.test.mjs
```

QA browser usa Playwright Core 1.58.2 e Chromium. Neste workspace ele reutiliza o pacote do REA. Fora daqui, para executar QA:

```sh
npm ci --ignore-scripts
# Aponte CHROMIUM_PATH para um Chromium/Chrome já instalado se não estiver em /usr/bin/chromium.
node tests/browser.mjs
```

Scripts de browser / HTTP precisam poder lançar processos e abrir loopback. O sandbox desta sessão exige o perfil de permissões adequado; isso é uma restrição do executor, não requisito de acesso a servidores Netflix.

## Arquivos

- dist/: site completo; pode ser servido por uma hospedagem estática.
- server.mjs: servidor local com suporte Range para vídeos, somente loopback.
- docs/analysis.md: análise, requisitos, evidências e limitações.
- docs/browser-results.json: resultados registrados das verificações de navegador.
- docs/desktop.png e docs/mobile.png: capturas reais.
- docs/node-tests.log: registro da execução dos testes locais.

Não inclui o APK original nem código decompilado dele. Mantém assets abertos e atribuições. Publicação autorizada pelo usuário. A configuração `.openai/hosting.json` e o relatório `docs/publication.json` registram também a hospedagem anterior no Sites; o endereço público principal acima usa GitHub Pages.

## Seus próprios vídeos

Use “Abrir vídeo do aparelho” no menu do perfil ou no rodapé. O vídeo não é enviado ao servidor. Para cadastrar vídeos compartilhados no catálogo, siga [COMO-ADICIONAR-VIDEOS.md](COMO-ADICIONAR-VIDEOS.md). Não é necessário programar uma API.


## Administração e Supabase

Abra `admin.html` pelo link **Painel do administrador**. O backend é o projeto Supabase `cinema-rea` (`uekfarmkhpeuiyfgxxio`), região São Paulo. Apenas a URL e a chave publicável ficam em `dist/cloud-config.mjs`; senhas e chaves administrativas não fazem parte do código.

O painel usa e-mail/senha, autorização no banco, uploads TUS, capa opcional, rascunhos e publicação explícita. Catálogo e avisos atualizam com Realtime ou consulta a cada 10 segundos enquanto a página está aberta. Não inclui notificações push com o site fechado.

Leia [o guia do painel](docs/PAINEL-ADMIN.md), [a configuração do backend](docs/BACKEND.md) e [o controle de acesso de espectadores](docs/VIEWER-ACCESS.md). Para habilitar o primeiro administrador é necessário autorizar o e-mail dele na lista do servidor, criar a conta e confirmar o e-mail. Uma conta de teste foi criada a pedido do proprietário; o acesso é entregue fora do repositório. Use Alterar minha senha no painel para trocá-la.

### Configurar cadastro, confirmação e recuperação de senha

No painel Supabase do projeto, em **Authentication → URL Configuration**, configurar:

- **Site URL:** `https://p0blok0wan.github.io/test/`
- **Redirect URLs:** `https://p0blok0wan.github.io/test/login.html` e `https://p0blok0wan.github.io/test/admin.html`
- Para desenvolvimento local, adicionar separadamente `http://127.0.0.1:4190/login.html` e `http://127.0.0.1:4190/admin.html`, somente se utilizados.

O formulário de espectador usa `login.html` para confirmação e recuperação; o painel usa `admin.html`. São páginas estáticas existentes, sem rotas de servidor. Preservar o prefixo `/test/` e não usar curingas amplos. Manter a confirmação de e-mail habilitada e o login anônimo do Supabase desabilitado.

Em **Authentication → Email → SMTP Settings**, configurar SMTP próprio legítimo: host, porta, usuário, senha do provedor e remetente verificado. Guardar a senha apenas nas configurações privadas do serviço. Conferir também as cotas e limites de envio do provedor. O envio padrão de desenvolvimento do Supabase é restrito e não garante mensagens a todos os usuários reais. Falhas no envio precisam ser corrigidas no SMTP; não desabilitar a confirmação de e-mail para contorná-las.

Aplicar `backend/viewer-access.sql` como migração `cinema_viewer_access`, depois das migrações existentes: visitantes sem sessão não recebem os títulos do banco nem conseguem gerar links assinados de mídia. Contas confirmadas veem os títulos publicados; somente a allowlist administrativa permite escrita. Arquivos estáticos do GitHub Pages e vídeos públicos do Drive continuam públicos. Verificar cadastro, mensagem recebida, confirmação, login, logout e recuperação com uma caixa de e-mail autorizada; testes com sessões existentes não comprovam entrega de e-mail.

O upload direto ao Supabase está limitado a **50 MiB por vídeo**, com **5 MiB por capa**. Filmes longos precisam de cotas/serviço adequados. O plano pago não foi contratado. Novos uploads ficam no Storage, não no GitHub.

### Recompilar o cliente

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:browser
npm run test:admin
```

`test:admin` usa backend simulado para verificar a interface. `test:security` exige sessões temporárias reais em variáveis de ambiente; sem elas, registra skip. O teste específico de espectadores pode ser executado com `node --test --test-isolation=none tests/viewer-access.test.mjs`, usando as mesmas variáveis documentadas no [guia de acesso](docs/VIEWER-ACCESS.md). `tests/cloud-browser.mjs` recebe credenciais de contas temporárias por stdin e testa login, upload e atualização de outro navegador contra Supabase real. Nunca grave essas credenciais em arquivos ou Git.


## Buscar título, descrição e classificação

O painel possui **Informações do filme**: digite o título, busque, selecione o filme correto e use **Aplicar ao formulário**. A integração preenche título, sinopse, ano, duração, gêneros, direção e classificação brasileira quando disponíveis. Campos ausentes exigem revisão manual; não se convertem classificações de outros países em brasileiras.

É necessário obter sua própria chave gratuita para uso não comercial em https://www.themoviedb.org/settings/api e cadastrá-la em **Configurar chave do TMDB** no painel. Nunca envie a chave no chat ou no GitHub. O segredo fica no backend protegido. O código já está integrado e a função Supabase `movie-metadata` está publicada, mas consultas reais ao TMDB dependem dessa credencial.

Leia [como configurar e usar](docs/METADADOS.md) e [a documentação técnica](docs/TMDB.md). Os testes da busca usam respostas controladas, pois nenhuma chave real do TMDB foi fornecida. A verificação real do backend cobre autenticação, segredo inacessível, integração sem chave e erros de configuração.

Guia de publicação, contas e envio de vídeos: [docs/GITHUB-PAGES.md](docs/GITHUB-PAGES.md).

## Área pessoal e player Streamlab

Abra **Minha Streamlab** no menu inferior ou no menu de perfis para ver favoritos, curtidas e progresso. Escolha um dos nove avatares originais ao editar o perfil. A biblioteca é sincronizada na conta Supabase; outro aparelho recupera os dados ao abrir/recarregar o site. Alterações offline ficam no aparelho e conflitos exigem escolha explícita. Veja [SYNC](docs/SYNC.md) e [área pessoal](docs/personal-library.md).

Arquivos MP4 compatíveis e trailers usam o player próprio Streamlab. Vídeos incorporados do Google Drive/YouTube usam os controles do provedor e não oferecem sincronização de progresso ao site. Veja [player](docs/PLAYER.md). O player não converte vídeos nem adiciona hospedagem.

A avaliação dos três projetos sugeridos está em [REPOSITORY-REVIEW](docs/REPOSITORY-REVIEW.md). Nenhum código desses repositórios foi incorporado nesta entrega.

O painel oferece quatro etapas (Vídeo, Informações, Capa e Revisão), prévia e modo rápido opcional. Salvar cria rascunho; publicar exige ação separada. Veja [ADMIN-WIZARD](docs/ADMIN-WIZARD.md).
