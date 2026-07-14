'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');

/** /pausar — Pausa a música atual. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('pausar')
    .setDescription('Pausa a música atual.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || !player.current) {
      return interaction.reply({
        embeds: [embeds.warn('Nada tocando', 'Não há música tocando.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    player.pause();
    await interaction.reply({ embeds: [embeds.success('Pausado', '⏸️ Música pausada. Use `/retomar` para continuar.')] });
  },
};
