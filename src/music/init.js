'use strict';

const play = require('play-dl');
const logger = require('../utils/logger');

/**
 * Configura o play-dl com o cookie do YouTube (se fornecido no .env).
 *
 * O YouTube bloqueia servidores de nuvem com "Sign in to confirm you're not a
 * bot". Passar o cookie de uma conta logada reduz muito esse bloqueio.
 *
 * Como pegar o cookie: veja YOUTUBE_COOKIE no .env.example.
 */
async function initMusic() {
  const cookie = process.env.YOUTUBE_COOKIE;
  if (!cookie) {
    logger.warn('YOUTUBE_COOKIE não definido — o YouTube pode bloquear a música ("Sign in to confirm you\'re not a bot").');
    return;
  }
  try {
    await play.setToken({ youtube: { cookie } });
    logger.ok('play-dl configurado com o cookie do YouTube.');
  } catch (err) {
    logger.error('Falha ao configurar o cookie do YouTube:', err.message);
  }
}

module.exports = { initMusic };
