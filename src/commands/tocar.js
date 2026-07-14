'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');

/** /tocar — Toca uma música no canal de voz (YouTube por nome ou link). */
module.exports = {
  data: new SlashCommandBuilder()
    .setName('tocar')
    .setDescription('Toca uma música no canal de voz.')
    .addStringOption((opt) =>
      opt.setName('musica')
        .setDescription('Nome ou link do YouTube')
        .setRequired(true)),

  async execute(interaction) {
    const voiceChannel = interaction.member.voice?.channel;
    if (!voiceChannel) {
      return interaction.reply({
        embeds: [embeds.danger('Entre numa call', 'Você precisa estar em um canal de voz para usar isso.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const perms = voiceChannel.permissionsFor(interaction.guild.members.me);
    if (!perms?.has('Connect') || !perms?.has('Speak')) {
      return interaction.reply({
        embeds: [embeds.danger('Sem permissão', 'Não tenho permissão para conectar/falar nesse canal de voz.')],
        flags: MessageFlags.Ephemeral,
      });
    }

    const query = interaction.options.getString('musica');
    await interaction.deferReply();

    const track = await music.resolveTrack(query, `${interaction.user}`);
    if (!track) {
      return interaction.editReply({
        embeds: [embeds.danger('Nada encontrado', 'Não achei nenhuma música com esse nome/link.')],
      });
    }

    const player = music.getOrCreatePlayer(interaction.guild, interaction.channel);

    try {
      await player.connect(voiceChannel);
    } catch (err) {
      return interaction.editReply({ embeds: [embeds.danger('Erro', err.message)] });
    }

    player.add(track);
    const position = player.queue.length;
    const willPlayNow = !player.current;

    await player.start();

    const embed = willPlayNow
      ? embeds.success('Tocando', `▶️ **${track.title}**`)
      : embeds.success('Adicionada à fila', `#${position} • **${track.title}**`);
    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
    embed.addFields({ name: 'Duração', value: track.durationRaw || '—', inline: true });

    await interaction.editReply({ embeds: [embed] });
  },
};
