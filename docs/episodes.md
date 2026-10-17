# Episódios publicados

`dist/episodes.mjs` normaliza os campos opcionais `series_title`, `season`, `episode` e `episode_title`. Nome de série, temporada e episódio precisam estar presentes e válidos para ativar o fluxo de série; não há temporada ou episódio presumido. Episódios sem título específico usam o título já cadastrado. Valores desconhecidos continuam desconhecidos.

Os detalhes agrupam os episódios publicados da mesma série, respeitando o filtro infantil. Temporadas e episódios são ordenados numericamente e o seletor contém somente temporadas com episódios disponíveis. Cada item inicia seu próprio vídeo pelo mesmo fluxo de reprodução já existente. Durante a reprodução, a lista aparece ao lado no desktop e abaixo em telas de até 850px, com destaque no episódio atual. A mudança de temporada altera a lista sem reiniciar o vídeo. A mudança de episódio executa o cleanup do player anterior antes de montar o seguinte.

Nenhum episódio futuro, elenco, qualidade, HDR, download ou controle de abertura é inventado. Incorporações Drive usam o mesmo preview validado e continuam sem acesso ao tempo interno do player. Filmes sem metadados completos de série mantêm seus detalhes e player originais.

Verificar com `node --test --test-isolation=none tests/episodes.test.mjs` e `node tests/episode-browser.mjs`. O navegador usa fixtures de três episódios e um MP4 local, com tráfego externo bloqueado; isso comprova a navegação e o ciclo do player, não a reprodução do arquivo do usuário no Drive.
