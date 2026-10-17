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

## Enviar e publicar

1. Entre no painel e preencha título, descrição, duração, ano, classificação e créditos. Informe apenas conteúdos que você pode exibir. Gêneros são separados por vírgula; direção e capa são opcionais.
2. Selecione o vídeo MP4 do celular ou computador. Para maior compatibilidade entre navegadores, use vídeo **H.264** e áudio **AAC**. A extensão MP4 sozinha não garante compatibilidade do codec.
3. Se desejar, escolha uma capa JPG, PNG ou WebP de até 5 MiB.
4. Toque em **Enviar e salvar rascunho**. Aguarde o fim do envio. A velocidade depende da sua conexão; a página mostra o progresso quando informado pelo transporte.
5. Na lista **Seus vídeos**, toque em **Publicar** e confirme. Somente essa ação torna o registro publicado no catálogo.
6. Para ocultar o vídeo novamente, use **Retirar do catálogo**. O registro continua como rascunho. **Excluir** remove o registro; confirme apenas se tiver certeza.

A implementação define limite padrão de **50 MiB por vídeo**, ajustável pelo backend/configuração de armazenamento. Filmes grandes exigem uma infraestrutura de vídeo adequada, com envio retomável, armazenamento e eventual transcodificação; aumentar apenas o limite na interface não fornece esses recursos. Não foram contratados serviços pagos automaticamente.

O botão **Cancelar envio** cancela o transporte do vídeo. Uma capa ou parte do envio já pode ter chegado ao armazenamento; cancelar não publica o vídeo e não garante limpeza automática de arquivos órfãos. Em caso de falha após upload, confira a lista antes de reenviar. O responsável pelo armazenamento deve acompanhar arquivos órfãos e limites de espaço.

## Como os usuários recebem

O site lê os vídeos publicados no backend conectado. Os usuários não recebem o arquivo por mensagem: eles encontram o novo título no catálogo e assistem por streaming. O catálogo usa Realtime e consulta alternativa a cada 10 segundos enquanto a página está aberta; novos vídeos aparecem em Acabaram de chegar e nos avisos. Notificações push, e-mail automático e transcodificação não fazem parte deste painel.

## Proteção e limites

- Somente a chave pública/publicável pode estar na configuração do navegador. Chaves `service_role`, segredos e senhas de banco não podem ir para o site nem para o GitHub.
- O navegador valida os campos para facilitar o uso; o servidor precisa repetir a validação e aplicar RLS e políticas de armazenamento.
- A autorização não usa `localStorage`, um botão oculto ou informações de perfil editáveis pelo usuário.
- Sessões são administradas pelo SDK oficial. A interface consulta a identidade no servidor e verifica permissão de administrador antes de ações sensíveis.
- Vídeos privados devem usar buckets privados e URLs temporárias para reprodução. Um endereço estático de bucket público permite acesso direto mesmo fora do catálogo.
- O cadastro não concede automaticamente função de administrador; apenas o e-mail autorizado e confirmado deve receber essa função no servidor.
- A criação de rascunhos não inclui edição posterior dos metadados nesta primeira versão. Para corrigir metadados, remova o registro e crie o rascunho correto; o backend pode ser estendido com edição depois.

## Contrato de integração

O módulo `cloud-client.mjs` exporta `cloud` com `ready`, `client`, `maxVideoBytes` opcional, `isAdmin()`, `uploadCover(file)`, `uploadVideo(file,{onProgress,signal})`, `listAdminVideos()`, `saveVideo(payload)`, `setPublished(id,bool)` e `deleteVideo(id)`.

Uploads retornam `{path,url}`; o painel armazena os caminhos, sem depender de URL pública. `onProgress` recebe `{percent}`. As operações de escrita devem lançar erro em falhas e nunca tratar uma atualização de zero linhas como sucesso. As linhas retornadas incluem `id`, `title`, `status` e `created_at`.

Os metadados enviados são `title`, `synopsis`, `age`, `minutes`, `year`, `genres`, `kind`, `director`, `credit`, `video_path`, `image_path` e `status:'draft'`. O campo `age` é inteiro: `0` significa Livre; os demais valores são `10`, `12`, `14`, `16` e `18`. Publicação é uma operação posterior e explícita.

## Verificação da interface

Execute `node tests/admin-browser.mjs` com Chromium e Playwright disponíveis. O teste usa o navegador real com backend **simulado**, verificando login, cadastro, recuperação de senha, envio como rascunho, publicação explícita, retirada, exclusão, logout, configuração pendente e layout móvel. O relatório fica em `docs/admin-browser-results.json`. Esse teste não confirma a configuração ou as permissões de um projeto Supabase real, nem entrega de e-mail, upload remoto ou reprodução de mídia.
