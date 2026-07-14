'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');

/** /pular — Pula a música atual. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('pular')
    .setDescription('Pula a música que está tocando.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || !player.current) {
      return interaction.reply({
        embeds: [embeds.warn('Nada tocando', 'Não há música tocando no momento.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    const skipped = player.current.title;
    player.skip();
    await interaction.reply({ embeds: [embeds.success('Pulada', `⏭️ Pulei **${skipped}**.`)] });
  },
};
