'use strict';

const store = require('../utils/store');
const modActions = require('./modActions');
const vision = require('./visionApi');
const { NSFW_DOMAINS, NSFW_KEYWORDS, MEDIA_EXTENSIONS } = require('./nsfwData');

/** Normaliza texto: minúsculo e sem acentos, para comparação robusta. */
function normalize(text) {
  return (text || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '');
}

function hasKeyword(text) {
  const norm = normalize(text);
  return NSFW_KEYWORDS.some((kw) => {
    const k = normalize(kw);
    // palavra inteira quando possível
    const re = new RegExp(`(^|[^a-z0-9])${k.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}([^a-z0-9]|$)`, 'i');
    return re.test(norm);
  });
}

function hasNsfwDomain(text) {
  const norm = normalize(text);
  return NSFW_DOMAINS.some((d) => norm.includes(d));
}

function extOf(url) {
  const clean = url.split('?')[0].toLowerCase();
  const dot = clean.lastIndexOf('.');
  return dot === -1 ? '' : clean.slice(dot + 1);
}

/** Coleta URLs de mídia (anexos + embeds) da mensagem. */
function collectMedia(message) {
  const items = [];
  for (const att of message.attachments.values()) {
    const ext = extOf(att.name || att.url);
    if (MEDIA_EXTENSIONS.includes(ext)) {
      items.push({ url: att.url, video: ['mp4', 'mov', 'webm', 'mkv', 'avi'].includes(ext) });
    }
  }
  for (const emb of message.embeds) {
    if (emb.image?.url) items.push({ url: emb.image.url, video: false });
    if (emb.thumbnail?.url) items.push({ url: emb.thumbnail.url, video: false });
    if (emb.video?.url) items.push({ url: emb.video.url, video: true });
  }
  return items;
}

/**
 * @returns {boolean} true se detectou e tratou NSFW
 */
async function check(message) {
  const settings = store.getSettings(message.guild.id).antiNsfw;
  if (!settings.enabled) return false;
  if (!message.member) return false;

  // Canais marcados como NSFW no Discord são permitidos para mídia,
  // mas texto/link explícito continua bloqueado em qualquer lugar.
  const channelIsNsfw = Boolean(message.channel.nsfw);

  let reason = null;

  // 1) Texto explícito
  if (hasKeyword(message.content)) reason = 'Conteúdo textual explícito (NSFW)';

  // 2) Links pornográficos
  if (!reason && hasNsfwDomain(message.content)) reason = 'Link de site adulto (NSFW)';

  // 3) Figurinhas (stickers) pelo nome
  if (!reason && settings.scanStickers && message.stickers.size > 0) {
    const bad = [...message.stickers.values()].some((s) => hasKeyword(s.name));
    if (bad) reason = 'Figurinha com conteúdo NSFW';
  }

  // 4) Mídia (imagens/vídeos/gifs)
  if (!reason) {
    const media = collectMedia(message);
    if (media.length > 0) {
      // Bloqueio geral de mídia fora de canal NSFW (se configurado)
      if (settings.blockMediaOutsideNsfw && !channelIsNsfw) {
        reason = 'Mídia enviada fora de canal NSFW';
      }

      // Análise real via API externa (se configurada) — vale em qualquer canal não-NSFW
      if (!reason && settings.useExternalApi && vision.isConfigured() && !channelIsNsfw) {
        for (const item of media) {
          const result = await vision.scan(item.url, item.video);
          if (result && result.nsfw && result.score >= settings.apiThreshold) {
            reason = `Mídia com conteúdo adulto detectado (${Math.round(result.score * 100)}%)`;
            break;
          }
        }
      }
    }
  }

  if (!reason) return false;

  await modActions.apply({
    member: message.member,
    message,
    action: settings.action,
    reason,
    deleteMessage: settings.deleteMessage,
  });
  return true;
}

module.exports = { check };
