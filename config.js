'use strict';

/**
 * Configuração PADRÃO do GGX.
 *
 * Estes valores são o ponto de partida de cada servidor. Depois que o bot
 * entra em um servidor, cada guild recebe sua própria cópia editável
 * (armazenada em data/guilds.json) e pode ser ajustada com o comando /config.
 */
module.exports = {
  // Identidade visual do bot
  brand: {
    name: 'GGX',
    color: 0x5865f2, // roxo Discord
    dangerColor: 0xed4245, // vermelho (punições)
    successColor: 0x57f287, // verde
    warnColor: 0xfee75c, // amarelo (avisos)
    footer: 'GGX • Moderação Profissional',
  },

  // Configuração padrão aplicada a cada servidor
  defaults: {
    // Canal onde o bot registra as ações de moderação (definido no /setup)
    logChannelId: null,
    // Cargo aplicado a quem é silenciado (definido no /setup)
    mutedRoleId: null,
    // Canal exclusivo do comando /like — ninguém conversa, só usa /like (definido no /setup)
    likesChannelId: null,

    // ---------------- ANTI-LINK ----------------
    antiLink: {
      enabled: true,
      // Quem pode enviar links livremente (nomes de cargo criados pelo /setup)
      allowedRoles: ['GGX Admin', 'Moderador'],
      // Canais liberados para links (IDs). Vazio = todos filtrados.
      allowedChannels: [],
      // Domínios sempre permitidos (ex.: convites do próprio servidor)
      whitelist: ['discord.gg', 'discord.com', 'youtube.com', 'youtu.be'],
      // Ação: 'delete' | 'warn' | 'timeout' | 'kick'
      action: 'warn',
      // Deletar a mensagem que contém o link
      deleteMessage: true,
    },

    // ---------------- ANTI-SPAM ----------------
    antiSpam: {
      enabled: true,
      // Nº máximo de mensagens...
      maxMessages: 5,
      // ...dentro desta janela (em milissegundos)
      intervalMs: 5000,
      // Bloquear repetição da mesma mensagem
      blockDuplicates: true,
      maxDuplicates: 3,
      // Ação ao detectar spam: 'delete' | 'warn' | 'timeout' | 'kick'
      action: 'timeout',
      // Duração do timeout em ms (5 min)
      timeoutMs: 5 * 60 * 1000,
    },

    // ---------------- ANTI-NSFW ----------------
    antiNsfw: {
      enabled: true,
      // Bloquear qualquer imagem/vídeo/figurinha em canais NÃO marcados como NSFW
      blockMediaOutsideNsfw: false,
      // Bloquear figurinhas (stickers) suspeitas pelo nome
      scanStickers: true,
      // Usar a API externa (Sightengine) quando as chaves estiverem no .env
      useExternalApi: true,
      // Limite de confiança (0 a 1) para considerar uma mídia como NSFW via API
      apiThreshold: 0.6,
      // Ação: 'delete' | 'warn' | 'timeout' | 'kick'
      action: 'kick',
      deleteMessage: true,
    },

    // ---------------- MÚSICA ----------------
    music: {
      // Só permite tocar se a pessoa estiver num canal de voz "de música"
      onlyInMusicChannels: true,
      // Palavras que identificam um canal de música (pelo nome, sem acento)
      channelKeywords: ['music', 'musica'],
      // Uma call por vez: se o bot já estiver tocando em outra call, recusa
      // pedidos vindos de calls diferentes (sempre ligado por design).
    },

    // ---------------- AVISOS ----------------
    warnings: {
      enabled: true,
      // Ao atingir este número de avisos, aplica a punição abaixo
      threshold: 3,
      // 'timeout' | 'kick' | 'ban'
      punishment: 'kick',
      timeoutMs: 60 * 60 * 1000, // 1h (se punishment = timeout)
    },
  },
};
