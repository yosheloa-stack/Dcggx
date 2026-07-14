'use strict';

const store = require('../utils/store');
const modActions = require('./modActions');

/**
 * Anti-spam em memória. Guarda o histórico recente de mensagens por usuário
 * (por servidor) e detecta flood e mensagens duplicadas.
 *
 * Mapa: guildId -> userId -> [ { content, at } ]
 */
const history = new Map();

function record(guildId, userId, content) {
  if (!history.has(guildId)) history.set(guildId, new Map());
  const guildMap = history.get(guildId);
  if (!guildMap.has(userId)) guildMap.set(userId, []);
  const arr = guildMap.get(userId);
  arr.push({ content, at: Date.now() });
  return arr;
}

/**
 * @returns {boolean} true se identificou e tratou spam
 */
async function check(message) {
  const settings = store.getSettings(message.guild.id).antiSpam;
  if (!settings.enabled) return false;
  if (!message.member) return false;

  const arr = record(message.guild.id, message.author.id, message.content);

  // Mantém só as mensagens dentro da janela de tempo
  const cutoff = Date.now() - settings.intervalMs;
  const recent = arr.filter((m) => m.at >= cutoff);
  history.get(message.guild.id).set(message.author.id, recent);

  const flooding = recent.length > settings.maxMessages;

  let duplicating = false;
  if (settings.blockDuplicates && message.content.trim().length > 0) {
    const same = recent.filter((m) => m.content === message.content).length;
    duplicating = same > settings.maxDuplicates;
  }

  if (!flooding && !duplicating) return false;

  // Limpa o histórico para não punir repetidamente pelo mesmo surto
  history.get(message.guild.id).set(message.author.id, []);

  await modActions.apply({
    member: message.member,
    message,
    action: settings.action,
    reason: flooding ? 'Flood de mensagens (spam)' : 'Mensagens repetidas (spam)',
    timeoutMs: settings.timeoutMs,
    deleteMessage: true,
  });
  return true;
}

module.exports = { check };
