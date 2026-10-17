# Painel de administração

A página `admin.html` permite gerenciar o catálogo com e-mail e senha, sem editar o código a cada publicação. O painel usa o backend Supabase definido em `dist/cloud-client.mjs`; a versão sem backend configurado mostra **Configuração pendente** e não envia senhas nem arquivos.

## Conta de teste

Uma conta de administrador de teste é criada pelo operador no serviço Auth. O acesso é entregue ao proprietário fora do GitHub. Este e-mail de teste não tem caixa de entrada. Para trocar a senha, entre e use **Alterar minha senha**; recuperação por e-mail requer uma conta com e-mail real e entrega configurada.

## Entrar pela primeira vez

1. O responsável pela infraestrutura conecta o projeto Supabase, aplica o esquema e as políticas de acesso e autoriza o seu e-mail como administrador no servidor.
2. Abra `/admin.html`, escolha **Criar minha conta** e use o mesmo e-mail autorizado. Defina sua senha; não compartilhe a senha em conversas nem a coloque no GitHub.
3. Confirme o e-mail recebido e volte ao painel para entrar. A confirmação de e-mail deve estar habilitada no Supabase.
4. Se esquecer a senha, use **Esqueci minha senha**. O link recebido retorna ao painel, onde você define uma senha nova.

Ter uma conta ou conhecer o endereço do painel não concede permissão para publicar. A autorização deve ser verificada no servidor e aplicada também ao banco de dados e ao armazenamento. Nenhuma senha padrão é criada.

Configure os endereços HTTPS publicados e o endereço `/admin.html` como redirecionamentos permitidos nas opções de autenticação do Supabase. Testes locais precisam de seu próprio endereço permitido. E-mails de confirmação e recuperação dependem da configuração e dos limites de entrega do provedor.

## Publicar pelo Google Drive (opção padrão)

1. Envie seu vídeo ao Google Drive e aguarde o processamento. Você deve ter autorização para exibir o conteúdo.
2. No arquivo, abra **Compartilhar → Acesso geral → Qualquer pessoa com o link → Leitor** e copie o link. Escolha o link do arquivo de vídeo; links de pastas não são aceitos. Se uma conta de trabalho/escola impedir compartilhamento público, não tente contornar essa restrição.
3. Abra o link em uma janela anônima e confirme se o vídeo abre sem login. O painel valida o formato do link, mas **não verifica se o arquivo está público, se existe ou se o processamento terminou**.
4. No painel, deixe **Link público Google Drive** selecionado. Cole o link e preencha título, descrição, duração, ano, classificação e créditos. Gêneros são separados por vírgula; direção e capa são opcionais.
5. Se desejar, escolha uma capa JPG, PNG ou WebP de até 5 MiB. A capa é enviada ao armazenamento do site; o vídeo permanece no Drive.
6. Toque em **Salvar rascunho com link**. Depois, na lista **Seus vídeos**, toque em **Publicar** e confirme. A publicação é separada do cadastro.
7. Para ocultar o vídeo, use **Retirar do catálogo**. Para remover o registro do site, use **Excluir**. Essas ações não apagam nem alteram o arquivo ou as permissões no Google Drive.

O Google fornece o player incorporado. Permissões, processamento, formato/codec, cookies e limites de tráfego/reprodução podem impedir a exibição. Links públicos podem ser abertos por qualquer pessoa que os obtenha, inclusive fora do site; o catálogo não fornece proteção de acesso sobre o arquivo público. O Google Drive não oferece neste projeto as garantias de uma plataforma dedicada de streaming. Não são usados login Google, API Google nem credenciais do Drive no painel.

O limite de 50 MiB do envio de MP4 **não se aplica ao cadastro de um link Drive**. O painel não copia nem envia o vídeo do Drive ao armazenamento do site; continuam valendo os limites e as regras do próprio Google.

## Enviar um MP4 diretamente (opção alternativa)

1. Selecione **Enviar arquivo MP4** em **Fonte do vídeo**.
2. Escolha o arquivo do celular ou computador. Recomenda-se vídeo **H.264** e áudio **AAC** para maior compatibilidade; a extensão MP4 não garante compatibilidade do codec.
3. Preencha os detalhes e toque em **Enviar e salvar rascunho**. Aguarde o fim do envio; em seguida publique o rascunho na lista.

O limite padrão para envio direto é **50 MiB por vídeo**, ajustável pelo backend e armazenamento. Filmes grandes exigem infraestrutura adequada, com envio retomável, armazenamento e eventual transcodificação; alterar apenas o limite na interface não fornece esses recursos. Nenhum serviço pago foi contratado automaticamente.

O botão **Cancelar envio** cancela o transporte do vídeo direto. Uma capa ou parte do envio já pode ter chegado ao armazenamento; cancelar não publica o vídeo e não garante limpeza automática de arquivos órfãos. Em caso de falha, confira a lista antes de reenviar. O responsável pelo armazenamento deve acompanhar arquivos órfãos e limites de espaço.

## Como os usuários recebem

O site lê os vídeos publicados no backend conectado. Os usuários não recebem o arquivo por mensagem: eles encontram o novo título no catálogo e assistem por streaming. O catálogo usa Realtime e consulta alternativa a cada 10 segundos enquanto a página está aberta; novos vídeos aparecem em Acabaram de chegar e nos avisos. Notificações push, e-mail automático e transcodificação não fazem parte deste painel.

## Proteção e limites

- Somente a chave pública/publicável pode estar na configuração do navegador. Chaves `service_role`, segredos e senhas de banco não podem ir para o site nem para o GitHub.
- O navegador valida os campos para facilitar o uso; o servidor precisa repetir a validação e aplicar RLS e políticas de armazenamento.
- A autorização não usa `localStorage`, um botão oculto ou informações de perfil editáveis pelo usuário.
- Sessões são administradas pelo SDK oficial. A interface consulta a identidade no servidor e verifica permissão de administrador antes de ações sensíveis.
- No envio direto, vídeos privados devem usar buckets privados e URLs temporárias para reprodução. Um endereço estático de bucket público permite acesso direto mesmo fora do catálogo.
- O cadastro não concede automaticamente função de administrador; apenas o e-mail autorizado e confirmado deve receber essa função no servidor.
- A criação de rascunhos não inclui edição posterior dos metadados nesta primeira versão. Para corrigir metadados, remova o registro e crie o rascunho correto; o backend pode ser estendido com edição depois.

## Contrato de integração

O módulo `cloud-client.mjs` exporta `cloud` com `ready`, `client`, `maxVideoBytes` opcional, `isAdmin()`, `uploadCover(file)`, `uploadVideo(file,{onProgress,signal})`, `listAdminVideos()`, `saveVideo(payload)`, `setPublished(id,bool)` e `deleteVideo(id)`.

Uploads retornam `{path,url}`; o painel armazena os caminhos, sem depender de URL pública. `onProgress` recebe `{percent}`. As operações de escrita devem lançar erro em falhas e nunca tratar uma atualização de zero linhas como sucesso. As linhas retornadas incluem `id`, `title`, `status` e `created_at`.

Os metadados enviados são `title`, `synopsis`, `age`, `minutes`, `year`, `genres`, `kind`, `director`, `credit`, `video_source`, `drive_url`, `video_path`, `image_path` e `status:'draft'`. O campo `age` é inteiro: `0` significa Livre; os demais valores são `10`, `12`, `14`, `16` e `18`. Para links Drive, `video_source:'drive'`, `drive_url` contém o link normalizado por `drive-link.mjs` e `video_path:null`. Para MP4 enviado, `video_source:'upload'`, `drive_url:null` e `video_path` contém o caminho retornado pelo upload. `image_path` pode ser `null`. Publicação é uma operação posterior e explícita.

## Verificação da interface

Execute `node tests/admin-browser.mjs` com Chromium e Playwright disponíveis. O teste usa o navegador real com backend **simulado**, verificando login, cadastro, recuperação de senha, fonte Drive padrão, links inválidos, cadastro Drive sem upload de vídeo, envio MP4 como rascunho, publicação explícita, retirada, exclusão, logout, configuração pendente e layout móvel. O relatório fica em `docs/admin-browser-results.json`. Esse teste não confirma a configuração ou as permissões de um projeto Supabase real, nem entrega de e-mail, upload remoto, permissões reais do Drive ou reprodução de mídia.
