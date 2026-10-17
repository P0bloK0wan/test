# Adicionar vídeos em quatro etapas

O painel apresenta **Vídeo → Informações → Capa → Revisão**. Cada etapa verifica os campos necessários antes de continuar. Você pode voltar para corrigir dados. O botão de salvar aparece apenas na revisão.

1. **Vídeo:** cole o link público de um arquivo Google Drive ou escolha o envio MP4. As regras de compartilhamento e os limites do armazenamento continuam valendo.
2. **Informações:** preencha título, descrição, duração, ano, classificação e créditos. A busca TMDB pode ajudar, mas confira as informações e os direitos de exibição.
3. **Capa:** escolha uma imagem JPG, PNG ou WebP de até 5 MiB, ou continue sem imagem.
4. **Revisão:** confira a capa, o resumo e o vídeo. A prévia Google Drive só carrega o player quando você escolhe pré-visualizar; ela não verifica automaticamente compartilhamento nem disponibilidade. Vídeos locais usam URLs temporárias e não são enviados por essa prévia.

**Salvar cria somente um rascunho.** A publicação continua sendo uma ação separada e confirmada na lista de vídeos. A prévia não publica o conteúdo nem altera as permissões do Google Drive.

Quem prefere preencher tudo de uma vez pode escolher **Modo rápido**. Use **Atualizar prévia** depois de editar os campos. As mesmas validações são aplicadas ao salvar. URLs temporárias da prévia são liberadas ao trocar de etapa, atualizar a prévia, reiniciar ou destruir o assistente.

Execute `node tests/admin-wizard-browser.mjs` para testar as etapas em navegador real com salvamento simulado. Esse teste não comprova envio real ao armazenamento ou reprodução real no Google Drive. O fluxo de backend continua no `admin.mjs` e nas políticas do servidor.
