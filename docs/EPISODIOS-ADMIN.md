# Cadastrar episódios

Na etapa **Informações**, abra **Este vídeo é um episódio?**. Para uma série, preencha **Nome da série**, **Temporada** e **Número do episódio**. Os números devem ser inteiros positivos; o título específico do episódio é opcional.

Se preencher qualquer campo desse grupo, os três campos principais tornam-se obrigatórios. Para um filme ou vídeo avulso, deixe os quatro vazios. O cadastro envia `null` nesses campos, sem inventar uma série ou tipo de conteúdo.

O envio do vídeo, a capa e o controle de publicação continuam iguais: salvar cria um rascunho; publicar exige uma ação separada. Esta interface depende das colunas `series_title`, `season`, `episode` e `episode_title` no backend e de sua validação no servidor.

Verificação: `node tests/episode-admin-browser.mjs` usa navegador real e backend simulado para validar vídeo avulso, grupo incompleto, números inválidos, cadastro episódico e ausência de publicação automática. Não comprova aplicação da migração ou políticas reais do Supabase.
