## Get started
```sh
pnpm i

# Edit .env file
cp .env.example .env
$EDITOR .env

# Also put secrets into Cloudflare
pnpm wrangler secret put DISCORD_TOKEN
pnpm wrangler secret put DISCORD_PUBLIC_KEY
pnpm wrangler secret put DISCORD_APPLICATION_ID

# Register slash command
# Requires node >=23.6.0, or ^22.18.0.
node src/register.ts

pnpm deploy
```

## Development
Run `wrangler dev` to development.
