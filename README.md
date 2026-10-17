# Netflix Web — implementação independente

Site responsivo funcional, baseado em investigação estática do APK fornecido e em código original. Catálogo com 11 filmes abertos; não utiliza servidores, contas ou conteúdo privado da Netflix.

## Abrir localmente

Requer Node.js 22.19+ (testado com 24.19). Não é preciso instalar dependências para executar o site.

```sh
cd netflix-web
node server.mjs
```

Abra http://127.0.0.1:4190. Ctrl+C encerra o servidor. A porta pode ser escolhida com a variável PORT. Abrir index.html diretamente por file:// não carrega os módulos corretamente: use o servidor ou hospedagem estática.

## Funcionalidades

Busca por títulos/gêneros/sinopse, filtros, detalhes, minha lista, avaliações, até 5 perfis com listas separadas, filtro infantil, preferências, progresso real dos trailers e retomada, leitura de novidades, ajuda/créditos e player. Perfil e lista persistem neste navegador; não há login remoto ou sincronização entre dispositivos.

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
- docs/browser-results.json: 17 verificações reais de navegador aprovadas.
- docs/desktop.png e docs/mobile.png: capturas reais.
- docs/node-tests.log: 7 testes aprovados.

Não inclui o APK original nem código decompilado dele. Mantém assets abertos e atribuições. Publicação autorizada pelo usuário. A identidade de hospedagem está em .openai/hosting.json; o relatório de publicação fica em docs/publication.json.

## Seus próprios vídeos

Use “Abrir vídeo do aparelho” no menu do perfil ou no rodapé. O vídeo não é enviado ao servidor. Para cadastrar vídeos compartilhados no catálogo, siga [COMO-ADICIONAR-VIDEOS.md](COMO-ADICIONAR-VIDEOS.md). Não é necessário programar uma API.
