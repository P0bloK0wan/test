# Biblioteca privada sincronizada

`backend/library-sync.sql`, migração `cinema_library_sync`, cria `public.cinema_libraries`. Cada conta possui uma linha com biblioteca JSON, revisão e data da última atualização. RLS permite somente leitura, criação e atualização da própria linha pelo UID autenticado. Visitantes não têm privilégios; ser administrador do catálogo não permite ler bibliotecas de outras contas. Operadores e chaves de serviço continuam privilegiados. Exclusão da conta elimina sua biblioteca por chave estrangeira.

O banco valida versão 1, objeto com perfil ativo, entre um e cinco perfis com IDs únicos, campos principais e limite de 512 KiB. O formato interno das avaliações e dos progressos continua sendo normalizado por `library.mjs`; o JSON não armazena senhas, arquivos de vídeo ou links assinados. O trigger exige incremento unitário de revisão. O cliente envia atualização condicionada à revisão anterior, sem `upsert` que substituiria silenciosamente outro dispositivo.

## Integração

```js
const sync = await createLibrarySync({
  client: cloud.client,
  userId: viewer.id,
  storage: window.localStorage,
  onStatus: ({state, message}) => mostrarStatus(state, message),
});
const library = createLibrary(sync.storage);
```

Aguardar a criação do adaptador antes de criar `library`, pois ela lê o estado uma única vez. O adaptador hidrata a versão remota na inicialização, mantendo um cache local por conta: `netflix-web.library.v1.<userId>`. Metadados ficam no mesmo namespace com sufixo `.sync`. A chave antiga global não é importada automaticamente para evitar atribuir dados de outra pessoa à conta atual. Favoritos, perfis, avaliações, preferências, avisos lidos e progresso do player nativo são sincronizados; a reprodução em iframe do Google Drive continua sem fornecer progresso ao site.

`status()` e `onStatus` retornam `{state, message}` com estado `synced`, `pending`, `offline` ou `conflict`. Escritas frequentes são agrupadas por 900 ms. `flush()` tenta enviar as alterações pendentes e aguarda a tentativa corrente, com timeout de oito segundos por operação HTTP. Quando a página fica oculta ou a conexão sinaliza retorno, uma nova tentativa é feita. Essas tentativas não garantem conclusão ao fechar abruptamente o navegador; o cache pendente é preservado para a próxima abertura. Em caso de falha do armazenamento local, alterações permanecem apenas na sessão e `setItem` lança erro para a interface avisar.

No logout, tentar `await sync.flush()` e depois `sync.dispose()`, antes de trocar a sessão do cliente quando possível. `dispose()` remove timers e listeners; não é um envio garantido e não remove dados do navegador. O cache local não é criptografado: em aparelho compartilhado, use contas do sistema separadas ou limpe os dados do navegador.

## Conflitos explícitos

Se outro dispositivo gravou uma revisão nova, a alteração local não é sobrescrita. O status muda para `conflict` e o envio fica bloqueado até a escolha do usuário. Não se faz mesclagem automática de perfis, favoritos ou progresso.

- `await sync.resolveConflict('remote')`: adota a versão atual do servidor, descartando explicitamente a alteração local pendente.
- `await sync.resolveConflict('local')`: consulta a revisão atual e tenta substituir pelo estado local escolhido, com nova proteção de comparação de revisão. Outra gravação concorrente pode gerar novo conflito.

O retorno é o snapshot JSON escolhido, ou `null` se o servidor não tiver biblioteca. Como `library` mantém seu estado em memória, a interface deve recriá-la ou recarregar a página depois de resolver; antes, conferir se o status ainda é `conflict` ou `offline`. Não informar sucesso se a tentativa falhar. Atualizações de outro aparelho aparecem ao abrir/recarregar a sessão; este adaptador não implementa atualização remota contínua em uma página já aberta.

## Verificação e limites

Executar `node --test --test-isolation=none tests/library-sync.test.mjs`. Os testes usam um backend controlado com duas sessões/clientes, revisão condicional e falhas de rede para verificar hidratação, isolamento de contas, agrupamento de gravações, cache offline e resolução explícita de conflitos. Não substituem verificação real do Postgres/RLS. Após aplicar a migração, verificar com dois usuários reais que um não consegue consultar, criar ou alterar a linha do outro; que visitante não acessa tabela; que formato inválido ou seis perfis são recusados; e que atualizações com revisão antiga não modificam linhas. Não foram aplicadas migrações remotas nem acessadas contas reais para esses testes locais.

Verificação adicional do integrador em 2026-10-17: migrações aplicadas ao projeto dedicado; teste LIVE_SUPABASE passou com dois contextos da mesma conta e uma segunda conta temporária, incluindo sincronização real de lista/progresso, conflito CAS, resolução explícita e isolamento RLS. Uma ambiguidade PL/pgSQL encontrada pelo teste real foi corrigida na migração cinema_library_validation_fix.
