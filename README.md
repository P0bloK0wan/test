# Netflix Web — implementação independente

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

Busca por títulos/gêneros/sinopse, filtros, detalhes, minha lista, avaliações, até 5 perfis com listas separadas, filtro infantil, preferências, progresso real dos trailers e retomada, leitura de novidades, ajuda/créditos e player. Perfil e lista persistem neste navegador; o login de administrador usa Supabase, e as listas não sincronizam entre dispositivos.

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
- docs/browser-results.json: 18 verificações reais de navegador aprovadas.
- docs/desktop.png e docs/mobile.png: capturas reais.
- docs/node-tests.log: 9 testes aprovados.

Não inclui o APK original nem código decompilado dele. Mantém assets abertos e atribuições. Publicação autorizada pelo usuário. A identidade de hospedagem está em .openai/hosting.json; o relatório de publicação fica em docs/publication.json.

## Seus próprios vídeos

Use “Abrir vídeo do aparelho” no menu do perfil ou no rodapé. O vídeo não é enviado ao servidor. Para cadastrar vídeos compartilhados no catálogo, siga [COMO-ADICIONAR-VIDEOS.md](COMO-ADICIONAR-VIDEOS.md). Não é necessário programar uma API.


## Administração e Supabase

Abra `admin.html` pelo link **Painel do administrador**. O backend é o projeto Supabase `cinema-rea` (`uekfarmkhpeuiyfgxxio`), região São Paulo. Apenas a URL e a chave publicável ficam em `dist/cloud-config.mjs`; senhas e chaves administrativas não fazem parte do código.

O painel usa e-mail/senha, autorização no banco, uploads TUS, capa opcional, rascunhos e publicação explícita. Catálogo e avisos atualizam com Realtime ou consulta a cada 10 segundos enquanto a página está aberta. Não inclui notificações push com o site fechado.

Leia [o guia do painel](docs/PAINEL-ADMIN.md) e [a configuração do backend](docs/BACKEND.md). Para habilitar o primeiro administrador é necessário autorizar o e-mail dele na lista do servidor, criar a conta e confirmar o e-mail. Uma conta de teste foi criada a pedido do proprietário; o acesso é entregue fora do repositório. Use Alterar minha senha no painel para trocá-la. Para contas reais, a configuração de SMTP e URLs de confirmação/recuperação deve ser feita no painel Supabase; a integração disponível nesta sessão não oferece edição dessas opções.

O upload direto ao Supabase está limitado a **50 MiB por vídeo**, com **5 MiB por capa**. Filmes longos precisam de cotas/serviço adequados. O plano pago não foi contratado. Novos uploads ficam no Storage, não no GitHub.

### Recompilar o cliente

```sh
npm ci --ignore-scripts
npm run build
npm test
npm run test:browser
npm run test:admin
```

`test:admin` usa backend simulado para verificar a interface. `test:security` exige sessões temporárias reais em variáveis de ambiente; sem elas, registra skip. `tests/cloud-browser.mjs` recebe credenciais de contas temporárias por stdin e testa login, upload e atualização de outro navegador contra Supabase real. Nunca grave essas credenciais em arquivos ou Git.
