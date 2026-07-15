'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');

/** /ping — Verifica se o GGX está online e mostra a latência. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('ping')
    .setDescription('Mostra a latência do bot.'),

  async execute(interaction) {
    await interaction.reply({
      embeds: [embeds.info('🏓 Pong!', 'Calculando latência...')],
      flags: MessageFlags.Ephemeral,
    });
    const latency = Date.now() - interaction.createdTimestamp;
    const api = Math.round(interaction.client.ws.ping);
    await interaction.editReply({
      embeds: [embeds.info('🏓 Pong!', `Resposta: **${latency}ms**\nAPI: **${api}ms**`)],
    });
  },
};
