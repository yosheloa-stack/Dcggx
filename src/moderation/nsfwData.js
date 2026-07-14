'use strict';

/**
 * Listas usadas pelo filtro heurístico de NSFW.
 * Ajuste conforme a necessidade do seu servidor.
 *
 * Observação: mantido enxuto e "genérico" de propósito. A detecção real de
 * conteúdo em imagens/vídeos deve ficar por conta da API externa (Sightengine).
 */

// Domínios de sites adultos conhecidos (bloqueados sempre)
const NSFW_DOMAINS = [
  'pornhub.com', 'xvideos.com', 'xnxx.com', 'redtube.com', 'youporn.com',
  'xhamster.com', 'brazzers.com', 'onlyfans.com', 'chaturbate.com',
  'rule34.xxx', 'e621.net', 'nhentai.net', 'hentai.tv', 'spankbang.com',
  'stripchat.com', 'porn.com', 'sex.com',
];

// Termos proibidos em texto e nomes de figurinha (comparação por palavra inteira,
// insensível a maiúsculas/acentos). Mantido genérico.
const NSFW_KEYWORDS = [
  'porn', 'porno', 'pornografia', 'hentai', 'nude', 'nudes', 'nudez',
  'xxx', 'nsfw', 'sexo explicito', 'putaria', 'pornhub', 'onlyfans',
];

// Extensões consideradas mídia (imagem/vídeo/gif)
const MEDIA_EXTENSIONS = [
  'png', 'jpg', 'jpeg', 'gif', 'webp', 'bmp',
  'mp4', 'mov', 'webm', 'mkv', 'avi',
];

module.exports = { NSFW_DOMAINS, NSFW_KEYWORDS, MEDIA_EXTENSIONS };
