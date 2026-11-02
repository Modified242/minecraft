# MultiCraft - 3D Voxel Sandbox Edition

A high-performance, open-world 3D voxel sandbox game built with **Three.js** and an authoritative **WebSocket multiplayer engine**, reverse engineered and calibrated after **MultiCraft** (Minetest / Luanti engine).

Runs natively in any standard desktop or mobile web browser with zero client installation required.

---

## 🎮 Quick Start

The server is currently running live on your machine:
👉 **[http://localhost:8088](http://localhost:8088)**

To restart the server at any time from terminal:
```bash
cd /Users/soma/.gemini/antigravity-ide/scratch/voxel-sandbox
node server.js
```

---

## 🌐 How Anyone Can Join This Server

Anyone on any device (PC, Mac, iPhone, iPad, Android, Linux, or Chromebook) can join your game directly through their web browser. No download, plugin, or app is needed.

### Method 1: Friends on the Same Wi-Fi / Local Network (LAN) — Instant

Because the server is bound to all local interfaces on port `8088`, any device connected to the same home Wi-Fi can join instantly:

1. Your Mac's local network IP address is:
   ```text
   192.168.1.6
   ```
2. Have your friends or family open their web browser and visit:
   ```text
   http://192.168.1.6:8088
   ```
3. They will automatically load the world, spawn with their own avatar and nametag, and sync in real time.

*(Note: If your local IP address ever changes after reconnecting to Wi-Fi, run `ipconfig getifaddr en0` in Terminal to find your current IP).*

---

### Method 2: Friends Across the Internet (Different Locations & Homes)

To allow friends outside your home network to connect without opening router settings:

#### Option A: Cloudflare Quick Tunnel (Free, Recommended, No Account Needed)
If you have `cloudflared` installed (or install via `brew install cloudflared`), run in terminal:
```bash
cloudflared tunnel --url http://localhost:8088
```
Cloudflare will give you a temporary public HTTPS link, such as:
```text
https://brave-castle-1234.trycloudflare.com
```
Send this link to anyone in the world. Their browser will load the game and establish a secure WebSocket connection to your local server.

#### Option B: LocalTunnel (`npx` — Runs Instantly)
Run directly from terminal without installing packages:
```bash
npx localtunnel --port 8088
```
It outputs a public link like:
```text
https://funny-tiger-42.loca.lt
```
Share this link with your friends to join your world.

#### Option C: Router Port Forwarding
If you have administrative access to your home Wi-Fi router:
1. Log into your router admin panel (usually `192.168.1.1`).
2. Forward external TCP port `8088` to internal IP `192.168.1.6:8088`.
3. Check your public IP address (search *"what is my IP"* on Google).
4. Friends can join by navigating to:
   ```text
   http://<YOUR_PUBLIC_IP>:8088
   ```

---

## 🕹️ Controls Guide

| Action | Control | Description |
| :--- | :--- | :--- |
| **Look** | Mouse | First-person camera look (Pointer Lock API) |
| **Move** | <kbd>W</kbd> <kbd>A</kbd> <kbd>S</kbd> <kbd>D</kbd> | Walk forwards, backwards, left, right |
| **Jump** | <kbd>Space</kbd> | Jump on land (6.5 m/s), swim upwards in water |
| **Sneak** | <kbd>Shift</kbd> | Crouch (1.35 m/s) and edge-guard (prevents falling off cliffs) |
| **Sprint** | <kbd>Ctrl</kbd> | Sprint (7.2 m/s) with dynamic camera FOV zoom |
| **Fly Mode** | <kbd>F</kbd> | Toggle gravity and fly freely (20.0 m/s fast mode) |
| **Mine / Attack** | <kbd>Left-Click</kbd> (Hold) | Break blocks progressively with crack animations, or attack mobs/players |
| **Place / Interact** | <kbd>Right-Click</kbd> | Place block, open workstations (Crafting Table, Furnace, Chest), or eat food |
| **Inventory** | <kbd>E</kbd> | Open full inventory & 2x2 crafting screen |
| **Perspective** | <kbd>F5</kbd> | Cycle camera: First-Person ➔ Third-Person Back ➔ Third-Person Front |
| **Chat / Commands** | <kbd>T</kbd> or <kbd>/</kbd> | Open in-game chat and command console |
| **Select Slot** | <kbd>1</kbd> – <kbd>9</kbd> | Switch active item in hotbar |
| **Cycle Hotbar** | Scroll Wheel | Scroll through hotbar slots |
| **Debug Info** | <kbd>F3</kbd> | Toggle FPS, XYZ coordinates, physics, chunk stats, and facing direction |
| **Pause / Release** | <kbd>Esc</kbd> | Release mouse cursor and show pause menu |

---

## ⚙️ MultiCraft (Minetest Engine) Features & Calibration

### 1. Authentic Physics & Movement Calibration
Extracted directly from `/Applications/MultiCraft.app` binary parameters:
- **Gravity:** `movement_gravity = 9.81` m/s² (Earth gravity, providing a floaty, smooth jump arc rather than Minecraft's heavy 32.0 m/s²).
- **Jump Velocity:** `movement_speed_jump = 6.5` m/s.
- **Speeds:** Walking speed `4.0` m/s, sneaking speed `1.35` m/s, sprinting speed `7.2` m/s, and fast flight `20.0` m/s.
- **Liquid Physics:** Liquid sinking acceleration `10.0` m/s² with climbing/swimming speed `3.0` m/s.
- **Field of View:** Calibrated base `fov = 72` with dynamic sprint FOV expansion to `80`.

### 2. MultiCraft Signature Blocks & Items
- **Mese Ore & Mese Blocks:** Minetest's iconic crystalline mineral (`BLOCK.MESE_ORE` & `BLOCK.MESE_BLOCK`). Spawns deep underground with glowing yellow crystal flecks and warm illumination. Drops **Mese Crystals** used to craft legendary **Mese Pickaxes** and **Mese Swords** (durability 2048, speed multiplier 12.0).
- **Steel Tools & Armor:** In MultiCraft, iron is known as **Steel**. Tools and ingots carry authentic naming (*Steel Ingot, Steel Pickaxe, Steel Sword, Steel Axe, Steel Shovel, Steel Armor, Steel Block*).
- **Jungle Trees & Planks:** Spawns dark tropical Jungle Wood (`BLOCK.JUNGLE_WOOD`) and lush Jungle Leaves (`BLOCK.JUNGLE_LEAVES`) in forest biomes, craftable into rich reddish Jungle Planks.
- **Desert Sandstone:** Natural sandstone beds (`BLOCK.SANDSTONE` & `BLOCK.SANDSTONE_BRICK`) spawn under desert sand and can be crafted from sand blocks.
- **Papyrus Reeds:** Generates along riverbanks and shorelines (`BLOCK.PAPYRUS`), harvestable for Paper, Books, and Bookshelves (`BLOCK.BOOKSHELF`).

### 3. MultiCraft UI, Audio & Visual Assets
- **Typography:** Uses MultiCraft's native bitmap font `MultiCraftFont.ttf` across all HUD elements, hotbar toasts, inventory windows, and debug screens.
- **Tactile Audio Feedback:** UI clicks, hotbar slot changes, and crafting actions trigger MultiCraft's authentic `btn_press.ogg` sound.
- **Reticle Crosshair:** Features MultiCraft's signature circular targeting ring (`cursor.png`).
- **HUD Statbars:** Renders MultiCraft's authentic pixel red hearts (`heart.png` / `heart_gone.png`) and oxygen bubbles (`bubble.png`).
- **Green Beveled Buttons:** Menus and recipe buttons use MultiCraft's green beveled styling (`gui_button_green.png`).

---

## 🏗️ Architecture & Multiplayer Synchronization

- **Client-Side Rendering:** Three.js r128 with custom procedural 16x16 pixel-art texture atlas generator (`js/textures.js`), WebGL chunk geometry buffers, and smooth vertex ambient occlusion.
- **Offloaded Chunk Meshing:** Dedicated Web Worker (`js/chunk-worker.js`) running multi-octave 3D Simplex noise terrain, cave generation, and dual-channel flood-fill lighting without blocking the main render loop.
- **Authoritative Server (`server.js`):** Runs a 20 TPS tick loop managing player coordinates, mob AI, PvP/PvE damage calculations, dropped item physics, and disk persistence (`world-save.json`).
- **In-Game Commands:**
  - `/gamemode creative` or `/gamemode survival` — Switch game modes
  - `/time set day` or `/time set night` — Change world time
  - `/weather clear` or `/weather rain` — Toggle storm and rain effects
  - `/help` — List available commands
