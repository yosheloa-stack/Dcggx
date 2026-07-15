'use strict';

const play = require('play-dl');
const GuildPlayer = require('./GuildPlayer');

/**
 * Gerencia os players de música de todos os servidores e resolve buscas.
 * Os players ficam em client.music (Map guildId -> GuildPlayer).
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
    player.textChannel = textChannel; // sempre anuncia no canal mais recente
  }
  return player;
}

/** Converte um vídeo do play-dl numa faixa tocável. */
function toTrack(video, requestedBy) {
  return {
    title: video.title || 'Sem título',
    url: video.url,
    durationRaw: video.durationRaw || null,
    thumbnail: video.thumbnails?.[0]?.url || null,
    author: video.channel?.name || video.channel?.title || '—',
    requestedBy,
  };
}

/**
 * Resolve uma entrada (texto, link de vídeo OU link de playlist) em faixas.
 * @param {string} query
 * @param {string} requestedBy menção de quem pediu
 * @returns {Promise<{ tracks: object[], playlistTitle: string|null }>}
 */
async function resolve(query, requestedBy) {
  // ----- "playlist <nome>": busca uma PLAYLIST pelo nome -----
  const byName = query.match(/^play\s?list[:\s]+(.+)/i);
  if (byName) {
    const nome = byName[1].trim();
    try {
      const results = await play.search(nome, { limit: 1, source: { youtube: 'playlist' } });
      const found = results[0];
      if (found?.url) return loadPlaylist(found.url, requestedBy, found.title || nome);
    } catch { /* cai no fluxo normal abaixo */ }
    return { tracks: [], playlistTitle: null };
  }

  const type = await play.validate(query).catch(() => false);

  // ----- Playlist do YouTube por LINK: adiciona todas as músicas -----
  if (type === 'yt_playlist') {
    return loadPlaylist(query, requestedBy);
  }

  // ----- Vídeo único por link -----
  if (type === 'yt_video') {
    const info = await play.video_basic_info(query).catch(() => null);
    const v = info?.video_details;
    return { tracks: v?.url ? [toTrack(v, requestedBy)] : [], playlistTitle: null };
  }

  // ----- Busca por texto -----
  const results = await play.search(query, { limit: 1, source: { youtube: 'video' } }).catch(() => []);
  const v = results[0];
  return { tracks: v?.url ? [toTrack(v, requestedBy)] : [], playlistTitle: null };
}

/** Carrega todas as músicas de uma playlist (por URL). */
async function loadPlaylist(url, requestedBy, fallbackTitle) {
  try {
    const pl = await play.playlist_info(url, { incomplete: true });
    const videos = await pl.all_videos();
    const tracks = videos.filter((v) => v && v.url).map((v) => toTrack(v, requestedBy));
    return { tracks, playlistTitle: pl.title || fallbackTitle || 'Playlist' };
  } catch {
    return { tracks: [], playlistTitle: null };
  }
}

/** Mantido por compatibilidade: devolve só a primeira faixa. */
async function resolveTrack(query, requestedBy) {
  const { tracks } = await resolve(query, requestedBy);
  return tracks[0] || null;
}

module.exports = { getPlayer, getOrCreatePlayer, resolve, resolveTrack };
