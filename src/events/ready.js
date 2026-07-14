'use strict';

const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const vision = require('../moderation/visionApi');

module.exports = {
  name: Events.ClientReady,
  once: true,
  execute(client) {
    logger.ok(`GGX online como ${client.user.tag}`);
    logger.info(`Servidores: ${client.guilds.cache.size}`);
    logger.info(
      vision.isConfigured()
        ? 'Anti-NSFW: filtro heurístico + API de visão (Sightengine) ATIVOS.'
        : 'Anti-NSFW: filtro heurístico ATIVO (API de visão não configurada).',
    );

    client.user.setPresence({
      activities: [{ name: 'a moderação do servidor', type: ActivityType.Watching }],
      status: 'online',
    });
  },
};
