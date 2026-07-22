'use strict';

const {
  SlashCommandBuilder,
  MessageFlags,
  PermissionFlagsBits,
  OAuth2Scopes,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const embeds = require('../utils/embeds');

/**
 * Permissões que o GGX precisa para funcionar em um servidor novo
 * (setup de cargos/canais, moderação, mensagens e música na call).
 */
const REQUIRED_PERMISSIONS = [
  PermissionFlagsBits.ManageGuild,
  PermissionFlagsBits.ManageRoles,
  PermissionFlagsBits.ManageChannels,
  PermissionFlagsBits.ManageMessages,
  PermissionFlagsBits.KickMembers,
  PermissionFlagsBits.BanMembers,
  PermissionFlagsBits.ModerateMembers,
  PermissionFlagsBits.ViewChannel,
  PermissionFlagsBits.SendMessages,
  PermissionFlagsBits.EmbedLinks,
  PermissionFlagsBits.AttachFiles,
  PermissionFlagsBits.ReadMessageHistory,
  PermissionFlagsBits.MentionEveryone,
  PermissionFlagsBits.Connect,
  PermissionFlagsBits.Speak,
  PermissionFlagsBits.UseVAD,
];

/**
 * /convite — Gera o link para adicionar o GGX em outros servidores.
 *
 * Um bot do Discord não "entra" sozinho em um servidor: ele precisa ser
 * adicionado por alguém com a permissão "Gerenciar Servidor" através deste
 * link de convite (OAuth2). Este comando monta esse link automaticamente.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('convite')
    .setDescription('Gera o link para adicionar o GGX em outros servidores.'),

  async execute(interaction) {
    const invite = interaction.client.generateInvite({
      scopes: [OAuth2Scopes.Bot, OAuth2Scopes.ApplicationsCommands],
      permissions: REQUIRED_PERMISSIONS,
    });

    const embed = embeds
      .info('➕ Adicionar o GGX em outro servidor')
      .setDescription(
        [
          'Clique no botão abaixo para adicionar o **GGX** em qualquer servidor.',
          '',
          '> ℹ️ Só é possível adicionar em servidores onde você tem a permissão',
          '> **Gerenciar Servidor**. Depois de adicionar, rode `/setup` por lá.',
        ].join('\n'),
      );

    const row = new ActionRowBuilder().addComponents(
      new ButtonBuilder()
        .setStyle(ButtonStyle.Link)
        .setLabel('Adicionar em um servidor')
        .setEmoji('➕')
        .setURL(invite),
    );

    await interaction.reply({
      embeds: [embed],
      components: [row],
      flags: MessageFlags.Ephemeral,
    });
  },
};
