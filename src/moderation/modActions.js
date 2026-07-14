'use strict';

const { PermissionFlagsBits } = require('discord.js');
const store = require('../utils/store');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

/**
 * Camada central de punições. Todos os filtros (anti-link, anti-spam,
 * anti-nsfw) passam por aqui, garantindo comportamento e logs consistentes.
 */

/** Envia um registro para o canal de logs configurado no /setup. */
async function sendLog(guild, embed) {
  try {
    const settings = store.getSettings(guild.id);
    if (!settings.logChannelId) return;
    const channel = await guild.channels.fetch(settings.logChannelId).catch(() => null);
    if (channel && channel.isTextBased()) {
      await channel.send({ embeds: [embed] });
    }
  } catch (err) {
    logger.error('Falha ao enviar log:', err.message);
  }
}

/** DM educada avisando o usuário do que aconteceu (falha em silêncio). */
async function notifyUser(member, title, description) {
  try {
    const embed = embeds.warn(title, description).addFields({
      name: 'Servidor',
      value: member.guild.name,
    });
    await member.send({ embeds: [embed] });
  } catch {
    /* usuário com DM fechada — sem problema */
  }
}

/**
 * Aplica uma ação de moderação.
 * @param {object} p
 * @param {import('discord.js').GuildMember} p.member
 * @param {import('discord.js').Message} [p.message]
 * @param {'delete'|'warn'|'timeout'|'kick'|'ban'} p.action
 * @param {string} p.reason
 * @param {number} [p.timeoutMs]
 * @param {boolean} [p.deleteMessage]
 */
async function apply({ member, message, action, reason, timeoutMs, deleteMessage }) {
  const guild = member.guild;
  const me = guild.members.me;

  // Nunca pune staff/dono nem alguém acima do bot na hierarquia
  if (member.id === guild.ownerId) return;
  if (member.permissions.has(PermissionFlagsBits.Administrator)) return;
  if (me && member.roles.highest.position >= me.roles.highest.position) return;

  // Apaga a mensagem infratora, se pedido
  if (deleteMessage && message && message.deletable) {
    await message.delete().catch(() => null);
  }

  const log = embeds.danger('Ação de moderação', reason)
    .addFields(
      { name: 'Usuário', value: `${member.user.tag} (${member.id})`, inline: true },
      { name: 'Ação', value: `\`${action}\``, inline: true },
      { name: 'Canal', value: message ? `<#${message.channelId}>` : '—', inline: true },
    );

  try {
    switch (action) {
      case 'delete':
        // A mensagem já foi apagada acima; nada mais a fazer.
        break;

      case 'warn': {
        const total = store.addWarning(guild.id, member.id, reason, me?.id ?? guild.client.user.id);
        log.addFields({ name: 'Avisos', value: `${total}`, inline: true });
        await notifyUser(member, 'Você recebeu um aviso', `Motivo: ${reason}\nTotal de avisos: **${total}**`);
        await maybeEscalate(member, message, total);
        break;
      }

      case 'timeout': {
        const ms = timeoutMs || 5 * 60 * 1000;
        if (me?.permissions.has(PermissionFlagsBits.ModerateMembers)) {
          await member.timeout(ms, reason).catch(() => null);
        }
        await notifyUser(member, 'Você foi silenciado', `Motivo: ${reason}\nDuração: ${Math.round(ms / 60000)} min`);
        break;
      }

      case 'kick':
        await notifyUser(member, 'Você foi expulso', `Motivo: ${reason}`);
        if (me?.permissions.has(PermissionFlagsBits.KickMembers)) {
          await member.kick(reason).catch(() => null);
        }
        break;

      case 'ban':
        await notifyUser(member, 'Você foi banido', `Motivo: ${reason}`);
        if (me?.permissions.has(PermissionFlagsBits.BanMembers)) {
          await member.ban({ reason, deleteMessageSeconds: 60 * 60 }).catch(() => null);
        }
        break;
    }
  } catch (err) {
    logger.error('Erro ao aplicar ação:', err.message);
  }

  logger.mod(`${action} → ${member.user.tag} | ${reason}`);
  await sendLog(guild, log);
}

/** Ao passar do limite de avisos, aplica a punição configurada. */
async function maybeEscalate(member, message, totalWarnings) {
  const settings = store.getSettings(member.guild.id);
  const w = settings.warnings;
  if (!w.enabled || totalWarnings < w.threshold) return;

  store.clearWarnings(member.guild.id, member.id);
  await apply({
    member,
    message,
    action: w.punishment,
    reason: `Atingiu ${w.threshold} avisos`,
    timeoutMs: w.timeoutMs,
    deleteMessage: false,
  });
}

module.exports = { apply, sendLog, notifyUser };
