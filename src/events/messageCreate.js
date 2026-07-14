'use strict';

const { Events, PermissionFlagsBits } = require('discord.js');
const antiNsfw = require('../moderation/antiNsfw');
const antiLink = require('../moderation/antiLink');
const antiSpam = require('../moderation/antiSpam');
const logger = require('../utils/logger');

/**
 * Pipeline de moderação automática, em ordem de gravidade:
 * 1) Anti-NSFW  (mais grave)
 * 2) Anti-Link
 * 3) Anti-Spam
 *
 * Cada filtro retorna true quando trata a mensagem, interrompendo o pipeline.
 */
module.exports = {
  name: Events.MessageCreate,
  async execute(message) {
    // Ignora DMs, bots e webhooks
    if (!message.guild || message.author.bot || message.webhookId) return;

    // Ignora administradores (staff confiável)
    if (message.member?.permissions.has(PermissionFlagsBits.Administrator)) return;

    try {
      if (await antiNsfw.check(message)) return;
      if (await antiLink.check(message)) return;
      if (await antiSpam.check(message)) return;
    } catch (err) {
      logger.error('Erro no pipeline de moderação:', err.message);
    }
  },
};
