# 🤖 GGX — Bot Profissional de Moderação para Discord

Bot completo de moderação e administração, feito em **Node.js + discord.js v14**.
Configura o servidor automaticamente e protege contra links, spam e conteúdo
pornográfico (NSFW).

---

## ✨ Recursos

| Recurso | Descrição |
|---|---|
| **/setup** | Cria cargos, categorias e canais organizados automaticamente (somente dono). |
| **Anti-Link** | Detecta e remove links não permitidos, com whitelist de domínios e cargos. |
| **Anti-Spam** | Bloqueia flood (muitas mensagens) e mensagens repetidas. |
| **Anti-NSFW** | Bloqueia pornografia em **texto, links, figurinhas, imagens e vídeos**. |
| **Sistema de avisos** | Acumula avisos e pune automaticamente ao atingir o limite. |
| **/marcar** | Marca todo mundo (@everyone / @here) com uma mensagem. |
| **/like** | Envia likes diários para um jogador do Free Fire (Frifas Likes API). |
| **/config** | Liga/desliga e ajusta cada sistema, direto pelo Discord. |
| **Logs** | Toda punição é registrada em um canal de logs. |

---

## 🚀 Instalação

### 1. Pré-requisitos
- [Node.js](https://nodejs.org) **18 ou superior**
- Uma aplicação/bot no [Discord Developer Portal](https://discord.com/developers/applications)

### 2. Criar o bot no Discord
1. Acesse o **Developer Portal** → **New Application** → dê o nome **GGX**.
2. Aba **Bot** → **Reset Token** → copie o token.
3. Ative os **Privileged Gateway Intents**:
   - ✅ **Server Members Intent**
   - ✅ **Message Content Intent**
4. Aba **OAuth2 → URL Generator**:
   - Scopes: `bot`, `applications.commands`
   - Bot Permissions: `Administrator` (ou pelo menos Kick, Ban, Moderate Members, Manage Messages, Manage Channels, Manage Roles).
   - Abra a URL gerada e convide o bot para o seu servidor.

### 3. Configurar o projeto
```bash
# instalar dependências
npm install

# copiar e preencher as variáveis de ambiente
cp .env.example .env
# edite o .env com DISCORD_TOKEN, CLIENT_ID e OWNER_ID
```

### 4. Registrar os comandos
```bash
npm run deploy
```
> Dica: defina `GUILD_ID` no `.env` para os comandos aparecerem na hora durante os testes.

### 5. Ligar o bot
```bash
npm start
```

---

## 🛡️ Anti-NSFW — como funciona

O GGX bloqueia conteúdo adulto em camadas:

1. **Texto** → filtro de palavras-chave proibidas (`src/moderation/nsfwData.js`).
2. **Links** → lista de domínios adultos conhecidos.
3. **Figurinhas (stickers)** → análise do nome da figurinha.
4. **Imagens / Vídeos / GIFs** → bloqueio de mídia fora de canais NSFW **e/ou**
   análise **real do conteúdo** via API de visão computacional.

### Detecção real de imagem e vídeo (opcional)
Para "ler" o conteúdo de imagens e vídeos, o bot integra com a
**[Sightengine](https://sightengine.com)**. Basta preencher no `.env`:
```
SIGHTENGINE_API_USER=seu_user
SIGHTENGINE_API_SECRET=seu_secret
```
Sem essas chaves, o bot continua funcionando apenas com o filtro heurístico
(texto, links, nomes de figurinha e bloqueio de mídia em canais não-NSFW).

---

## 👍 Comando /like — Likes no Free Fire

O `/like id:<UID>` envia likes para um jogador do Free Fire usando a
**Frifas Likes API** ([repositório de referência](https://github.com/HubsGGx/Daily-Likes-FreeFire)).

Configure a chave no `.env`:
```
FRIFAS_API_KEY=sua_chave
```
O bot responde com o nome da conta, região e a contagem de likes
(antes / enviados / depois). Há um cooldown de 60s por UID para não
sobrecarregar a API, e os likes diários são limitados pelo próprio serviço.

---

## ⚙️ Ajustes rápidos (no Discord)

```
/config ver                      → mostra tudo
/config sistema antiLink false   → desliga o anti-link
/config acao antiNsfw kick       → NSFW passa a expulsar
```

Ajustes mais finos (limites de spam, whitelist de domínios, etc.) ficam em
`config.js`.

---

## 📁 Estrutura do projeto

```
├── config.js                  # configuração padrão
├── src/
│   ├── index.js               # ponto de entrada
│   ├── deploy-commands.js     # registra os slash commands
│   ├── commands/              # /setup, /config, /marcar, /like, /avisos, /ping, /ajuda
│   ├── events/                # ready, interactionCreate, messageCreate, guildCreate
│   ├── handlers/              # carregadores de comandos e eventos
│   ├── moderation/            # antiLink, antiSpam, antiNsfw, modActions, visionApi
│   ├── services/              # frifas (API de likes do Free Fire)
│   └── utils/                 # logger, store, embeds
```

---

## 🔒 Segurança

- **Nunca** suba o seu `.env` / token para o GitHub (já está no `.gitignore`).
- O bot ignora administradores e o dono nas punições automáticas.
- O bot nunca pune alguém acima dele na hierarquia de cargos.

---

Feito com ❤️ para a comunidade **GGX**.
