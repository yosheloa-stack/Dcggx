'use strict';

const play = require('play-dl');
const YT = require('youtube-sr').default || require('youtube-sr');
const GuildPlayer = require('./GuildPlayer');

/**
 * Gerencia os players de música e resolve buscas/playlists.
 *
 * Estratégia (a nuvem bloqueia parte do play-dl):
 *  - Busca e playlist usam play-dl primeiro e youtube-sr como reforço.
 *  - O ÁUDIO em si é baixado pela API externa (ver ytApi.js) — a única
 *    coisa que a API do usuário faz é baixar a música por URL.
 */

function getPlayer(guild) {
  return guild.client.music?.get(guild.id) || null;
}

function getOrCreatePlayer(guild, textChannel) {
  if (!guild.client.music) guild.client.music = new Map();
  let player = guild.client.music.get(guild.id);
  if (!player) {
    player = new GuildPlayer(guild, textChannel);
    guild.client.music.set(guild.id, player);
  } else {
    player.textChannel = textChannel;
  }
  return player;
}

/** Converte um vídeo do play-dl numa faixa. */
function toTrack(v, requestedBy) {
  return {
    title: v.title || 'Sem título',
    url: v.url,
    durationRaw: v.durationRaw || null,
    thumbnail: v.thumbnails?.[0]?.url || null,
    author: v.channel?.name || v.channel?.title || '—',
    requestedBy,
  };
}

/** Converte um vídeo do youtube-sr numa faixa. */
function srToTrack(v, requestedBy) {
  return {
    title: v.title || 'Sem título',
    url: v.url,
    durationRaw: v.durationFormatted || null,
    thumbnail: v.thumbnail?.url || null,
    author: v.channel?.name || '—',
    requestedBy,
  };
}

/**
 * Resolve uma entrada (texto, link de vídeo, link de playlist ou
 * "playlist <nome>") em faixas.
 * @returns {Promise<{ tracks: object[], playlistTitle: string|null }>}
 */
async function resolve(query, requestedBy) {
  // ----- "playlist <nome>": busca uma PLAYLIST pelo nome -----
  const byName = query.match(/^(?:play\s?list|playslist|playslit|plyalist|lista|list)[\s:]+(.+)/i);
  if (byName) {
    const nome = byName[1].trim();

    // play-dl
    try {
      const r = await play.search(nome, { limit: 1, source: { youtube: 'playlist' } });
      if (r[0]?.url) {
        const pl = await loadPlaylist(r[0].url, requestedBy, r[0].title || nome);
        if (pl.tracks.length) return pl;
      }
    } catch { /* tenta o próximo */ }

    // youtube-sr
    try {
      const pl = await YT.searchOne(nome, 'playlist');
      if (pl?.url) {
        const loaded = await loadPlaylist(pl.url, requestedBy, pl.title || nome);
        if (loaded.tracks.length) return loaded;
      }
    } catch { /* tenta o próximo */ }

    // Sem playlist: busca como música normal
    return searchVideo(nome, requestedBy);
  }

  const type = await play.validate(query).catch(() => false);

  // ----- Playlist por LINK -----
  if (type === 'yt_playlist' || /[?&]list=/.test(query)) {
    return loadPlaylist(query, requestedBy);
  }

  // ----- Vídeo por LINK -----
  if (type === 'yt_video' || /youtu\.?be/.test(query)) {
    return videoByUrl(query, requestedBy);
  }

  // ----- Busca por texto -----
  return searchVideo(query, requestedBy);
}

/** Busca um único vídeo por texto (play-dl e depois youtube-sr). */
async function searchVideo(texto, requestedBy) {
  try {
    const r = await play.search(texto, { limit: 1, source: { youtube: 'video' } });
    if (r[0]?.url) return { tracks: [toTrack(r[0], requestedBy)], playlistTitle: null };
  } catch { /* fallback */ }

  try {
    const v = await YT.searchOne(texto, 'video');
    if (v?.url) return { tracks: [srToTrack(v, requestedBy)], playlistTitle: null };
  } catch { /* nada */ }

  return { tracks: [], playlistTitle: null };
}

/** Resolve um vídeo por URL (mesmo se as infos estiverem bloqueadas). */
async function videoByUrl(url, requestedBy) {
  // youtube-sr costuma pegar o título mesmo na nuvem
  try {
    const v = await YT.getVideo(url);
    if (v?.url) return { tracks: [srToTrack(v, requestedBy)], playlistTitle: null };
  } catch { /* fallback */ }

  try {
    const info = await play.video_basic_info(url);
    const v = info?.video_details;
    if (v?.url) return { tracks: [toTrack(v, requestedBy)], playlistTitle: null };
  } catch { /* fallback */ }

  // Último caso: toca pela URL mesmo sem metadados (a API baixa pela URL)
  return { tracks: [{ title: 'YouTube', url, durationRaw: null, thumbnail: null, author: '—', requestedBy }], playlistTitle: null };
}

/** Carrega todas as músicas de uma playlist por URL (play-dl e youtube-sr). */
async function loadPlaylist(url, requestedBy, fallbackTitle) {
  // play-dl
  try {
    const pl = await play.playlist_info(url, { incomplete: true });
    const videos = await pl.all_videos();
    const tracks = videos.filter((v) => v?.url).map((v) => toTrack(v, requestedBy));
    if (tracks.length) return { tracks, playlistTitle: pl.title || fallbackTitle || 'Playlist' };
  } catch { /* tenta youtube-sr */ }

  // youtube-sr
  try {
    const pl = await YT.getPlaylist(url, { fetchAll: true });
    const videos = pl?.videos || [];
    const tracks = videos.filter((v) => v?.url).map((v) => srToTrack(v, requestedBy));
    if (tracks.length) return { tracks, playlistTitle: pl.title || fallbackTitle || 'Playlist' };
  } catch { /* nada */ }

  return { tracks: [], playlistTitle: null };
}

/** Mantido por compatibilidade: devolve só a primeira faixa. */
async function resolveTrack(query, requestedBy) {
  const { tracks } = await resolve(query, requestedBy);
  return tracks[0] || null;
}

module.exports = { getPlayer, getOrCreatePlayer, resolve, resolveTrack };
