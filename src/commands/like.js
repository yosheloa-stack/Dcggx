'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');

/**
 * /like — Publica uma mensagem/sugestão e adiciona reações de votação
 * (👍 curtir / 👎 não curtir). Útil para enquetes, feedback e destaques.
 *
 * Nota: assim que você me enviar os repositórios de referência, dá para
 * evoluir isso para um sistema completo de sugestões com contagem e ranking.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('like')
    .setDescription('Publica uma mensagem e abre votação com 👍 / 👎.')
    .addStringOption((opt) =>
      opt.setName('mensagem')
        .setDescription('O que será publicado para votação')
        .setRequired(true)),

  async execute(interaction) {
    const text = interaction.options.getString('mensagem');

    await interaction.reply({
      embeds: [embeds.success('Publicado!', 'Sua votação foi enviada no canal.')],
      flags: MessageFlags.Ephemeral,
    });

    const embed = embeds
      .info('👍 Votação', text)
      .setAuthor({
        name: interaction.user.username,
        iconURL: interaction.user.displayAvatarURL(),
      });

    const msg = await interaction.channel.send({ embeds: [embed] });
    await msg.react('👍');
    await msg.react('👎');
  },
};
