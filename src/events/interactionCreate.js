'use strict';

const { Events, MessageFlags, PermissionFlagsBits } = require('discord.js');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

module.exports = {
  name: Events.InteractionCreate,
  async execute(interaction, client) {
    if (!interaction.isChatInputCommand()) return;

    const command = client.commands.get(interaction.commandName);
    if (!command) return;

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
