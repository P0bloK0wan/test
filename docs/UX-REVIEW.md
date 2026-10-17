# Revisão Streamlab: interface, animações e player

Escopo autorizado: itens recomendados 1, 2, 3, 5, 6, 10, 12 e 18, acrescidos de animações; retirar “Abrir vídeo do aparelho”. Não foram adicionadas novas funcionalidades de acessibilidade. Comportamentos existentes foram preservados.

## Alterações e problemas corrigidos

- Retirada a opção de arquivos do aparelho do rodapé, menu, ajuda, entrada oculta e ações do player. Upload administrativo continua disponível.
- Link Entrar explícito para visitante, oculto após validação da conta. Cabeçalho tablet em duas linhas; busca móvel ocupa linha própria para não cobrir a marca.
- Menu inferior com espaçamento uniforme e área segura do dispositivo. Conteúdo/rodapé preservam espaço para a navegação fixa.
- Capas normais padronizadas em 16:9. Ranking mantém formato próprio. Botões móveis maiores foram separados da capa nos grids: durante o teste, a área expandida dos controles interceptava o toque no centro da imagem; posicionamento foi corrigido e teste de abertura voltou a passar.
- Texto, espaçamento e áreas de toque ampliados. Cores Streamlab preservadas.
- Carregamento inicial visível durante validação, em vez de ocultar todo o body. Validação de sessão tem limite de oito segundos; visitante pode continuar no modo público após indisponibilidade. Administração mantém bloqueio seguro.
- Falha de carregamento de módulos mostra botão para tentar novamente. Consulta do catálogo tem prazo de dez segundos e recuperação explícita sem apagar títulos já carregados.
- Título, vídeo, controles e créditos do player em áreas separadas; rolagem em telas baixas evita sobreposição em paisagem.
- Transições de botões, seleção dos menus, entrada de diálogos/fileiras e animação limitada dos espaços de carregamento. Preferência de movimento reduzido já existente continua respeitada.

## Verificação executada

- Layout de catálogo, busca fechada/aberta, cabeçalho e cards: 320, 375, 390, 768, 1024 e 1440px, sem overflow horizontal ou interseção dos elementos principais.
- Player: 320×640, 390×844 e 844×390; cabeçalho, controles e créditos sem sobreposição. MP4 autorizado real reproduziu, pausou e avançou.
- Carregamento com autenticação atrasada; falha/retentativa de catálogo; Entrar visível ao visitante e oculto à conta.
- Navegação e biblioteca: baseline de 18 verificações, área pessoal e conta de visitante passaram. 32 testes Node passaram.
- Captura de referência móvel: docs/polish-mobile.png. A navegação fixa aparece na posição do viewport em capturas de página inteira; isso não significa que esteja no meio da tela durante navegação normal.

## Limites

Verificação por Chromium com tamanhos de viewport, não em iPhone físico. Reprodução de um vídeo real do proprietário no Google Drive e envio de confirmação de cadastro continuam pendentes de vídeo e SMTP, respectivamente. Nenhuma migração do Supabase foi necessária nesta revisão.

## Verificação após publicar

GitHub Pages concluiu a publicação do commit de distribuição 8e7022df915e3726e9eff302f437512534147373. `tests/site-smoke.mjs` passou no endereço público: catálogo e Entrar visíveis em 375/768/1440px; abertura de detalhes sem botões interceptando o toque; ausência da opção de arquivo do aparelho; MP4 reproduziu, avançou e pausou; título/controles/créditos separados; busca móvel funcionou.
