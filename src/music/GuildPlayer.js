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
const play = require('play-dl');
const embeds = require('../utils/embeds');
const logger = require('../utils/logger');

/**
 * Player de música de UM servidor: guarda a conexão de voz, o AudioPlayer,
 * a fila de faixas e cuida da reprodução em sequência.
 */
class GuildPlayer {
  constructor(guild, textChannel) {
    this.guild = guild;
    this.textChannel = textChannel; // onde anuncia "tocando agora"
    this.queue = []; // [{ title, url, durationRaw, thumbnail, requestedBy }]
    this.current = null;
    this.connection = null;
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

  /** Conecta o bot ao canal de voz do usuário. */
  async connect(voiceChannel) {
    if (this.connection) return;
    this.connection = joinVoiceChannel({
      channelId: voiceChannel.id,
      guildId: this.guild.id,
      adapterCreator: this.guild.voiceAdapterCreator,
      selfDeaf: true,
    });
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

  /** Adiciona uma faixa à fila. */
  add(track) {
    this.queue.push(track);
  }

  /** Inicia a reprodução, se ainda não estiver tocando. */
  async start() {
    if (this.current) return; // já tocando
    await this.playNext();
  }

  /** Toca a próxima faixa da fila. */
  async playNext() {
    this.current = null;
    const track = this.queue.shift();

    if (!track) {
      // Fila vazia: agenda saída em 2 min para não ficar ocupando a call à toa
      this.scheduleLeave();
      return;
    }
    this.clearLeave();

    try {
      const source = await play.stream(track.url);
      const resource = createAudioResource(source.stream, { inputType: source.type });
      this.player.play(resource);
      this.current = track;
      this.announce(track);
    } catch (err) {
      logger.error('Falha ao tocar faixa:', err.message);
      if (this.textChannel) {
        this.textChannel
          .send({ embeds: [embeds.danger('Erro', `Não consegui tocar **${track.title}**. Pulando...`)] })
          .catch(() => null);
      }
      this.playNext();
    }
  }

  announce(track) {
    if (!this.textChannel) return;
    const embed = embeds
      .info('🎵 Tocando agora', `**${track.title}**`)
      .addFields(
        { name: 'Duração', value: track.durationRaw || '—', inline: true },
        { name: 'Pedido por', value: `${track.requestedBy}`, inline: true },
      );
    if (track.thumbnail) embed.setThumbnail(track.thumbnail);
    this.textChannel.send({ embeds: [embed] }).catch(() => null);
  }

  skip() {
    // Ao parar o recurso atual, o evento Idle chama playNext()
    this.player.stop();
  }

  pause() {
    return this.player.pause();
  }

  resume() {
    return this.player.unpause();
  }

  stop() {
    this.queue = [];
    this.player.stop();
    this.destroy();
  }

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
    this.current = null;
    this.queue = [];
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
