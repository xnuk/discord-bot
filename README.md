## Get started
```sh
pnpm i

# Edit .env file
cp .env.example .env
$EDITOR .env

# Register slash command
# Requires node >=23.6.0, or ^22.18.0.
node src/register.ts

pnpm run deploy --secrets-file .env
```

## Development
Run `wrangler dev` to development.
