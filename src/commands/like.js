'use strict';

const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  MessageFlags,
} = require('discord.js');
const embeds = require('../utils/embeds');
const frifas = require('../services/frifas');

/**
 * /like — Envia 220 likes para um jogador do Free Fire.
 * Usa a API do Auto Like System (https://autolikesystem.com.br/docs).
 *
 * Dá para usar de dois jeitos:
 *   - /like id:123456789  → envia na hora;
 *   - /like  (sem id)     → posta um botão "Enviar Likes"; ao clicar, abre um
 *                           MODAL para digitar o UID (ideal no canal de likes).
 *
 * Configure a chave em FRIFAS_API_KEY no .env.
 */

// Cooldown simples por UID para não bater na API repetidamente (60s)
const cooldown = new Map();
const COOLDOWN_MS = 60 * 1000;

const PREFIX = 'like:';

/** Botão que abre o modal de UID (usado no painel do /like). */
function buildLikePanel() {
  const embed = embeds.info('👍 Enviar Likes — Free Fire')
    .setDescription('Clique no botão abaixo e digite o **UID** do jogador para receber os likes do dia.');
  const row = new ActionRowBuilder().addComponents(
    new ButtonBuilder()
      .setCustomId(`${PREFIX}open`)
      .setLabel('Enviar Likes')
      .setEmoji('👍')
      .setStyle(ButtonStyle.Success),
  );
  return { embeds: [embed], components: [row] };
}

/** Modal que pede o UID do jogador. */
function buildLikeModal() {
  return new ModalBuilder()
    .setCustomId(`${PREFIX}modal`)
    .setTitle('👍 Enviar likes (Free Fire)')
    .addComponents(
      new ActionRowBuilder().addComponents(
        new TextInputBuilder()
          .setCustomId('id')
          .setLabel('UID do jogador')
          .setStyle(TextInputStyle.Short)
          .setPlaceholder('Somente números')
          .setMinLength(6)
          .setMaxLength(15)
          .setRequired(true),
      ),
    );
}

/**
 * Núcleo do envio de likes. Reaproveitado pelo comando, pelo botão e pelo
 * modal — recebe a interação e o UID digitado.
 */
async function processLikes(interaction, uidRaw) {
  const uid = (uidRaw || '').trim();

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

  // Resposta privada: só quem pediu vê o resultado ("só o bot e o user").
  await interaction.deferReply({ flags: MessageFlags.Ephemeral });
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
      { name: '➕ Enviados', value: `${d.enviadas}`, inline: true },
    );

  if (d.enviadas === 0) {
    embed.setDescription(`A conta **${d.nome}** já recebeu o máximo de likes por hoje. Volte amanhã!`);
  }

  await interaction.editReply({ embeds: [embed] });
}

/** Clique no botão "Enviar Likes" → abre o modal de UID. */
async function handleButton(interaction) {
  return interaction.showModal(buildLikeModal());
}

/** Envio do modal → processa os likes com o UID digitado. */
async function handleModal(interaction) {
  const uid = interaction.fields.getTextInputValue('id');
  return processLikes(interaction, uid);
}

module.exports = {
  PREFIX,
  handleButton,
  handleModal,

  data: new SlashCommandBuilder()
    .setName('like')
    .setDescription('Envia likes para um jogador do Free Fire.')
    .addStringOption((opt) =>
      opt.setName('id')
        .setDescription('UID do jogador do Free Fire (deixe vazio para abrir um formulário)')
        .setRequired(false)
        .setMinLength(6)
        .setMaxLength(15)),

  async execute(interaction) {
    const uid = interaction.options.getString('id');

    // Sem UID: posta o botão que abre o modal (ideal no canal de likes).
    if (!uid) {
      return interaction.reply(buildLikePanel());
    }

    return processLikes(interaction, uid);
  },
};
