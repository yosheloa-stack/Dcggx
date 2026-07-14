'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const store = require('../utils/store');
const embeds = require('../utils/embeds');
const modActions = require('../moderation/modActions');

/**
 * /avisos — Gerencia os avisos (warns) dos membros.
 * Restrito a moderadores.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('avisos')
    .setDescription('Gerencia os avisos dos membros.')
    .setDefaultMemberPermissions(PermissionFlagsBits.ModerateMembers)
    .addSubcommand((s) =>
      s.setName('add')
        .setDescription('Adiciona um aviso a um membro.')
        .addUserOption((o) => o.setName('membro').setDescription('Quem receberá o aviso').setRequired(true))
        .addStringOption((o) => o.setName('motivo').setDescription('Motivo do aviso').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('ver')
        .setDescription('Mostra os avisos de um membro.')
        .addUserOption((o) => o.setName('membro').setDescription('Membro a consultar').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('limpar')
        .setDescription('Remove todos os avisos de um membro.')
        .addUserOption((o) => o.setName('membro').setDescription('Membro a limpar').setRequired(true))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();
    const user = interaction.options.getUser('membro');

    if (sub === 'add') {
      const motivo = interaction.options.getString('motivo');
      const member = await interaction.guild.members.fetch(user.id).catch(() => null);
      if (!member) {
        return interaction.reply({ embeds: [embeds.danger('Erro', 'Membro não encontrado.')], flags: MessageFlags.Ephemeral });
      }
      await modActions.apply({
        member,
        action: 'warn',
        reason: `${motivo} (por ${interaction.user.tag})`,
        deleteMessage: false,
      });
      const total = store.getWarnings(guildId, user.id).length;
      return interaction.reply({
        embeds: [embeds.warn('Aviso registrado', `**${user.tag}** agora tem **${total}** aviso(s).`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'ver') {
      const list = store.getWarnings(guildId, user.id);
      if (list.length === 0) {
        return interaction.reply({ embeds: [embeds.info('Sem avisos', `**${user.tag}** não tem avisos.`)], flags: MessageFlags.Ephemeral });
      }
      const desc = list
        .map((w, i) => `**${i + 1}.** ${w.reason}\n<t:${Math.floor(w.at / 1000)}:R>`)
        .join('\n\n');
      return interaction.reply({
        embeds: [embeds.info(`Avisos de ${user.tag} (${list.length})`, desc)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'limpar') {
      store.clearWarnings(guildId, user.id);
      return interaction.reply({
        embeds: [embeds.success('Avisos limpos', `Todos os avisos de **${user.tag}** foram removidos.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
