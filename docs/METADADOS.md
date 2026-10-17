# Informações de filmes com TMDB

O painel pode preencher a ficha técnica a partir do The Movie Database (TMDB). A busca não envia vídeos, não altera o link Google Drive e não publica registros. O administrador deve conferir os resultados e aplicar os dados antes de salvar o rascunho.

## Configuração

1. Crie sua própria conta no TMDB e consulte [as configurações da API](https://www.themoviedb.org/settings/api).
2. Leia os termos aplicáveis e solicite uma chave API ou Token de Leitura da API. A API oferece uso gratuito não comercial sujeito às condições do TMDB; uso comercial deve seguir as condições e autorizações do provedor.
3. No painel de administração, abra **Configurar chave do TMDB**, cole a chave e use **Salvar conexão**.
4. A chave é enviada ao backend autenticado. Ela não deve ser adicionada ao código, ao GitHub, a mensagens ou ao armazenamento local do navegador. O campo é apagado ao concluir ou falhar a configuração.
5. Use **Desconectar** para remover a conexão no servidor. Sair da sessão limpa o painel e seus campos; a configuração compartilhada no servidor permanece até desconectar.

O backend deve validar a autorização administrativa em todas as ações e guardar a chave com proteção adequada. Uma conexão configurada não garante que a chave continua válida ou que o TMDB esteja disponível. Este projeto não fornece uma chave TMDB própria.

## Usar

Digite o nome do filme e escolha **Buscar informações**. Confira título, ano e sinopse entre os resultados; são exibidos até oito. **Selecionar** carrega uma prévia da ficha, e **Aplicar ao formulário** preenche título, sinopse, ano, duração, gêneros, direção e classificação quando disponíveis. Link do vídeo, fonte, arquivo e capa permanecem como estavam. Nenhuma dessas ações publica o filme.

A classificação precisa ser válida para o Brasil. Se ela não for informada, o formulário pede uma seleção manual; não presume classificação Livre. Ano e duração ausentes ficam vazios e exigem preenchimento manual; dados do filme anterior não são mantidos. Sinopse ausente precisa de preenchimento manual. Revise também créditos e direitos de exibição: informações encontradas no TMDB não autorizam distribuir o filme.

O painel não aplica alterações enquanto um vídeo está sendo enviado ou salvo. Erros de conexão e busca sem resultados são apresentados na própria seção. Você pode continuar preenchendo a ficha manualmente quando a integração estiver indisponível.

## Atribuição

This product uses the TMDB API but is not endorsed or certified by TMDB.

A interface apresenta a atribuição e o logotipo do TMDB. A marca pertence ao provedor; consulte as regras de uso e atribuição ao redistribuir o projeto.

## Teste

Execute `node tests/metadata-browser.mjs` com Chromium e Playwright disponíveis. O teste usa navegador real e backend/TMDB **simulados** para verificar configuração, limpeza da chave, busca, escolha explícita, preenchimento, classificação ausente, preservação dos arquivos e do link Drive, erro, desconexão e limpeza do painel. Não confirma chave real, resposta do TMDB ou armazenamento seguro no servidor. A integração real precisa da chave e da configuração do proprietário.
