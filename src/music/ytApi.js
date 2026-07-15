'use strict';

const logger = require('../utils/logger');

/**
 * Cliente da API externa de áudio do YouTube (ex.: zero-two-apis.store).
 * Baixa o áudio pelo servidor da API, contornando o bloqueio do YouTube
 * ("Sign in to confirm you're not a bot") em hospedagem na nuvem.
 *
 * Configuração no .env:
 *   YTAUDIO_API_URL   (padrão: https://zero-two-apis.store/api/dl/ytaudio)
 *   YTAUDIO_API_KEY   (a apikey)
 */

const BASE = () => process.env.YTAUDIO_API_URL || 'https://zero-two-apis.store/api/dl/ytaudio';
const KEY = () => process.env.YTAUDIO_API_KEY;

function isConfigured() {
  return Boolean(KEY());
}

/** Monta a URL da API para uma URL do YouTube. */
function buildUrl(ytUrl) {
  const sep = BASE().includes('?') ? '&' : '?';
  return `${BASE()}${sep}url=${encodeURIComponent(ytUrl)}&apikey=${encodeURIComponent(KEY())}`;
}

/** Procura recursivamente no JSON a melhor URL de áudio. */
function deepFindUrl(obj) {
  const urls = [];
  const walk = (v) => {
    if (!v) return;
    if (typeof v === 'string') {
      if (/^https?:\/\//i.test(v)) urls.push(v);
    } else if (Array.isArray(v)) {
      v.forEach(walk);
    } else if (typeof v === 'object') {
      Object.values(v).forEach(walk);
    }
  };
  walk(obj);
  if (!urls.length) return null;

  // Prioriza links que parecem de mídia/áudio
  const score = (u) => {
    const s = u.toLowerCase();
    let n = 0;
    if (s.includes('googlevideo')) n += 5;
    if (/\.(mp3|m4a|opus|webm|ogg|aac)(\?|$)/.test(s)) n += 4;
    if (s.includes('audio')) n += 3;
    if (s.includes('/dl') || s.includes('cdn') || s.includes('download')) n += 2;
    n += Math.min(u.length / 100, 2); // links de mídia costumam ser longos
    return n;
  };
  urls.sort((a, b) => score(b) - score(a));
  return urls[0];
}

/**
 * Devolve a URL direta do áudio (para o ffmpeg baixar com reconexão).
 * Aceita tanto a API que responde o áudio direto quanto a que responde
 * um JSON com o link do áudio.
 * @returns {Promise<string>} URL de áudio tocável
 */
async function getAudioUrl(ytUrl) {
  if (!isConfigured()) throw new Error('YTAUDIO_API_KEY não configurada.');

  const apiUrl = buildUrl(ytUrl);
  const res = await fetch(apiUrl, { headers: { 'User-Agent': 'GGX-Bot' } });
  if (!res.ok) {
    throw new Error(`API de áudio respondeu HTTP ${res.status}.`);
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase();

  // Caso 1: a API entrega o áudio direto nessa URL -> o ffmpeg busca por ela
  if (ct.startsWith('audio') || ct.includes('octet-stream') || ct.includes('mpeg') || ct.includes('video')) {
    res.body?.cancel?.().catch(() => {});
    return apiUrl;
  }

  // Caso 2: a API devolve um JSON com o link do áudio
  const data = await res.json().catch(() => null);
  const audioUrl = deepFindUrl(data);
  if (!audioUrl) {
    throw new Error(`API não retornou link de áudio. Resposta: ${JSON.stringify(data).slice(0, 200)}`);
  }
  logger.info(`Áudio via API: ${ytUrl}`);
  return audioUrl;
}

module.exports = { isConfigured, getAudioUrl, deepFindUrl };
