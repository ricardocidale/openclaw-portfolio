# Project Rules

## API Key Security
- NEVER commit API keys or secrets to git. All secrets go in `.env.local` (which is gitignored).
- If a user shares an API key in chat, immediately warn them to rotate it.
- After placing a key in `.env.local`, always remind the user to revoke the old key if it was exposed.
- The Anthropic API key is stored in `.env.local` as `ANTHROPIC_API_KEY`.

## Environment Setup
- This project uses `.env.local` for all environment variables.
- Required keys: `ANTHROPIC_API_KEY` (set), `OPENAI_API_KEY` (not set), database credentials (`TURSO_DATABASE_URL`, `TURSO_AUTH_TOKEN`).
- Default AI provider is `anthropic`.

## Key Rotation Steps (for reference)
1. Go to the provider's console (e.g., console.anthropic.com/settings/keys)
2. Delete/revoke the compromised key
3. Create a new key
4. Update `.env.local` with the new key
