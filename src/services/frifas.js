'use strict';

const logger = require('../utils/logger');

/**
 * Cliente da API de likes do Free Fire (Auto Like System).
 * Documentação: https://autolikesystem.com.br/docs
 *
 * Endpoint usado: /send-like?key=&uid=&region=&token=
 *   - key    : chave de acesso (secreta, vem do .env como FRIFAS_API_KEY)
 *   - uid    : UID do jogador
 *   - region : região da conta (obrigatório) — padrão BR
 *   - token  : quantidade de likes (50 a 350). Aqui é fixo em 220.
 *
 * A URL base e a região padrão podem ser trocadas via .env
 * (FRIFAS_BASE_URL e FRIFAS_REGION).
 */

const BASE_URL = () => process.env.FRIFAS_BASE_URL || 'https://fluxggx.squareweb.app/send-like';
const KEY = () => process.env.FRIFAS_API_KEY;
const REGION = () => process.env.FRIFAS_REGION || 'BR';

/** Quantidade fixa de likes enviada em cada chamada (parâmetro "token"). */
const TOKEN = 220;

function isConfigured() {
  return Boolean(KEY());
}

/** Mensagens amigáveis para os códigos de erro documentados. */
const API_ERRORS = {
  UNAUTHORIZED: 'Chave de API inválida ou expirada.',
  MISSING_PARAMS: 'Faltaram parâmetros na chamada à API.',
  REGION_NOT_SUPPORTED: 'Região não suportada pela API.',
  PLAYER_NOT_FOUND: 'Jogador não encontrado. Confira o UID.',
};

/**
 * Envia 220 likes para um jogador do Free Fire.
 * @param {string} uid UID do jogador
 * @param {string} [region] Região da conta (padrão BR)
 * @returns {Promise<{ok:true, data:object} | {ok:false, error:string}>}
 */
async function sendLikes(uid, region = REGION()) {
  if (!isConfigured()) {
    return { ok: false, error: 'A chave da API (FRIFAS_API_KEY) não está configurada no bot.' };
  }

  const url =
    `${BASE_URL()}?key=${encodeURIComponent(KEY())}` +
    `&uid=${encodeURIComponent(uid)}` +
    `&region=${encodeURIComponent(region)}` +
    `&token=${TOKEN}`;

  try {
    const res = await fetch(url, { headers: { Accept: 'application/json' } });
    const body = await res.json().catch(() => null);

    if (!res.ok || !body || body.sucesso !== true) {
      const code = typeof body?.error === 'string' ? body.error : null;
      const msg =
        API_ERRORS[code] ||
        body?.mensagem ||
        `A API respondeu com erro (HTTP ${res.status}).`;
      return { ok: false, error: msg };
    }

    const entry = body.data || {};
    return {
      ok: true,
      data: {
        nome: entry.conta?.nome_conta ?? '—',
        id: entry.conta?.id_conta ?? uid,
        region: entry.conta?.region ?? region,
        antes: entry.likes?.antes ?? '—',
        enviadas: Number(entry.likes?.enviadas ?? 0),
        depois: entry.likes?.depois ?? '—',
      },
    };
  } catch (err) {
    logger.error('Erro ao chamar a API de likes:', err.message);
    return { ok: false, error: 'Não consegui falar com o servidor de likes. Tente novamente mais tarde.' };
  }
}

module.exports = { sendLikes, isConfigured, TOKEN };
