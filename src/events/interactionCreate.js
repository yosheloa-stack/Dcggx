'use strict';

const { Events, MessageFlags, PermissionFlagsBits } = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');
const store = require('../utils/store');
const { handleButton } = require('../music/panelHandler');
const menu = require('../panel/menu');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    // Botões do painel de música
    if (interaction.isButton() && interaction.customId.startsWith('music:')) {
      return handleButton(interaction);
    }

    // Painel de comandos (botões e modais)
    if (interaction.isButton() && interaction.customId.startsWith(menu.PREFIX)) {
      return menu.handleButton(interaction, client);
    }
    if (interaction.isModalSubmit() && interaction.customId.startsWith(menu.PREFIX)) {
      return menu.handleModal(interaction, client);
    }

    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

    // Canal exclusivo de likes: SÓ o comando /like é permitido lá (vale para todos, até o dono).
    if (interaction.guild) {
      const { likesChannelId } = store.getSettings(interaction.guild.id);
      if (likesChannelId && interaction.channelId === likesChannelId && interaction.commandName !== 'like') {
        return interaction.reply({
          embeds: [embeds.warn('Canal exclusivo', 'Este canal é só para o comando `/like`.')],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Comandos "ownerOnly" exigem ser dono do bot, dono do servidor ou admin.
    if (command.ownerOnly) {
      const isBotOwner = interaction.user.id === process.env.OWNER_ID;
      const isGuildOwner = interaction.guild && interaction.guild.ownerId === interaction.user.id;
      const isAdmin = interaction.memberPermissions?.has(PermissionFlagsBits.Administrator);
      if (!isBotOwner && !isGuildOwner && !isAdmin) {
        return interaction.reply({
          embeds: [embeds.danger('Sem permissão', 'Apenas o dono ou administradores podem usar este comando.')],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    try {
      await command.execute(interaction);
    } catch (err) {
      logger.error(`Erro no comando /${interaction.commandName}:`, err.message);
      const payload = {
        embeds: [embeds.danger('Ops!', 'Ocorreu um erro ao executar o comando.')],
        flags: MessageFlags.Ephemeral,
      };
      if (interaction.replied || interaction.deferred) {
        await interaction.followUp(payload).catch(() => null);
      } else {
        await interaction.reply(payload).catch(() => null);
      }
    }
  },
};
