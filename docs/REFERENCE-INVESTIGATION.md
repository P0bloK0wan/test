# Referências e validação — 17/10/2026

O segundo APK foi analisado estaticamente pelo REA 6.5.0, sem execução. Pacote `com.appplayysmartt`, versão `smart-play-2.0`, código 22; SHA-256 `3b5a7f35f4a390d8a422741855b71c16ba3cd70681370e9bf419f45a786eda74`. Cinco operações REA concluíram com código zero. Declarações de EpisodesActivity confirmam modelos de temporadas/episódios; ExoPlayerActivity referencia AndroidX Media3, legendas e SkipIntroController. Isso não comprova funcionamento em runtime. Código e assets do APK não foram incorporados ao site.

A implementação original do Streamlab acrescenta temporadas e episódios publicados, seleção no detalhe e no player, lista lateral no desktop e abaixo no celular. O painel oferece os quatro campos opcionais. A migração Supabase `cinema_episodes` foi aplicada com sucesso; mantém RLS existente.

O arquivo de episódio fornecido é MPEG-TS (.ts), H.264 1920×1080 e AAC, conforme amostra de 10 MiB. A duração da amostra não é a duração do episódio. No teste Chromium do preview público Google Drive, o elemento de vídeo permaneceu com readyState 0 e currentTime 0; reprodução não confirmada. O episódio não foi publicado como se estivesse funcionando. Será necessário testar uma versão MP4 ou outra hospedagem compatível. Não há transcodificação nem controle do iframe pelo player próprio.

A capa PNG fornecida, 1672×941, foi preservada em `dist/assets/catalog/apothecary-diaries.png`. O link apresentado como demonstração continha essa capa; a captura Netflix enviada no chat é referência visual. Não foram inventados duração, classificação oficial ou metadados de episódios futuros.

Testes específicos: 4 testes unitários de episódios; 6 verificações de navegação/player no Chromium com MP4 local e episódios fictícios; 12 verificações do painel com backend simulado; 32 testes unitários existentes. Esses testes não comprovam reprodução do episódio do Drive.

Evidências completas permanecem no workspace: `investigations/apk-reference-2/` e `investigations/drive-video-episode/`. Nenhum APK ou vídeo integral foi publicado no GitHub.

Regressão: 18 verificações gerais de navegador passaram. Layout validado em larguras 320, 375, 390, 768, 1024 e 1440; player em 320×640, 390×844 e 844×390. Teste de preferências ajustado para aguardar a inicialização após reload.
