'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');

/** /retomar — Retoma a música pausada. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('retomar')
    .setDescription('Retoma a música pausada.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || !player.current) {
      return interaction.reply({
        embeds: [embeds.warn('Nada tocando', 'Não há música para retomar.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    player.resume();
    await interaction.reply({ embeds: [embeds.success('Retomado', '▶️ Voltando a tocar.')] });
  },
};
