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

/**
 * Resolve uma busca (texto ou URL do YouTube) em uma faixa tocável.
 * @param {string} query
 * @param {string} requestedBy menção de quem pediu
 * @returns {Promise<object|null>} faixa ou null se não encontrar
 */
async function resolveTrack(query, requestedBy) {
  let video = null;

  const type = await play.validate(query).catch(() => false);

  if (type === 'yt_video') {
    const info = await play.video_basic_info(query).catch(() => null);
    video = info?.video_details || null;
  } else {
    // Busca por texto no YouTube
    const results = await play.search(query, { limit: 1, source: { youtube: 'video' } }).catch(() => []);
    video = results[0] || null;
  }

  if (!video || !video.url) return null;

  return {
    title: video.title || 'Sem título',
    url: video.url,
    durationRaw: video.durationRaw || null,
    thumbnail: video.thumbnails?.[0]?.url || null,
    requestedBy,
  };
}

module.exports = { getPlayer, getOrCreatePlayer, resolveTrack };
