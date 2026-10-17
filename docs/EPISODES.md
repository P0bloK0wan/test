# Séries, temporadas e episódios

`backend/episodes.sql`, migração `cinema_episodes`, acrescenta metadados opcionais a `public.cinema_videos`. Um episódio continua sendo um registro de vídeo com a fonte, capa, classificação, sinopse, créditos e status já existentes. A migração não publica registros, não altera RLS, não concede privilégios e não muda as regras de acesso a arquivos. Filmes existentes continuam com os novos campos nulos.

## Campos

| Campo | Regra |
| --- | --- |
| `series_title` | Nome da série entre 1 e 160 caracteres, sem espaços nas extremidades. Nulo para filme independente. |
| `season` | Inteiro de 1 a 100. |
| `episode` | Inteiro de 1 a 10000. |
| `episode_title` | Subtítulo opcional, até 160 caracteres; usar nulo quando não houver. |

`series_title`, `season` e `episode` devem ser informados juntos ou ficar todos nulos. Não é possível salvar somente nome da série ou somente número do episódio. O título principal `title` continua obrigatório pelo esquema original; pode conter a apresentação legível do episódio para o catálogo, enquanto os campos adicionais fornecem a estrutura.

O índice único combina `lower(series_title)`, `season` e `episode`, incluindo somente registros com série. Portanto, `Minha Série`, temporada 1, episódio 2, conflita com `MINHA SÉRIE`, temporada 1, episódio 2. Outro episódio ou outra temporada é permitido. A restrição também vale para rascunhos; retirar um episódio do catálogo não libera uma duplicata. Para corrigir um registro, atualize-o em vez de inserir outro com a mesma combinação. A comparação não remove acentos nem trata nomes alternativos como a mesma série: use uma grafia consistente.

## Cadastro e publicação

O administrador fornece o link do arquivo autorizado e, opcionalmente, a capa; preenche série, temporada e episódio; confere título, sinopse, classificação, duração e créditos; salva como rascunho e publica quando estiver correto. No modo Drive, permanecem válidas as exigências de link canônico e compartilhamento para visualização, bem como os limites do player externo. Acrescentar metadados de episódios não concede licença de conteúdo nem altera permissões no Google Drive.

O catálogo pode organizar a navegação por série e ordenar episódios numericamente por temporada e episódio. Somente metadados não implementam reprodução automática do próximo episódio, importação de listas, acesso a pastas do Drive ou sincronização de progresso de um iframe externo. A implementação da interface deve informar claramente os recursos efetivamente disponíveis.

## Aplicação e verificação

Aplicar a migração após o esquema existente. Os arquivos SQL anteriores são históricos e não precisam ser modificados. Antes de aplicar sobre um projeto que já tenha preenchido essas colunas por outro meio, conferir duplicatas e campos incompletos, pois as restrições rejeitam dados inconsistentes.

Verificar no Postgres real, preferencialmente dentro de transação revertida: filme sem campos de série continua válido; episódio completo é aceito; série sem temporada/episódio é recusada; limites 1/100 para temporada e 1/10000 para episódio são aceitos; valores fora dos limites, nome vazio, nome com espaços nas extremidades e textos acima de 160 caracteres são recusados; a mesma série em outra capitalização não duplica um episódio; outra temporada ou outro episódio é permitido. Conferir também que visitantes e espectadores não ganham escrita e que rascunhos permanecem restritos ao administrador.

A presença da migração no repositório não comprova aplicação remota nem reprodução de um episódio. Essas verificações devem ser registradas separadamente após execução real, utilizando somente arquivos e contas autorizados.
