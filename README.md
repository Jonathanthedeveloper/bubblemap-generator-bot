# Bubblemap Generator Bot

A Telegram bot providing comprehensive token analysis with visual bubble maps, multi-chain security checks, risk reports, and holder analytics.

✨ Features
-🗺️ Visual Bubble Maps: Generate interactive visualizations of token holder distributions
-🔗 Multi-Chain Support: Analyze tokens across Ethereum, BSC, Solana, Polygon, Avalanche, and more
-🛡️ Security Analysis: Detect honeypots, hidden mints, and malicious contracts
-🔍 Risk Reports: Get detailed security assessments with clear risk indicators
-👥 Holder Analysis: View and track top token holders with percentage breakdowns
-⭐ Watchlist: Save and monitor your favorite tokens
-📊 Market Data: View liquidity, supply, and other key metrics

## 📋 Prerequisites

Node.js (v16 or higher)
MySQL database
Telegram Bot token (obtained from @BotFather)

## 🚀 Installation

1 Clone the repository:

```bash
git clone https://github.com/Jonathanthedeveloper/bubblemap-generator-bot.git

cd bubblemap-generator-bot
```

2 Install dependencies

```bash
npm install
```

3 Configure environment variables:

```bash
TELEGRAM_BOT_TOKEN="your_telegram_bot_token"
DB_DATABASE="bubblemap"
DB_PASSWORD="your_db_password"
DB_USER="your_db_username" 
DB_HOST="localhost"
```

4 Build and run the bot:

```bash
npm run build
```

## 💬 Usage

- `/start` - Begin interaction with bot
- `/map [chain] [address]` - Generate a bubble map for the specified token address
- `/watchlist` - View Saved tokens
- `/set_default_chain [chain]` - Set default chain to use
- `/help` - Show help message with available commands

### Supported Chains

- `eth` - Ethereum
- `bsc` - Binance Smart Chain
- `sol` - Solana
- `poly` - Polygon
- `avax` - Avalanche
- `arbi` - Arbitrum
- `base` - Base
- `ftm` - Fantom
- `cro` - Cronos
- `sonic` - Sonic

### Examples

```txt
/map eth 0xc944e90c64b2c07662a292be6244bdf05cda44a7

/map sol G63cwb95F2Bq34jFwwyUpYqLb5YCMF9XgJ4gJVJTpump
```

> you can also send just the token address to check it

### Integrations
The bot integrates with multiple APIs:

- BubbleMap API: For generating holder distribution maps
- GoPlus Security API: For token security analysis
- CoinGecko API: For token market data
