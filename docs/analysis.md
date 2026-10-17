# Análise do APK e escopo da reconstrução

## Identidade observada

- Arquivo fornecido: Netflix.apk, 282,240,150 bytes. SHA-256 `b82d572c0b0b1f9f42ef0ab7f1afdee4465b9e88c00b30b6db79b671d4ca6b60`.
- Pacote declarado: `com.netflix.mediaclient`. Versão `9.87.1 build 9 74701`, versionCode `74701`. SDK mínimo 28, target 37.
- REA 6.5.0 / JADX 0.7.1: 48,033 classes, 6,900 recursos; manifesto recuperado completo.
- Evidence `ev_2c92a2d26a2dfc617e837521904ae293ef7a0053976e205d169beecf8e07120d`. Busca focada recuperou 428 nomes de classes de UI, cobertura reportada completa da consulta, não de todo o funcionamento.
- ZIP contém 9 DEX e componentes nativos em 4 ABIs. Recursos Hawkins/Compose e marcadores Material3 estão presentes.

O pacote se identifica como cliente Netflix; isso não verifica assinatura, autenticidade ou autoria do arquivo. O APK não foi instalado nem executado. Não foram extraídas credenciais, chamadas APIs privadas, investigadas contas ou contornadas proteções.

## O que a evidência estabelece

Manifesto declara entradas de lançamento, player e cadastro. Recursos e 28 rótulos neutros incluem Home, Search, My List, Continue Watching, Manage Profiles, ratings, Audio & Subtitles, Downloads e Episodes. São capacidades candidatas empacotadas, não telas ou interações demonstradas em runtime. A ofuscação e o fato de os serviços serem externos impedem deduzir todo o produto apenas destes bytes.

Os detalhes estão em `/workspace/rea-workspace/investigations/netflix-reference/resource-audit.md` e nos JSONs de evidências do mesmo caso. Esses arquivos de análise e o APK não são incorporados ao site.

## Implementação própria entregue

Website responsivo, português, tema escuro e navegação cinematográfica inspirada nos padrões identificados. Todo o código é novo. Nenhum código ou imagem foi copiado do APK. Catálogo de 11 filmes abertos do Blender Studio, com origens e licenças verificadas.

- Catálogo por gênero, animações, novidades e busca com normalização de acentos.
- Detalhes, sinopses próprias, direção, créditos e avaliação por perfil.
- Até5 perfis locais, edição, exclusão com confirmação, filtro infantil e listas/progresso/preferências separados. Perfis locais não são autenticação de contas remotas.
- Minha lista persistente e retomada do progresso real dos trailers após recarregar.
- Trailers de Sintel e Big Buck Bunny servidos localmente, com player nativo e download autorizado. Filmes completos usam incorporações dos vídeos publicados pelos próprios criadores.
- Notificações editoriais de catálogo com estado lido por perfil, preferências de autoplay/mute, ajuda e créditos.

## Verificação

- 7 testes Node passaram: 6 contratos de estado/busca e 1 integração HTTP cobrindo homepage, módulos, streaming Range/HEAD, pedidos inválidos e traversal.
- 17 verificações reais Chromium passaram: imagens, navegação, busca/filtros, listas, avaliação, criação/edição/exclusão/troca de perfil, filtro infantil, preferências, teclado/foco, vídeo real, seek, persistência/retomada e recuperação após falha de mídia.
- Capturas desktop 1440×1000 e mobile 375×812 revisadas. Sem overflow horizontal da página.
- Falha real403 na homepage e fallback de vídeo foram reproduzidos e corrigidos, com logs de regressão. O skip link foi corrigido para não alterar a rota. A espera do teste de fechamento foi alinhada ao evento assíncrono `close`, sem mudar a lógica de progresso que já funcionava.

## Limitações práticas

Não é réplica pixel a pixel: o runtime Android não foi observado. Não contém catálogo, credenciais, contas, assinaturas, séries/episódios ou infraestrutura privada da Netflix. Não reproduz mecanismos DRM. Player de trailers é local e foi efetivamente reproduzido nos testes. Reprodução dos filmes completos incorporados depende da conectividade e das permissões do canal oficial e não foi validada ponta a ponta; pedidos externos foram bloqueados durante QA.

O estado é deste navegador, sem sincronização ou login remoto. Filtro infantil é uma organização editorial, sem PIN ou controle parental de segurança. Episódios, downloads de filmes completos, notificações push e offline completo não foram implementados. A ação de download disponível é dos dois trailers abertos. O usuário autorizou a publicação na etapa seguinte. Consulte docs/publication.json para o resultado efetivo.
