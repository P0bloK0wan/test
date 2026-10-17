# Player próprio Streamlab

O módulo streamlab-player.mjs controla o elemento HTML5 video de trailers locais e vídeos MP4 compatíveis enviados ao catálogo. Oferece reprodução/pausa, voltar/avançar 10 segundos, linha do tempo, volume, silenciar, velocidade e controles de tela cheia/janela flutuante quando suportados. Em iPhone, volume e tela cheia obedecem às limitações do Safari e do sistema.

Os controles funcionam com teclado quando o player está focado (espaço/K, setas esquerda/direita e M). Campos e botões mantêm seus comportamentos de teclado. Controles têm alvos de toque e nomes acessíveis. Erros restauram os controles nativos. O progresso continua sendo registrado pela biblioteca e sincronizado para vídeos do catálogo compatíveis.

Drive e YouTube são iframes de terceiros, sem acesso ao elemento de vídeo. Mantêm seus próprios controles e não fornecem progresso para o site. Links públicos do Drive permanecem públicos fora do site. O player próprio não converte arquivos, não fornece filmes nem transforma um link de compartilhamento do Drive em stream direto. HLS, seleção de qualidade, dublagem e legendas externas não estão implementados nesta entrega.

Teste: node tests/player-browser.mjs. Usa MP4 local autorizado para confirmar reprodução real, pausa, seek, velocidade, volume, silenciar, teclado, layout móvel, fallback de erro e limpeza dos listeners. Picture-in-picture e tela cheia dependem do navegador e não equivalem a teste manual em um iPhone físico.

A opção de abrir arquivo do aparelho foi retirada do site nesta revisão. O envio de vídeos pelo administrador continua disponível.
