
# Steamlist

A modern, accessible Next.js app to view and suggest Steam games from your library.

## Features
- **Game Suggestion:** Get a random suggestion from your Steam library based on playtime.
- **Game Library:** Browse your Steam games with icons, platform info, last played, and more.
- **Accessibility:** WCAG/508-friendly, keyboard navigation, and screen reader support.
- **Responsive UI:** Works on desktop and mobile.
- **Customizable:** Easily tweak layout, colors, and features.
 - **OS compatibility filter:** Toggle "Only show games that work on my OS" to prefer titles that support your current platform (Windows/Mac/Linux).

## Getting Started

### 1. Clone the repository
```sh
git clone https://github.com/zkm/steamlist.git
cd steamlist
```

### 2. Install dependencies
```sh
yarn install
```

### 3. Add your Steam API credentials
Create a `.env.local` file (gitignored) or copy `.env.example`:
```
STEAM_API_KEY=your_steam_api_key
STEAM_ID64=your_steam_id64
```
Notes:
- `.env.local` is not committed to git (see `.gitignore`).
- To find your SteamID64, visit your Steam profile in a browser and copy the 17-digit ID from the URL, or use any trusted SteamID lookup tool.
- Never share your API key publicly.

You can also use the built-in helper to resolve your SteamID64 from a variety of inputs:

Examples:

```sh
# From a vanity URL (requires STEAM_API_KEY in .env.local)
yarn steam:id https://steamcommunity.com/id/yourname

# From a profile URL
yarn steam:id https://steamcommunity.com/profiles/76561197960287930

# From legacy or ID3 formats
yarn steam:id STEAM_0:1:12345
yarn steam:id "[U:1:24690]"

# Write the result into .env.local as STEAM_ID64
yarn steam:id:write https://steamcommunity.com/id/yourname
```

### 4. Add your game data
- Automatically fetch your library into `public/steam_games.json`:
	```sh
	yarn steam:games
	```
	Requires `STEAM_API_KEY` and `STEAM_ID64` in `.env.local`.

- Or copy the sample data for a quick demo:
	```sh
	yarn steam:games:sample
	```

Troubleshooting:
- If you get an empty list, ensure your Steam privacy settings allow “Game details” to be Public.
- The generated `public/steam_games.json` is .gitignored.

### 5. Run the app
```sh
yarn dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

### OS compatibility filtering
On the Suggest page you can enable "Only show games that work on my OS". The app will:

- Detect your OS from the browser user agent (Windows, Mac, or Linux).
- Ask the API for a suggestion filtered to games that list support for that OS on Steam.
- If none are found in the least‑played pool, it falls back to a broader list so you still get a pick.

You can also call the endpoint directly and provide optional system specs for filtering (best-effort parsing from Steam requirements text):

```
GET /api/suggest-game?os=windows|mac|linux&ramGB=16&cores=8&cpuGHz=3.2&gpuVendor=nvidia&vramGB=6&storageGB=50
```
Notes:
- `ramGB`: Approximate system RAM in GB.
- `cores`: CPU core count.
- `cpuGHz`: Base or boost frequency to compare against textual requirements.
- `gpuVendor`: one of `nvidia|amd|intel` (used only when a single vendor is explicitly required by the game text).
- `vramGB`: Approximate GPU VRAM in GB.
- `storageGB`: Free disk space in GB.

Response includes flags like `{ filteredByOs: true, requirementsChecked: true }` when filters were applied. Parsing is best‑effort since Steam requirements are free‑form text; when nothing matches in the least‑played pool, the API falls back to provide a suggestion.

## Building for Production
```sh
yarn build
yarn start
```

## Environment Variables
- `STEAM_API_KEY`: Your Steam Web API key
- `STEAM_ID64`: Your SteamID64

## Accessibility & UX
- Keyboard and screen reader friendly
- Color contrast and focus states
- Responsive layout

## Contributing
Pull requests and issues are welcome!

## License
MIT
