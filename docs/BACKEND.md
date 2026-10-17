# Catálogo e painel administrativo

O frontend usa Supabase Auth, Postgres com RLS e Storage privado. A chave publicável pode aparecer no navegador; senha, chave secreta e `service_role` nunca podem aparecer no frontend ou neste repositório. O site hospedado e o backend têm controles de acesso independentes: o acesso privado do Sites não protege automaticamente os endpoints do Supabase.

## Estrutura e contrato

`backend/schema.sql` é o esquema inicial para um projeto dedicado. Aplicar como migração `cinema_catalogue`, seguido de `backend/drive-links.sql` como `cinema_drive_links` para habilitar links do Drive. Os arquivos preservam registros existentes, mas não devem substituir migrações de outro projeto com tabelas homônimas. RLS fica habilitado antes dos grants. Não modificam tabelas de autenticação nem criam usuários ou senhas.

- `public.cinema_videos`: título, sinopse, classificação brasileira, duração, ano, gêneros, tipo, diretor, créditos, fonte do vídeo, caminhos de arquivos e status `draft`/`published`.
- `public.cinema_admins`: allowlist de e-mails em minúsculas. Sem acesso de leitura ou escrita por `anon` e `authenticated`.
- `private.is_cinema_admin()`: procura o usuário autenticado existente em `auth.users`, exige e-mail confirmado e presença na allowlist. Não usa metadados editáveis pelo usuário nem aceita parâmetro de identidade. `SECURITY DEFINER` restrito a essa consulta interna, schema não exposto e `search_path` vazio.
- `public.cinema_admin_access()`: RPC booleana `SECURITY INVOKER`, disponível apenas para sessões autenticadas; não divulga a allowlist.
- Bucket `cinema-media`: privado, MP4/JPEG/PNG/WebP, máximo de 50 MiB por arquivo. O painel limita capas a 5 MiB; o limite de 50 MiB do bucket também é validado pelo serviço. MIME/extensão não substituem inspeção de conteúdo; enviar apenas mídia própria e confiável.

Os caminhos são `video/<uuid>.mp4` e `cover/<uuid>.jpg` (também `.jpeg`, `.png`, `.webp`). UUIDs evitam nomes fornecidos por usuários e colisões. Somente administradores podem enviar, substituir e excluir objetos. Visitantes podem ler somente objetos referenciados por registros publicados. Rascunhos e uploads órfãos permanecem privados. Se o registro não for salvo, os arquivos permanecem privados. O painel tenta reutilizar o envio na mesma sessão; arquivos órfãos podem ser removidos pelo administrador no Storage.

## Primeiro administrador

O operador deve cadastrar uma conta legítima no Supabase Auth, confirmar seu e-mail e inserir exatamente esse e-mail normalizado na allowlist por conexão administrativa ou SQL Editor. Use parâmetro de consulta; nunca inclua senha no SQL. Exemplo com marcador que precisa ser substituído pelo proprietário:

```sql
insert into public.cinema_admins(email)
values (lower(btrim('SEU_EMAIL_CONFIRMADO')))
on conflict (email) do nothing;
```

Esse comando não cria conta nem define senha. Cadastro de conta ou alteração de `user_metadata` não concede permissão de administração. Uma conta não confirmada também não é administradora. A remoção da allowlist ou do usuário bloqueia operações posteriores mesmo com token ainda válido, porque a autorização consulta o estado atual do banco. Configure senha forte, limites de tentativas e MFA quando possível.

## Publicação e novidades

No modo upload, enviar os arquivos primeiro e manter o registro em rascunho até confirmar o sucesso. No modo Drive, cadastrar o link compartilhado de cada arquivo e conferir o acesso e a reprodução antes de publicar. Publicar altera `status` para `published`; o catálogo consulta os registros compartilhados sem precisar de novo deploy. Se existir a publication `supabase_realtime`, a migração inicial adiciona somente `cinema_videos` a ela. O frontend deve usar atualização periódica como alternativa quando Realtime estiver indisponível. A interface pode avisar de novos itens enquanto está aberta; isso não implementa push, SMS ou e-mail.

Os visitantes não precisam de uma conta para ver os registros publicados neste modelo. Para catálogo exclusivo de assinantes, é necessário acrescentar autorização de assinaturas em todas as políticas de leitura; o login de administrador não fornece essa funcionalidade.

## Links de reprodução e limites

Arquivos privados são reproduzidos por URLs assinadas temporárias, geradas com a chave publicável e RLS. Assinar requer `SELECT` no objeto; o cliente deve assinar novamente quando necessário. O cliente usa links de uma hora. Links já emitidos podem continuar funcionando até a própria expiração após despublicar; a API de assinatura também pode aceitar outros prazos permitidos pelo provedor. Não se trata de DRM. O cliente não deve armazenar URLs assinadas como identificadores permanentes.

50 MiB é um limite deliberado compatível com o upload gratuito inicial, não uma solução para filmes longos. Verifique cotas de armazenamento e tráfego do projeto. Vídeos maiores precisam de plano e limite apropriados ou serviço de vídeo dedicado. Nenhum plano pago é contratado por este esquema. A API não transcodifica arquivos: MP4 com H.264 e AAC oferece maior compatibilidade.

## Vídeos compartilhados pelo Google Drive

`backend/drive-links.sql` acrescenta `video_source` (`upload` ou `drive`) e `drive_url`. Registros existentes recebem `upload` sem mudar seus arquivos. No modo upload, `video_path` continua obrigatório e `drive_url` deve ser nulo. No modo Drive, `video_path` deve ser nulo e `drive_url` obrigatório. A validação antiga do caminho MP4 é preservada; a possibilidade de nulo serve somente ao modo Drive. A migração não altera RLS, administradores, bucket ou permissões.

O banco aceita exclusivamente o formato canônico abaixo, com ID de 10 a 200 caracteres entre letras ASCII, números, `_` e `-`. A chave de recurso é opcional e aceita os mesmos caracteres, entre 1 e 200 posições:

```text
https://drive.google.com/file/d/ID_DO_ARQUIVO/view
https://drive.google.com/file/d/ID_DO_ARQUIVO/view?resourcekey=CHAVE_DO_RECURSO
```

Links com outro host, protocolo, fragmento ou parâmetro são recusados pelo banco. O formulário pode normalizar links de compartilhamento aceitos antes de salvar, descartando parâmetros como `usp` e preservando `resourcekey`. Somente o administrador autorizado pode salvar esses registros. A validação confirma o formato; não comprova propriedade, permissão pública, disponibilidade ou conteúdo do arquivo.

O proprietário envia o vídeo ao próprio Drive, configura compartilhamento legítimo para visualização por quem tiver o link e cola o link de **cada vídeo** no painel. Não há integração de listagem de pastas, sincronização automática, upload ao Drive ou acesso à conta do Google por API. O site usa a visualização incorporada oficial em `iframe`, derivando `/preview` do ID validado e mantendo a chave de recurso quando houver. O link `/view` não é uma URL MP4 para o elemento HTML `video`.

O limite de 50 MiB do bucket do site não se aplica ao vídeo que permanece no Drive; capas enviadas ao site continuam sujeitas aos limites existentes. O Drive mantém suas próprias cotas, permissões e restrições: ele pode exigir processamento, impedir a incorporação, limitar tráfego ou tornar o vídeo indisponível. Não há promessa de espaço ou reprodução ilimitados. O player externo não oferece ao site os eventos e controles do player nativo; não prometer progresso salvo, retomada, autoplay ou observação do término.

O compartilhamento do Drive é independente do status do catálogo. Despublicar remove a entrada do site, mas não revoga links já compartilhados do Drive. Se o conteúdo precisar ficar privado, altere também suas permissões no Google Drive. Um link público permite acesso a quem o receber; login administrativo e acesso privado ao site não o transformam em conteúdo exclusivo de assinantes.

## Verificação de segurança

`tests/schema.test.mjs` contém um teste de integração HTTP real e optativo. Não interpreta SQL por expressões regulares nem simula RLS. Forneça somente em memória/ambiente de processo, num projeto dedicado de teste, as variáveis `CINEMA_TEST_SUPABASE_URL`, `CINEMA_TEST_PUBLISHABLE_KEY`, `CINEMA_TEST_ADMIN_JWT` e `CINEMA_TEST_VIEWER_JWT` (sessão autenticada comum fora da allowlist). Executar `node --test tests/schema.test.mjs`. Sem essas configurações o teste é explicitamente ignorado, não considerado uma verificação do banco. Cria um registro e uma capa temporários e tenta removê-los em `finally`; falhas de rede podem exigir limpeza manual.

O teste verifica permissão real de escrita, allowlist inacessível, login de administrador versus usuário comum, rascunho invisível, upload restrito, assinatura bloqueada para rascunho, publicação visível e bloqueio de novas assinaturas após despublicação. Também verificar com consultas transacionais: usuário com e-mail não confirmado é recusado; alterar metadados não promove usuário; UUID e classificações inválidos são recusados; bucket não é público. Rodar advisors do Supabase após aplicar e revisar todas as políticas preexistentes de `storage.objects`, pois políticas permissivas de outros projetos podem ampliar acesso.

Após aplicar `cinema_drive_links`, verificar no banco real, dentro de transação com rollback: upload antigo permanece válido; Drive canônico com e sem `resourcekey` é aceito; fonte desconhecida, ID curto/longo, host externo, parâmetros extras, link nulo, `video_path` preenchido para Drive e `drive_url` preenchido para upload são recusados. Verificar também que visitantes continuam sem ler rascunhos nem escrever registros, e que capas de vídeos Drive publicados continuam acessíveis pela política existente. A reprodução pelo Drive precisa de um arquivo real autorizado com compartilhamento habilitado; somente testar a URL ou o HTML do iframe não comprova reprodução.

## Documentação consultada

Verificada em 17/10/2026: changelog oficial (incluindo atualização de cifras TLS e versões Postgres), [buckets privados](https://supabase.com/docs/guides/storage/buckets/fundamentals), [RLS de Storage](https://supabase.com/docs/guides/storage/security/access-control) e [helpers de Storage](https://supabase.com/docs/guides/storage/schema/helper-functions). O esquema não altera o schema `realtime`; utiliza apenas publicação PostgreSQL existente.
