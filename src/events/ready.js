'use strict';

const { Events, ActivityType } = require('discord.js');
const logger = require('../utils/logger');
const vision = require('../moderation/visionApi');

/** Registra os slash commands automaticamente ao ligar (ideal p/ hospedagem). */
async function registerCommands(client) {
  const commands = [...client.commands.values()].map((c) => c.data.toJSON());
  try {
    const guildId = process.env.GUILD_ID;
    if (guildId) {
      const guild = await client.guilds.fetch(guildId).catch(() => null);
      if (guild) {
        await guild.commands.set(commands);
        logger.ok(`${commands.length} comando(s) registrado(s) no servidor ${guildId}.`);
        return;
      }
      logger.warn(`GUILD_ID ${guildId} não encontrado; registrando globalmente.`);
    }
    await client.application.commands.set(commands);
    logger.ok(`${commands.length} comando(s) registrado(s) globalmente (pode levar até 1h).`);
  } catch (err) {
    logger.error('Falha ao registrar comandos:', err.message);
  }
}

module.exports = {
  name: Events.ClientReady,
  once: true,
  async execute(client) {
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

    await registerCommands(client);
  },
};
