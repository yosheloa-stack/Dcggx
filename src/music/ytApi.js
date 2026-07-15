'use strict';

const { Readable } = require('node:stream');
const { StreamType } = require('@discordjs/voice');
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
 * Devolve um stream tocável { stream, type } para o @discordjs/voice.
 * Aceita tanto a API que responde o áudio direto quanto a que responde
 * um JSON com o link do áudio.
 */
async function getStream(ytUrl) {
  if (!isConfigured()) throw new Error('YTAUDIO_API_KEY não configurada.');

  const res = await fetch(buildUrl(ytUrl), { headers: { 'User-Agent': 'GGX-Bot' } });
  if (!res.ok || !res.body) {
    throw new Error(`API de áudio respondeu HTTP ${res.status}.`);
  }

  const ct = (res.headers.get('content-type') || '').toLowerCase();

  // Caso 1: a API já devolve o áudio direto
  if (ct.startsWith('audio') || ct.includes('octet-stream') || ct.includes('mpeg') || ct.includes('video')) {
    return { stream: Readable.fromWeb(res.body), type: StreamType.Arbitrary };
  }

  // Caso 2: a API devolve um JSON com o link do áudio
  const data = await res.json().catch(() => null);
  const audioUrl = deepFindUrl(data);
  if (!audioUrl) {
    throw new Error(`API não retornou link de áudio. Resposta: ${JSON.stringify(data).slice(0, 200)}`);
  }

  const audioRes = await fetch(audioUrl, { headers: { 'User-Agent': 'GGX-Bot' } });
  if (!audioRes.ok || !audioRes.body) {
    throw new Error(`Falha ao baixar o áudio (HTTP ${audioRes.status}).`);
  }
  logger.info(`Áudio via API: ${ytUrl}`);
  return { stream: Readable.fromWeb(audioRes.body), type: StreamType.Arbitrary };
}

module.exports = { isConfigured, getStream, deepFindUrl };
