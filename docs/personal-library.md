# Minha Streamlab e avatares

A rota `#/me`, disponível no menu de perfis e nas navegações desktop e móvel, reúne o perfil ativo, os títulos iniciados, avaliações positivas e Minha lista. As três coleções aplicam o filtro infantil e ignoram títulos retirados do catálogo. Progresso pertence somente ao vídeo nativo/trailer; incorporações Drive e YouTube não inventam progresso.

Nove avatares originais, organizados em Clássicos, Companheiros, Universo e Formas e paisagens, usam SVG local sem imagens de personagens de terceiros. O seletor funciona por botões com nome e estado pressionado. Perfis antigos mantêm cor e sorriso clássico. Apenas IDs conhecidos são persistidos; IDs desconhecidos voltam ao clássico. Alterar nome/cor sem informar avatar preserva o avatar escolhido.

O estado é isolado por ID de conta. Com cliente Supabase e identidade real, o app aguarda a hidratação de `createLibrarySync` antes de criar a biblioteca. A área pessoal mostra sincronizado, pendente, offline ou conflito. As escolhas explícitas são usar a versão deste aparelho ou da conta; a tela só recarrega depois de confirmar sincronização. Falhas mantêm a versão local e controles para nova tentativa. Mocks sem cliente completo/identidade real usam exclusivamente armazenamento local. Logout tenta enviar alterações antes de sair; pendências permanecem no armazenamento da conta para a próxima sessão.

Verificação: `node --test --test-isolation=none tests/library.test.mjs tests/profile-personal.test.mjs` e `node tests/personal-browser.mjs`; baseline existente em `node tests/browser.mjs`. Os testes de navegador substituem identidade e cliente remoto, e bloqueiam recursos externos. Eles não comprovam sincronização com o backend real.
