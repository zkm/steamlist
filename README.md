
# Steamlist

A modern, accessible Next.js app to view and suggest Steam games from your library.

## Features
- **Game Suggestion:** Get a random suggestion from your Steam library based on playtime.
- **Game Library:** Browse your Steam games with icons, platform info, last played, and more.
- **Accessibility:** WCAG/508-friendly, keyboard navigation, and screen reader support.
- **Responsive UI:** Works on desktop and mobile.
- **Customizable:** Easily tweak layout, colors, and features.

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
Create a `.env` file:
```
STEAM_API_KEY=your_steam_api_key
STEAM_ID64=your_steam_id64
```

### 4. Add your game data
- Place your real `steam_games.json` in `public/` (this file is gitignored).
- Or use the provided `steam_games.sample.json` for testing/demo.

### 5. Run the app
```sh
yarn dev
```
Visit [http://localhost:3000](http://localhost:3000) in your browser.

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
