'use strict';

const {
  joinVoiceChannel,
  createAudioPlayer,
  createAudioResource,
  AudioPlayerStatus,
  VoiceConnectionStatus,
  entersState,
  NoSubscriberBehavior,
} = require('@discordjs/voice');
const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
} = require('discord.js');
const play = require('play-dl');
const ytApi = require('./ytApi');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

/**
 * Player de música de UM servidor: conexão de voz, fila, histórico e o
 * PAINEL DE MÚSICA com botões (pause, skip, back, volume, loop, shuffle,
 * autoplay, stop, playlist).
 */
class GuildPlayer {
  constructor(guild, textChannel) {
    this.guild = guild;
    this.textChannel = textChannel;
    this.queue = [];
    this.history = [];
    this.current = null;
    this.connection = null;
    this.voiceChannelId = null;
    this.currentResource = null;
    this.panelMessage = null;

    // Estado dos controles
    this.loop = false;
    this.autoplay = false;
    this.volume = 1.0; // 1.0 = 100%

    this.player = createAudioPlayer({
      behaviors: { noSubscriber: NoSubscriberBehavior.Pause },
    });
    this.leaveTimeout = null;

    this.player.on(AudioPlayerStatus.Idle, () => this.playNext());
    this.player.on('error', (err) => {
      logger.error('Erro no player de música:', err.message);
      this.playNext();
    });
  }

  // ---------------------------------------------------------------- conexão
  async connect(voiceChannel) {
    if (this.connection) return;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
    this.voiceChannelId = voiceChannel.id;
    this.connection.subscribe(this.player);

    try {
      await entersState(this.connection, VoiceConnectionStatus.Ready, 20_000);
    } catch {
      this.destroy();
      throw new Error('Não consegui entrar no canal de voz.');
    }

    this.connection.on(VoiceConnectionStatus.Disconnected, async () => {
      try {
        await Promise.race([
          entersState(this.connection, VoiceConnectionStatus.Signalling, 5_000),
          entersState(this.connection, VoiceConnectionStatus.Connecting, 5_000),
        ]);
      } catch {
        this.destroy();
      }
    });
  }

  // ------------------------------------------------------------------- fila
  add(track) {
    this.queue.push(track);
  }

  async start() {
    if (this.current) return;
    await this.playNext();
  }

  async playNext() {
    const finished = this.current;
    this.current = null;

    let track;
    if (this.loop && finished) {
      track = finished; // repete a mesma música
    } else {
      if (finished) {
        this.history.push(finished);
        if (this.history.length > 50) this.history.shift();
      }
      track = this.queue.shift();
      if (!track && this.autoplay && finished) {
        track = await this.getRelated(finished);
      }
    }

    if (!track) {
      await this.removePanel();
      this.scheduleLeave();
      return;
    }
    this.clearLeave();

    try {
      // Usa a API externa (contorna o bloqueio do YouTube); cai no play-dl se falhar
      let source;
      if (ytApi.isConfigured()) {
        try {
          source = await ytApi.getStream(track.url);
        } catch (apiErr) {
          logger.warn(`API de áudio falhou (${apiErr.message}); tentando play-dl...`);
          source = await play.stream(track.url);
        }
      } else {
        source = await play.stream(track.url);
      }

      const resource = createAudioResource(source.stream, {
        inputType: source.type,
        inlineVolume: true,
      });
      resource.volume?.setVolume(this.volume);
      this.currentResource = resource;
      this.player.play(resource);
      this.current = track;
      await this.showPanel();
    } catch (err) {
      logger.error('Falha ao tocar faixa:', err.message);
      const bloqueio = /confirm you.?re not a bot|sign in|429|consent/i.test(err.message || '');
      const msg = bloqueio
        ? `O YouTube bloqueou a busca (**${track.title}**). Configure o \`YOUTUBE_COOKIE\` no bot para resolver.`
        : `Não consegui tocar **${track.title}**. Pulando...`;
      this.textChannel?.send({ embeds: [embeds.danger('Erro na música', msg)] }).catch(() => null);
      this.playNext();
    }
  }

  /** Busca uma música relacionada para o AutoPlay. */
  async getRelated(track) {
    try {
      const info = await play.video_basic_info(track.url);
      const related = info?.related_videos || [];
      for (const url of related) {
        if (!this.history.some((h) => h.url === url) && url !== track.url) {
          const vi = await play.video_basic_info(url).catch(() => null);
          const v = vi?.video_details;
          if (v?.url) {
            return {
              title: v.title || 'Sem título',
              url: v.url,
              durationRaw: v.durationRaw || null,
              thumbnail: v.thumbnails?.[0]?.url || null,
              author: v.channel?.name || '—',
              requestedBy: '🔁 AutoPlay',
            };
          }
        }
      }
    } catch (err) {
      logger.error('AutoPlay falhou:', err.message);
    }
    return null;
  }

  // -------------------------------------------------------------- controles
  skip() {
    this.player.stop();
  }

  back() {
    const prev = this.history.pop();
    if (!prev) return false;
    this.loop = false;
    this.queue.unshift(prev);
    this.player.stop();
    return true;
  }

  togglePause() {
    if (this.player.state.status === AudioPlayerStatus.Paused) {
      this.player.unpause();
      return false; // não está mais pausado
    }
    this.player.pause();
    return true; // agora pausado
  }

  get isPaused() {
    return this.player.state.status === AudioPlayerStatus.Paused;
  }

  toggleLoop() {
    this.loop = !this.loop;
    return this.loop;
  }

  toggleAutoplay() {
    this.autoplay = !this.autoplay;
    return this.autoplay;
  }

  shuffle() {
    for (let i = this.queue.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [this.queue[i], this.queue[j]] = [this.queue[j], this.queue[i]];
    }
  }

  setVolume(v) {
    this.volume = Math.max(0, Math.min(2, Math.round(v * 10) / 10));
    this.currentResource?.volume?.setVolume(this.volume);
    return this.volume;
  }

  volumeUp() {
    return this.setVolume(this.volume + 0.1);
  }

  volumeDown() {
    return this.setVolume(this.volume - 0.1);
  }

  stop() {
    this.queue = [];
    this.loop = false;
    this.autoplay = false;
    this.player.stop();
    this.destroy();
  }

  // ------------------------------------------------------------------ painel
  buildEmbed() {
    const t = this.current;
    const embed = embeds.info('🎶 MUSIC PANEL')
      .setDescription(`💿 **${t.title}**`)
      .addFields(
        { name: '🙋 Pedido por', value: `${t.requestedBy}`, inline: true },
        { name: '⏱️ Duração', value: t.durationRaw || '—', inline: true },
        { name: '🎤 Autor', value: t.author || '—', inline: true },
        { name: '🔊 Volume', value: `${Math.round(this.volume * 100)}%`, inline: true },
        { name: '🔁 Loop', value: this.loop ? 'Ligado' : 'Desligado', inline: true },
        { name: '📻 AutoPlay', value: this.autoplay ? 'Ligado' : 'Desligado', inline: true },
      );
    if (t.thumbnail) embed.setThumbnail(t.thumbnail);
    if (this.queue.length) embed.setFooter({ text: `${this.queue.length} na fila • GGX` });
    return embed;
  }

  buildComponents() {
    const btn = (id, label, emoji, style = ButtonStyle.Secondary) =>
      new ButtonBuilder().setCustomId(`music:${id}`).setLabel(label).setEmoji(emoji).setStyle(style);

    const row1 = new ActionRowBuilder().addComponents(
      btn('down', 'Down', '🔉'),
      btn('back', 'Back', '⏮️'),
      btn('pause', this.isPaused ? 'Play' : 'Pause', this.isPaused ? '▶️' : '⏸️', ButtonStyle.Primary),
      btn('skip', 'Skip', '⏭️'),
      btn('up', 'Up', '🔊'),
    );
    const row2 = new ActionRowBuilder().addComponents(
      btn('shuffle', 'Shuffle', '🔀'),
      btn('loop', 'Loop', '🔁', this.loop ? ButtonStyle.Success : ButtonStyle.Secondary),
      btn('stop', 'Stop', '⏹️', ButtonStyle.Danger),
      btn('autoplay', 'AutoPlay', '📻', this.autoplay ? ButtonStyle.Success : ButtonStyle.Secondary),
      btn('playlist', 'Playlist', '🎵'),
    );
    return [row1, row2];
  }

  renderPanel() {
    return { embeds: [this.buildEmbed()], components: this.buildComponents() };
  }

  /** Novo track: apaga o painel antigo e posta um novo (sempre no fim do chat). */
  async showPanel() {
    if (!this.textChannel) return;
    await this.removePanel();
    this.panelMessage = await this.textChannel.send(this.renderPanel()).catch(() => null);
  }

  /** Atualiza o painel existente (troca de estado: volume, loop, pause...). */
  async refreshPanel() {
    if (this.panelMessage) {
      await this.panelMessage.edit(this.renderPanel()).catch(() => null);
    }
  }

  async removePanel() {
    if (this.panelMessage) {
      await this.panelMessage.delete().catch(() => null);
      this.panelMessage = null;
    }
  }

  // ------------------------------------------------------------------- saída
  scheduleLeave() {
    this.clearLeave();
    this.leaveTimeout = setTimeout(() => this.destroy(), 2 * 60 * 1000);
  }

  clearLeave() {
    if (this.leaveTimeout) {
      clearTimeout(this.leaveTimeout);
      this.leaveTimeout = null;
    }
  }

  destroy() {
    this.clearLeave();
    this.removePanel();
    this.current = null;
    this.queue = [];
    this.history = [];
    this.currentResource = null;
    this.voiceChannelId = null;
    try {
      this.connection?.destroy();
    } catch {
      /* já destruída */
    }
    this.connection = null;
    if (this.guild.client.music) {
      this.guild.client.music.delete(this.guild.id);
    }
  }
}

module.exports = GuildPlayer;
