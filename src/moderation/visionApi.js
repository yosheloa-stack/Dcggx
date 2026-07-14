'use strict';

const logger = require('../utils/logger');

/**
 * Integração OPCIONAL com a API de visão computacional Sightengine.
 * Faz a detecção REAL de conteúdo adulto em imagens, gifs e vídeos.
 *
 * Ativa automaticamente quando SIGHTENGINE_API_USER e SIGHTENGINE_API_SECRET
 * estão definidos no .env. Sem essas chaves, o bot usa apenas o filtro
 * heurístico (texto, links, nomes de figurinha e bloqueio de mídia).
 *
 * Docs: https://sightengine.com/docs/
 */

const API_USER = () => process.env.SIGHTENGINE_API_USER;
const API_SECRET = () => process.env.SIGHTENGINE_API_SECRET;

function isConfigured() {
  return Boolean(API_USER() && API_SECRET());
}

const IMAGE_ENDPOINT = 'https://api.sightengine.com/1.0/check.json';
const VIDEO_ENDPOINT = 'https://api.sightengine.com/1.0/video/check-sync.json';

/**
 * Analisa uma URL de mídia.
 * @param {string} url URL pública da imagem/vídeo (CDN do Discord serve isso)
 * @param {boolean} isVideo
 * @returns {Promise<{nsfw:boolean, score:number}|null>}
 */
async function scan(url, isVideo = false) {
  if (!isConfigured()) return null;

  try {
    const endpoint = isVideo ? VIDEO_ENDPOINT : IMAGE_ENDPOINT;
    const params = new URLSearchParams({
      url,
      models: 'nudity-2.1',
      api_user: API_USER(),
      api_secret: API_SECRET(),
    });

    const res = await fetch(`${endpoint}?${params.toString()}`);
    if (!res.ok) {
      logger.warn(`Sightengine respondeu ${res.status}`);
      return null;
    }
    const data = await res.json();
    return isVideo ? parseVideo(data) : parseImage(data);
  } catch (err) {
    logger.error('Erro na API de visão:', err.message);
    return null;
  }
}

function nudityScore(nudity) {
  if (!nudity) return 0;
  // Considera as categorias explícitas/sugestivas do modelo nudity-2.1
  const explicit = nudity.sexual_activity ?? 0;
  const display = nudity.sexual_display ?? 0;
  const erotica = nudity.erotica ?? 0;
  const suggestive = nudity.suggestive ?? 0;
  return Math.max(explicit, display, erotica, suggestive * 0.7);
}

function parseImage(data) {
  const score = nudityScore(data.nudity);
  return { nsfw: score > 0, score };
}

function parseVideo(data) {
  // A resposta de vídeo traz uma lista de frames; usamos o pior caso.
  let worst = 0;
  const frames = data?.data?.frames || [];
  for (const frame of frames) {
    worst = Math.max(worst, nudityScore(frame.nudity));
  }
  return { nsfw: worst > 0, score: worst };
}

module.exports = { scan, isConfigured };
