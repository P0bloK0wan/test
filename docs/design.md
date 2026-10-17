# Reconstrução web independente

## Objetivo e escopo
O usuário forneceu um APK e pediu refazê-lo como site. O REA identificou com.netflix.mediaclient, versão 9.87.1 build9 74701, 48.033 classes. Recursos citam navegação, busca, lista, perfis, avaliação e reprodução. O APK não foi executado e não se conhece o catálogo/servidor privado; a geometria das telas não foi recuperada. A versão web será uma implementação própria inspirada nesses padrões, em português, responsiva, com conteúdo aberto Blender Studio.

## Escolhas
1. HTML/CSS/ES modules buildless: suficiente para catálogo próprio e estado local, sem dependências ou backend fictício. Escolhido.
2. React/Next: útil ao crescer para múltiplas integrações; adicionaria instalação/build sem necessidade neste escopo.
3. Backend próprio com contas remotas: exige requisitos de contas e infraestrutura não fornecidos; fica fora desta primeira entrega, sem apresentar perfis locais como autenticação.

## Comportamento
Página inicial com destaque cinematográfico, categorias e trilhos de filmes. Busca normaliza acentos e combina filtros. Cada filme tem detalhes, sinopse e crédito. Minha lista, avaliações, progresso e preferências são isolados por perfil e persistem neste navegador. Perfis podem ser criados, editados, alternados e removidos, respeitando limite e estado infantil. Player de trailer usa mídia aberta local e registra progresso; filmes completos usam incorporações oficiais do autor, com alternativa para abrir no canal. Não atribuir um trailer a outro filme. Sem coleta de credenciais, login simulado ou chamadas a servidores Netflix.

## Visual
Base #141414, preto #080808, texto #f5f5f1, cinza #b3b3b3, vermelho #e50914. Tipografia sans de interface; título SINTEL em serif expressiva. Layout cinematográfico de bordas retas, foco no grande frame de Sintel, gradiente funcional para leitura e trilhos de cards16:9. Navegação fixa limpa, controles acessíveis44px, foco visível, diálogos com Escape/restauração de foco, movimento reduzido e nenhum autoplay com som. Mobile com trilhos por gesto e navegação compacta, sem overflow da página. Imagens próprias do filme sob licença aberta, nenhum asset retirado do APK.

## Fontes de verdade
Catálogo em catalog.mjs. Estado e validações em library.mjs; busca em catalog-query.mjs. Controller app.mjs só coordena DOM, navegação e player. URLs externas devem vir do catálogo fechado, sem credenciais ou entrada de usuário interpolada em HTML. Persistência inválida/quota indisponível não pode quebrar a navegação.

## Validação
Testes Node de busca/estado/perfis/recuperação e testes reais Chromium de navegação, responsividade, detalhes, favoritos, teclado, troca de perfil e reprodução do trailer. Verificar duração e avanço real do vídeo, não só abertura de modal. Documentar limites das incorporações externas, ausência de backend/contas remotas e de comparação pixel a pixel com runtime Android.

## Publicação
Preparar entrega local revisável. O usuário estabeleceu anteriormente que não devem ser publicados projetos sem autorização apropriada; não publicar o site antes dessa autorização. Atualização: o usuário autorizou expressamente a publicação, agora em execução.
