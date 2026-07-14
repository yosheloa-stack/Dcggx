'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');

/** /parar — Para a música, limpa a fila e sai da call. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('parar')
    .setDescription('Para a música, limpa a fila e sai do canal de voz.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player) {
      return interaction.reply({
        embeds: [embeds.warn('Nada tocando', 'Não estou tocando nada.')],
        flags: MessageFlags.Ephemeral,
      });
    }
    player.stop();
    await interaction.reply({ embeds: [embeds.success('Parado', '⏹️ Música parada e fila limpa. Saindo da call.')] });
  },
};
