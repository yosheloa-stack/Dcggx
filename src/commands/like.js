'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const frifas = require('../services/frifas');

/**
 * /like — Envia likes diários para um jogador do Free Fire.
 * Usa a Frifas Likes API (https://github.com/HubsGGx/Daily-Likes-FreeFire).
 *
 * Configure a chave em FRIFAS_API_KEY no .env.
 */

// Cooldown simples por UID para não bater na API repetidamente (60s)
const cooldown = new Map();
const COOLDOWN_MS = 60 * 1000;

module.exports = {
  data: new SlashCommandBuilder()
    .setName('like')
    .setDescription('Envia likes para um jogador do Free Fire.')
    .addStringOption((opt) =>
      opt.setName('id')
        .setDescription('UID do jogador do Free Fire')
        .setRequired(true)
        .setMinLength(6)
        .setMaxLength(15)),

  async execute(interaction) {
    const uid = interaction.options.getString('id').trim();

    if (!/^\d+$/.test(uid)) {
      return interaction.reply({
        embeds: [embeds.danger('UID inválido', 'O UID do Free Fire deve conter apenas números.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    // Cooldown por UID
    const last = cooldown.get(uid);
    if (last && Date.now() - last < COOLDOWN_MS) {
      const restante = Math.ceil((COOLDOWN_MS - (Date.now() - last)) / 1000);
      return interaction.reply({
        embeds: [embeds.warn('Calma!', `Já enviei likes para esse UID há pouco. Tente de novo em **${restante}s**.`)],
        flags: MessageFlags.Ephemeral,
      });
    }

    await interaction.deferReply();
    cooldown.set(uid, Date.now());

    const result = await frifas.sendLikes(uid);

    if (!result.ok) {
      cooldown.delete(uid); // libera para tentar de novo já que falhou
      return interaction.editReply({
        embeds: [embeds.danger('Não foi possível enviar os likes', result.error)],
      });
    }

    const d = result.data;
    const embed = embeds
      .success('Likes enviados!', `Likes enviados com sucesso para **${d.nome}**! 🎉`)
      .addFields(
        { name: '👤 Conta', value: `${d.nome}`, inline: true },
        { name: '🆔 UID', value: `\`${d.id}\``, inline: true },
        { name: '🌎 Região', value: `${d.region}`, inline: true },
        { name: '👍 Antes', value: `${d.antes}`, inline: true },
        { name: '➕ Enviados', value: `${d.enviadas}`, inline: true },
        { name: '❤️ Depois', value: `${d.depois}`, inline: true },
      );

    if (d.enviadas === 0) {
      embed.setDescription(`A conta **${d.nome}** já recebeu o máximo de likes por hoje. Volte amanhã!`);
    }

    await interaction.editReply({ embeds: [embed] });
  },
};
