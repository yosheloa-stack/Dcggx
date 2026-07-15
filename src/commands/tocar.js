'use strict';

const { SlashCommandBuilder, MessageFlags } = require('discord.js');
const embeds = require('../utils/embeds');
const music = require('../music/manager');
const store = require('../utils/store');

const DEFAULT_MUSIC = { onlyInMusicChannels: true, channelKeywords: ['music', 'musica'] };
const norm = (s) => (s || '').toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');

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

    // Regra 1: só toca em canal de voz "de música" (ex.: 🎵 Music 1)
    const musicCfg = store.getSettings(interaction.guild.id).music || DEFAULT_MUSIC;
    if (musicCfg.onlyInMusicChannels) {
      const nome = norm(voiceChannel.name);
      const ehMusica = (musicCfg.channelKeywords || DEFAULT_MUSIC.channelKeywords).some((k) => nome.includes(k));
      if (!ehMusica) {
        return interaction.reply({
          embeds: [embeds.warn('Call errada', 'Entre em uma call de música (🎵 **Music**) para pedir músicas.')],
          flags: MessageFlags.Ephemeral,
        });
      }
    }

    // Regra 2: uma call por vez — se o bot já está tocando em OUTRA call, recusa
    const existing = music.getPlayer(interaction.guild);
    if (existing && existing.voiceChannelId && existing.voiceChannelId !== voiceChannel.id) {
      return interaction.reply({
        embeds: [embeds.warn(
          'Já estou ocupado',
          `Já estou tocando na call <#${existing.voiceChannelId}>. Espere terminar ou entre nessa call — só consigo tocar em uma de cada vez.`,
        )],
        flags: MessageFlags.Ephemeral,
      });
    }

    const query = interaction.options.getString('musica');
    // Confirmação privada; o painel rico com botões é postado pelo próprio player.
    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

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

    const willPlayNow = !player.current;
    player.add(track);
    const position = player.queue.length;

    await player.start();

    if (willPlayNow) {
      // O painel já aparece no canal; confirmação discreta só para quem pediu.
      await interaction.editReply({ embeds: [embeds.success('Tocando', `▶️ **${track.title}**`)] });
    } else {
      // Adicionada à fila: avisa no canal (todo mundo vê), estilo "Song Added to Queue".
      await interaction.editReply({ embeds: [embeds.success('Na fila', `Adicionada na posição #${position}.`)] });
      const embed = embeds.info('🎵 Adicionada à fila', `#${position} • **${track.title}**`)
        .addFields({ name: 'Duração', value: track.durationRaw || '—', inline: true });
      if (track.thumbnail) embed.setThumbnail(track.thumbnail);
      interaction.channel.send({ embeds: [embed] }).catch(() => null);
    }
  },
};
