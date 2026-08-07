'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const config = require('../../config');

/**
 * /criador — Mostra quem é o criador/dono do bot.
 *
 * Se OWNER_ID estiver definido no .env, busca o perfil real no Discord
 * (avatar, nome e @usuário atualizados). Caso não consiga, usa os dados
 * de reserva de config.creator.
 */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('criador')
    .setDescription('Mostra o criador do bot.'),

  async execute(interaction) {
    const ownerId = process.env.OWNER_ID;
    let user = null;
    if (ownerId) {
      user = await interaction.client.users.fetch(ownerId).catch(() => null);
    }

    const nome = user ? (user.globalName || user.username) : config.creator.name;
    const username = user ? user.username : config.creator.username;

    const embed = embeds
      .info('👑 Criador do GGX')
      .setDescription(`Este bot foi criado por **${nome}**.`)
      .addFields(
        { name: '👤 Nome', value: `${nome}`, inline: true },
        { name: '🏷️ Usuário', value: `\`${username}\``, inline: true },
      );

    if (user) {
      embed
        .setThumbnail(user.displayAvatarURL({ size: 256 }))
        .addFields({ name: '🆔 ID', value: `\`${user.id}\``, inline: true });
    }

    await interaction.reply({ embeds: [embed], flags: MessageFlags.Ephemeral });
  },
};
