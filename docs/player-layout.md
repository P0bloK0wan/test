# Player mobile: layout

O player mantém todos os controles visíveis. A barra de título, mídia com controles e créditos são linhas independentes no fluxo do diálogo; créditos não ficam posicionados por cima do vídeo. Textos longos quebram sem ampliar a largura da tela. Em telas horizontais baixas, o diálogo pode rolar verticalmente para preservar a área dos controles.

A tela cheia usa vídeo flexível e reserva uma linha própria aos controles, sem estimar uma altura fixa para a barra. Os controles continuam com área mínima de 44 px. O iframe externo preserva seu próprio player.

Verificação preparada em `tests/player-layout-browser.mjs`: abre o site real com o caminho de visitante de `access.mjs`, substituindo somente o transporte cloud indisponível; abre o trailer real de Sintel e verifica posições de título, palco, controles e créditos em 320×640, 390×844 e 844×390. Verifica ausência de overflow horizontal, tamanho dos botões e erros JS. Não exige o backend nem faz afirmações sobre Safari real.

Comando: `node tests/player-layout-browser.mjs`. A sintaxe foi validada localmente. A execução Chromium deve ser feita pelo agente principal com as permissões já disponíveis; este agente não executou o navegador nesta etapa.
