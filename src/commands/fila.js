'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');

/** /fila — Mostra a música atual e as próximas da fila. */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('fila')
    .setDescription('Mostra a fila de músicas.'),

  async execute(interaction) {
    const player = music.getPlayer(interaction.guild);
    if (!player || (!player.current && player.queue.length === 0)) {
      return interaction.reply({
        embeds: [embeds.warn('Fila vazia', 'Não há músicas na fila.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const linhas = [];
    if (player.current) linhas.push(`▶️ **Tocando:** ${player.current.title}`);

    if (player.queue.length) {
      const proximas = player.queue
        .slice(0, 10)
        .map((t, i) => `\`${i + 1}.\` ${t.title}`)
        .join('\n');
      linhas.push('', '**Próximas:**', proximas);
      if (player.queue.length > 10) linhas.push(`… e mais ${player.queue.length - 10}.`);
    }

    await interaction.reply({
      embeds: [embeds.info('🎶 Fila de músicas', linhas.join('\n'))],
      flags: MessageFlags.Ephemeral,
    });
  },
};
