'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const embeds = require('../utils/embeds');

/**
 * /marcar — Marca (menciona) todos os membros do servidor com uma mensagem.
 * Restrito a quem tem permissão de Mencionar Todos / Gerenciar Mensagens.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('marcar')
    .setDescription('Marca todo mundo (@everyone) com uma mensagem.')
    .addStringOption((opt) =>
      opt.setName('mensagem')
        .setDescription('Mensagem que acompanha a marcação')
        .setRequired(false))
    .addBooleanOption((opt) =>
      opt.setName('aqui')
        .setDescription('Usar @here (só quem está online) em vez de @everyone')
        .setRequired(false))
    .setDefaultMemberPermissions(PermissionFlagsBits.MentionEveryone),

  async execute(interaction) {
    const text = interaction.options.getString('mensagem') || '';
    const here = interaction.options.getBoolean('aqui') || false;
    const mention = here ? '@here' : '@everyone';

    await interaction.reply({
      embeds: [embeds.success('Marcação enviada', `Membros marcados com ${mention}.`)],
      flags: MessageFlags.Ephemeral,
    });

    const embed = embeds.info(`📢 Aviso de ${interaction.user.username}`, text || null);

    await interaction.channel.send({
      content: mention,
      embeds: text ? [embed] : [],
      allowedMentions: { parse: here ? ['everyone'] : ['everyone'] },
    });
  },
};
