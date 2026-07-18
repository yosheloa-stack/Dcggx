'use strict';

const { SlashCommandBuilder, PermissionFlagsBits } = require('discord.js');
const { buildPanelMessage } = require('../panel/menu');

/**
 * /painel — Posta o painel de comandos por BOTÃO e MODAL.
 *
 * A mensagem fica no canal para qualquer membro clicar. Os comandos que
 * precisam de dados abrem um formulário (modal). Restrito a quem gerencia
 * o servidor para evitar spam de painéis.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('painel')
    .setDescription('Posta o painel de comandos do GGX (botões e formulários).')
    .setDefaultMemberPermissions(PermissionFlagsBits.ManageGuild),

  async execute(interaction) {
    await interaction.reply(buildPanelMessage());
  },
};
