# 🤖 GGX — Bot Profissional de Moderação para Discord

Bot completo de moderação e administração, feito em **Node.js + discord.js v14**.
Configura o servidor automaticamente e protege contra links, spam e conteúdo
pornográfico (NSFW).

---

## ✨ Recursos

| Recurso | Descrição |
|---|---|
| **/painel** | Posta um painel de comandos por **botão e formulário (modal)** — clique em vez de digitar. |
| **/setup** | Cria cargos, categorias e canais organizados automaticamente (somente dono). |
| **Anti-Link** | Detecta e remove links não permitidos, com whitelist de domínios e cargos. |
| **Anti-Spam** | Bloqueia flood (muitas mensagens) e mensagens repetidas. |
| **Anti-NSFW** | Bloqueia pornografia em **texto, links, figurinhas, imagens e vídeos**. |
| **Sistema de avisos** | Acumula avisos e pune automaticamente ao atingir o limite. |
| **/marcar** | Marca todo mundo (@everyone / @here) com uma mensagem. |
| **/like** | Envia likes diários para um jogador do Free Fire (Frifas Likes API). |
| **Canal só de likes** | O `/setup` cria um canal onde ninguém conversa — só o `/like` funciona. |
| **Música** | Toca músicas do YouTube na call: `/tocar`, `/pular`, `/pausar`, `/retomar`, `/fila`, `/parar`. |
| **/config** | Liga/desliga e ajusta cada sistema, direto pelo Discord. |
| **Logs** | Toda punição é registrada em um canal de logs. |

---

## 🎛️ Painel de comandos (botão e modal)

Rode **`/painel`** (staff, permissão *Gerenciar Servidor*) para postar um painel
fixo no canal. A partir dele, qualquer membro usa o bot **clicando em botões**:

- **Sem digitar nada:** Pular, Pausar, Retomar, Parar, Fila, Ping e Ajuda.
- **Com formulário (modal):** Tocar (música), Like (UID), Marcar (mensagem) e
  Avisos (adicionar / ver / limpar) — o Discord abre uma janelinha para preencher.
- **Protegido:** os botões de moderação e administração checam a permissão de
  quem clicou, igual aos slash commands.

Os botões reaproveitam exatamente a mesma lógica dos comandos `/`, então tudo
continua funcionando pelos dois caminhos.

---

## 🚀 Instalação

> 📘 **Passo a passo completo e detalhado** (como pegar token, CLIENT_ID,
> OWNER_ID, ligar os intents e convidar o bot): veja **[GUIA-DE-INSTALACAO.md](GUIA-DE-INSTALACAO.md)**.

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

## ☁️ Hospedar na Square Cloud

O projeto já vem com o arquivo **`squarecloud.app`** configurado:

```
DISPLAY_NAME=GGX
MAIN=src/index.js
MEMORY=512
VERSION=recommended
AUTORESTART=true
```

Passos:
1. Gere o `.zip` do projeto **sem** a pasta `node_modules` (a Square instala as deps).
2. Suba na Square Cloud (site ou app).
3. **Variáveis de ambiente (token e chaves):** por segurança, cadastre em
   **Configurações → Variáveis de Ambiente** no painel da Square
   (`DISCORD_TOKEN`, `CLIENT_ID`, `OWNER_ID`, `FRIFAS_API_KEY`).
   *Alternativa:* incluir o arquivo `.env` dentro do `.zip` do upload.
4. Pronto — ao ligar, o bot **registra os slash commands sozinho** (não
   precisa rodar `npm run deploy` na Square).

> O `.env` é ignorado pelo git de propósito, então ele **não** vai junto se
> você hospedar via GitHub — nesse caso use as Variáveis de Ambiente do painel.

---

## 🎵 Música na call

O GGX toca músicas do YouTube no canal de voz:

```
/tocar musica:<nome ou link>   → entra na sua call e toca (ou coloca na fila)
/pular                         → pula a atual
/pausar   /retomar             → pausa e retoma
/fila                          → mostra a fila
/parar                         → para tudo e sai da call
```

Ao tocar, aparece um **PAINEL DE MÚSICA** com botões clicáveis:
🔉 Down · ⏮️ Back · ⏸️ Pause · ⏭️ Skip · 🔊 Up · 🔀 Shuffle · 🔁 Loop ·
⏹️ Stop · 📻 AutoPlay · 🎵 Playlist. O volume usa `@discordjs/opus` (já
instalado), sem precisar de ffmpeg.

**Regras da música:**
- Só toca se você estiver em uma **call de música** (canal de voz cujo nome
  contém `music`/`musica`, ex.: 🎵 Music 1). Ajustável em `config.js` → `music`.
- **Uma call por vez:** se o bot já está tocando em uma call, pedidos de
  **outra** call são recusados até ele ficar livre.

O áudio do YouTube é entregue já em **opus** pela biblioteca `play-dl`, então
**não é obrigatório ter ffmpeg**. Para tocar outras fontes (arquivos, links
diretos), instale o ffmpeg no sistema (`apt install ffmpeg`).

> Requer o intent **Guild Voice States** (já ativado no código) e as permissões
> **Conectar** e **Falar** no canal de voz.

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
│   ├── commands/              # setup, config, marcar, like, avisos, ping, ajuda,
│   │                          #   tocar, pular, pausar, retomar, fila, parar
│   ├── events/                # ready, interactionCreate, messageCreate, guildCreate
│   ├── handlers/              # carregadores de comandos e eventos
│   ├── moderation/            # antiLink, antiSpam, antiNsfw, modActions, visionApi
│   ├── music/                 # GuildPlayer, manager (música na call)
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
