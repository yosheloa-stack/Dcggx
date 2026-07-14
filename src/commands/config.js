'use strict';

const {
  SlashCommandBuilder,
  PermissionFlagsBits,
  MessageFlags,
} = require('discord.js');
const store = require('../utils/store');
const embeds = require('../utils/embeds');

/**
 * /config — Liga/desliga os sistemas de moderação e mostra o estado atual.
 * Restrito ao dono / GGX Admin.
 */
module.exports = {
  ownerOnly: true,
  data: new SlashCommandBuilder()
    .setName('config')
    .setDescription('Ajusta os sistemas de moderação do GGX (somente dono/admin).')
    .setDefaultMemberPermissions(PermissionFlagsBits.Administrator)
    .addSubcommand((s) =>
      s.setName('ver').setDescription('Mostra a configuração atual do servidor.'))
    .addSubcommand((s) =>
      s.setName('sistema')
        .setDescription('Liga ou desliga um sistema de moderação.')
        .addStringOption((o) =>
          o.setName('nome').setDescription('Qual sistema').setRequired(true).addChoices(
            { name: 'Anti-Link', value: 'antiLink' },
            { name: 'Anti-Spam', value: 'antiSpam' },
            { name: 'Anti-NSFW', value: 'antiNsfw' },
            { name: 'Avisos', value: 'warnings' },
          ))
        .addBooleanOption((o) =>
          o.setName('ativo').setDescription('Ligado (true) ou desligado (false)').setRequired(true)))
    .addSubcommand((s) =>
      s.setName('acao')
        .setDescription('Define a punição de um sistema.')
        .addStringOption((o) =>
          o.setName('sistema').setDescription('Qual sistema').setRequired(true).addChoices(
            { name: 'Anti-Link', value: 'antiLink' },
            { name: 'Anti-Spam', value: 'antiSpam' },
            { name: 'Anti-NSFW', value: 'antiNsfw' },
          ))
        .addStringOption((o) =>
          o.setName('acao').setDescription('O que fazer').setRequired(true).addChoices(
            { name: 'Apagar mensagem', value: 'delete' },
            { name: 'Avisar', value: 'warn' },
            { name: 'Silenciar (timeout)', value: 'timeout' },
            { name: 'Expulsar (kick)', value: 'kick' },
            { name: 'Banir (ban)', value: 'ban' },
          ))),

  async execute(interaction) {
    const guildId = interaction.guild.id;
    const sub = interaction.options.getSubcommand();

    if (sub === 'ver') {
      const s = store.getSettings(guildId);
      const status = (b) => (b ? '🟢 Ligado' : '🔴 Desligado');
      const embed = embeds.info('⚙️ Configuração do GGX')
        .addFields(
          { name: 'Anti-Link', value: `${status(s.antiLink.enabled)} • ação: \`${s.antiLink.action}\``, inline: false },
          { name: 'Anti-Spam', value: `${status(s.antiSpam.enabled)} • ${s.antiSpam.maxMessages} msg / ${s.antiSpam.intervalMs / 1000}s • ação: \`${s.antiSpam.action}\``, inline: false },
          { name: 'Anti-NSFW', value: `${status(s.antiNsfw.enabled)} • ação: \`${s.antiNsfw.action}\` • API externa: ${s.antiNsfw.useExternalApi ? 'sim' : 'não'}`, inline: false },
          { name: 'Avisos', value: `${status(s.warnings.enabled)} • limite: ${s.warnings.threshold} → \`${s.warnings.punishment}\``, inline: false },
          { name: 'Canal de logs', value: s.logChannelId ? `<#${s.logChannelId}>` : 'não definido (rode /setup)', inline: false },
        );
      return interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
    }

    if (sub === 'sistema') {
      const nome = interaction.options.getString('nome');
      const ativo = interaction.options.getBoolean('ativo');
      store.updateSettings(guildId, { [nome]: { enabled: ativo } });
      return interaction.reply({
        embeds: [embeds.success('Atualizado', `Sistema **${nome}** agora está **${ativo ? 'ligado' : 'desligado'}**.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    if (sub === 'acao') {
      const sistema = interaction.options.getString('sistema');
      const acao = interaction.options.getString('acao');
      store.updateSettings(guildId, { [sistema]: { action: acao } });
      return interaction.reply({
        embeds: [embeds.success('Atualizado', `Punição do **${sistema}** definida para \`${acao}\`.`)],
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
