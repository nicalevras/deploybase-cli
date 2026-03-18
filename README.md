# deploybase

Search and compare GPU and LLM pricing from your terminal. Data from [deploybase.ai](https://deploybase.ai).

![deploybase CLI](https://raw.githubusercontent.com/nicalevras/deploybase-cli/main/assets/hero.png)

## Install

```bash
npm install -g deploybase-cli
```

Or run it without installing:

```bash
npx deploybase-cli
```

Requires Node.js 18+.

## Quick start

```bash
# Start deploybase
deploybase

# Or run a command directly
deploybase gpu
deploybase llm
```

## GPU pricing

Browse GPU pricing and availability across cloud providers.

```
deploybase gpu
```

![GPU pricing table](https://raw.githubusercontent.com/nicalevras/deploybase-cli/main/assets/gpu.png)

### Filter by provider

```
deploybase gpu --provider lambda
deploybase gpu --provider google cloud
```

### Filter by GPU model

```
deploybase gpu --model h100
deploybase gpu --model a100
```

### Filter by type

```
deploybase gpu --type bare metal
deploybase gpu --type virtual machine
```

### Search

```
deploybase gpu --search 80gb sxm
```

### List providers and models

```
deploybase gpu providers
deploybase gpu models
```

## LLM pricing

Browse LLM pricing and availability across providers.

```
deploybase llm
```

![LLM pricing table](https://raw.githubusercontent.com/nicalevras/deploybase-cli/main/assets/llm.png)

### Filter by provider

```
deploybase llm --provider groq
deploybase llm --provider google ai studio
```

### Filter by author

```
deploybase llm --author anthropic
deploybase llm --author openai
```

### Filter by modality

```
deploybase llm --modality text
deploybase llm --modality file
deploybase llm --modality image
deploybase llm --modality audio
deploybase llm --modality video
deploybase llm --modality embeddings
```

### Search

```
deploybase llm --search claude
```

### List providers and authors

```
deploybase llm providers
deploybase llm authors
```

## All commands

| Command | What it does |
|---------|-------------|
| `gpu` | Show GPU pricing |
| `gpu providers` | List GPU providers |
| `gpu models` | List GPU models |
| `llm` | Show LLM pricing |
| `llm providers` | List LLM providers |
| `llm authors` | List LLM authors |
| `help` | Show help |
| `exit` | Quit |

## GPU flags

| Flag | What it does | Example |
|------|-------------|---------|
| `--provider` | Filter by provider | `--provider lambda` |
| `--model` | Filter by GPU | `--model h100` |
| `--type` | Filter by type | `--type virtual machine` |
| `--search` | Search | `--search 80gb` |

## LLM flags

| Flag | What it does | Example |
|------|-------------|---------|
| `--provider` | Filter by provider | `--provider groq` |
| `--author` | Filter by author | `--author anthropic` |
| `--modality` | Filter by modality | `--modality image` |
| `--search` | Search | `--search claude` |

## Data

All pricing data comes from [deploybase.ai](https://deploybase.ai) and is updated continuously.

## Contributing

```bash
git clone https://github.com/nicalevras/deploybase-cli.git
cd deploybase-cli
pnpm install
pnpm dev
```

Build for production:

```bash
pnpm build
node dist/index.mjs
```

## License

MIT
