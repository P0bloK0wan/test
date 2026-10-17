# Como colocar seus vídeos

Você não precisa saber usar uma API. Há duas opções, com resultados diferentes.

## 1. Assistir a um arquivo do celular ou computador

1. Abra o site.
2. No menu do perfil, no canto superior direito, toque em **Abrir vídeo do aparelho**. A mesma opção aparece no rodapé.
3. Escolha seu vídeo e use os controles de reprodução.

O arquivo **não é enviado para um servidor**, não aparece para outras pessoas e não é salvo no catálogo. Ao fechar a reprodução, é necessário escolher o arquivo novamente. Isso funciona com arquivos grandes sem carregá-los inteiros na memória do aplicativo.

Prefira **MP4 com vídeo H.264 e áudio AAC**. A extensão `.mp4` sozinha não garante compatibilidade: o vídeo pode usar outro codec. WebM e Ogg dependem do navegador. Se houver erro de formato, converta uma cópia para MP4/H.264/AAC. Este site não converte arquivos automaticamente.

## 2. Colocar um vídeo no catálogo online

Para todos assistirem, o vídeo precisa ficar hospedado na internet. O seletor de arquivos da opção 1 não faz upload.

Use somente vídeos e capas que você tem autorização para disponibilizar. Existem dois caminhos:

- **Arquivo junto ao site:** copie um vídeo pequeno para `dist/assets/media/meu-filme.mp4` e a capa para `dist/assets/minha-capa.jpg`. A hospedagem precisa aceitar o tamanho total do site e dos arquivos.
- **Hospedagem de vídeos ou armazenamento:** envie seu vídeo para um serviço que ofereça um link HTTPS direto para o arquivo MP4, como `https://seu-dominio.com/videos/meu-filme.mp4`. Esse caminho é mais adequado para filmes grandes. O serviço deve permitir reprodução no navegador, requisições parciais (Range) e tráfego de vídeo. Verifique limites, acesso e custos do serviço escolhido antes de contratar.

Um link do Google Drive terminando em `/view` abre uma página e não é um link direto MP4. Não use esse link no campo `video`.

Depois de hospedar ou copiar o arquivo, abra **`dist/my-videos.mjs`** e preencha a lista. Por exemplo:

```js
export const myVideos = [
  {
    id: 'meu-filme',
    title: 'Meu filme',
    video: 'assets/media/meu-filme.mp4',
    image: 'assets/minha-capa.jpg',
    year: 2026,
    minutes: 90,
    age: 12,
    genres: ['Aventura'],
    director: 'Seu nome',
    synopsis: 'Escreva aqui a descrição do seu filme.',
    credit: 'Produção e direitos: seu nome',
  },
];
```

Se o arquivo estiver em outro serviço, substitua apenas o valor de `video` pelo link HTTPS direto. `image` também aceita um link HTTPS direto. Se não houver capa, remova `image`: o site usará uma ilustração própria.

Cada `id` deve ser único, conter apenas letras minúsculas sem acentos, números e hífens, e ser diferente dos filmes existentes. Use a indicação etária correta: `0`, `10`, `12`, `14`, `16` ou `18`. Sem indicação válida, o site considera 18 anos e oculta o vídeo de perfis infantis. Use `kind: 'animation'` para incluir o título também em Animações.

**Publique novamente o site após alterar o catálogo ou seus arquivos.** O filme aparecerá em Filmes, busca e filtros, terá detalhes, favoritos, avaliações e progresso por perfil. A página inicial mantém Sintel como destaque editorial. O catálogo não é um painel de administração: as alterações são feitas nesse arquivo de configuração e precisam ser republicadas.

Links públicos de mídia podem ser copiados por quem tem acesso a eles. Perfis locais não protegem os vídeos nem criam contas de usuário. Caso precise de acesso restrito por usuário ou assinatura, é necessário adicionar autenticação e uma hospedagem de mídia com controle de acesso.

## Pedir ajuda para adicionar

Você pode enviar o arquivo ou o link direto e os dados: título, capa, sinopse, duração e classificação etária. Podemos então preparar a entrada do catálogo e publicar a atualização. Nenhuma API da Netflix é usada.
