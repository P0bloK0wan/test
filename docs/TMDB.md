# Metadados de filmes pelo TMDB

O administrador pesquisa um título e escolhe o filme para preencher título, sinopse, ano, duração, gêneros, diretor e classificação brasileira. Os dados são sugestões editáveis: confira antes de publicar. O TMDB fornece metadados, não fornece os seus arquivos de vídeo nem permissões para distribuí-los.

## Configuração

1. O proprietário cria a própria credencial no site oficial do TMDB, aceitando os termos aplicáveis ao uso do projeto.
2. No painel administrativo do cinema, informa a chave API de 32 caracteres hexadecimais ou o token de leitura da API.
3. O servidor valida a credencial consultando `/3/configuration` antes de salvá-la. O painel recebe somente se a integração está configurada, nunca a credencial armazenada.
4. Para retirar a integração, usar a ação de remoção do painel. Ela apaga a configuração no servidor.

Não envie a credencial no chat, não coloque em arquivos públicos e não a adicione ao GitHub. Ela é enviada por HTTPS ao backend e armazenada em `private.cinema_integrations`, sem permissões de leitura ou escrita para visitantes e sessões comuns. Operadores com acesso administrativo ao banco ainda podem vê-la: o campo não é um cofre criptográfico. Se houver exposição, revogue a credencial no TMDB e configure outra.

Aplicar `backend/tmdb-integration.sql` como migração `cinema_tmdb_integration`, depois do esquema inicial. Publicar a função `movie-metadata` a partir de `supabase/functions/movie-metadata/index.mjs`. O servidor precisa de `SUPABASE_URL`, `SUPABASE_ANON_KEY` e `SUPABASE_SERVICE_ROLE_KEY`; esta última permanece exclusivamente no ambiente da função. Habilitar a validação JWT da plataforma quando compatível, além da validação explícita da sessão e do papel administrativo feita pelo próprio handler.

## API e segurança

Todas as ações usam POST JSON com `Authorization: Bearer <sessão Supabase>`. Antes de consultar configuração ou TMDB, a função verifica a sessão no Auth e consulta `cinema_admin_access`. Ausência ou expiração de sessão retorna 401; usuário fora da allowlist retorna 403. CORS aceita somente o endereço oficial deste site e previews HTTP em `localhost`/`127.0.0.1`; CORS não substitui a autorização. As credenciais e os corpos de erros do provedor não são registrados nem repassados ao navegador.

- `status` retorna `{ configured: boolean }`.
- `configure`, com `token` string ou `null` para remover, retorna `{ configured: boolean }`.
- `search`, com `query` de 2 a 160 caracteres, retorna até oito resultados `{ id, title, originalTitle, year, overview }`.
- `details`, com `id` inteiro positivo, retorna `{ movie: { title, synopsis, year, minutes, genres, director, age } }`.

A pesquisa utiliza idioma `pt-BR`, região `BR` e `include_adult=false`. Requisições externas usam host fixo `api.themoviedb.org`, timeout e rejeitam redirecionamentos. IDs e consultas não podem escolher o host. Limites do provedor retornam erro 429 sem detalhes sensíveis; o painel deve permitir tentar novamente depois.

A classificação vem somente de registros brasileiros. Ordem preferida dos tipos de lançamento: 3, 4, 5, 6, 2, 1. `L` ou `Livre` viram zero; 10, 12, 14, 16 e 18 são mantidos. Classificação ausente ou desconhecida permanece `null`, nunca vira Livre automaticamente. Não se convertem classificações americanas em brasileiras. A pessoa responsável precisa preencher/revisar campos ausentes antes de publicar.

## Créditos e termos

O TMDB exige crédito e logo conforme sua documentação. Incluir na interface a identificação e o aviso oficial: “This product uses the TMDB API but is not endorsed or certified by TMDB.” O uso gratuito da API é destinado a projetos não comerciais conforme os termos do provedor; uso comercial requer verificar a licença apropriada diretamente com o TMDB. Os termos atuais prevalecem. Referências oficiais: [API](https://developer.themoviedb.org/docs/getting-started), [autenticação](https://developer.themoviedb.org/docs/authentication-application), [FAQ e uso](https://developer.themoviedb.org/docs/faq).

## Verificação e limites observados

`node --test tests/metadata-handler.test.mjs` testa o handler portátil com respostas externas controladas: barreira de autenticação, autorização administrativa, isolamento da credencial, host fixo, configuração, pesquisa, detalhes, classificação e CORS. Esses testes não comprovam consulta real ao TMDB. Nenhuma credencial real do TMDB foi fornecida na implementação inicial; a validação externa de busca e importação depende da configuração legítima pelo proprietário no painel. Após aplicar a migração, verificar no banco real que `anon` e `authenticated` não conseguem ler `cinema_integrations` nem executar `cinema_metadata_secret`, que usuário comum não configura a integração, e que apenas `service_role` consegue ler o segredo pela RPC.
