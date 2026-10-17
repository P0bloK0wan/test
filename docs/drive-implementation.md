# Publicação manual por Google Drive

Solicitação: proprietário prefere enviar seus arquivos ao Google Drive e fornecer links públicos, sem Cloudflare R2. Mantidos login Supabase, catálogo/RLS, capas privadas e upload MP4 existente. Fonte padrão do painel alterada para Drive.

Links de arquivos são normalizados para drive.google.com/file/d/ID/view e visualizados em /preview. IDs e resourcekey aceitam apenas caracteres definidos, sem URLs arbitrárias. Parser recusa host, protocolo, credenciais, pastas e identificadores ambíguos; SQL faz validação independente. Migração additive backend/drive-links.sql (cinema_drive_links), sem alteração de políticas de acesso.

O cadastro salva apenas metadados e link; opcionalmente uma capa no Supabase. Não faz upload/download/proxy de vídeo, conexão OAuth ou varredura de pastas. Nenhuma chave da API Google é necessária para esse fluxo. Remover o registro não remove o arquivo Drive.

Verificação: 9 testes Node; 23 verificações UI com backend simulado; 18 verificações do catálogo/iframe; 6 verificações de navegador contra Supabase real, com conta de teste existente, checagem SQL de URLs inválidas, rascunho invisível, publicação para catálogo aberto e exclusão sem objeto de armazenamento. O ID Drive usado é fictício e as requisições Google foram bloqueadas durante QA. Não confundir iframe/catálogo testados com reprodução real.

O usuário informou que ainda vai enviar o vídeo. Portanto permissões públicas, processamento, compatibilidade e reprodução no Google não puderam ser exercitados. O player oferece Abrir no Google Drive como alternativa e explica os limites. Progresso/retomada não é acessível pelo iframe de terceiros. Link público continua acessível fora do site.

Referências: documentação Google Drive de armazenamento/reprodução https://support.google.com/drive/answer/2423694?hl=pt-BR e políticas do Supabase https://supabase.com/docs/guides/database/postgres/row-level-security . Documentação consultada e changelog do Supabase verificados em 17/10/2026.
