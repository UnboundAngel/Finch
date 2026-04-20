# 🚀 Finch Startup Guide

Finch is a high-performance, glassmorphic AI chat client built with Tauri v2, React, and Rust.

---

## 🛠️ For Developers (Build from Source)

### 1. Prerequisites
- **Node.js**: v18+ (v20+ recommended)
- **Rust**: [Install via rustup](https://rustup.rs/) (Stable)
- **OS Specific Dependencies**:
  - **Linux**: `sudo apt install libwebkit2gtk-4.1-dev build-essential curl wget file libssl-dev libgtk-3-dev libayatana-appindicator3-dev librsvg2-dev` (Ubuntu/Debian)
  - **macOS**: Xcode Command Line Tools (`xcode-select --install`)
  - **Windows**: [WebView2 Runtime](https://developer.microsoft.com/en-us/microsoft-edge/webview2/) and C++ Build Tools.

### 2. Setup
```bash
# Clone the repository
git clone https://github.com/your-repo/Finch.git
cd Finch

# Install dependencies
npm install

# Setup Environment
cp .env.example .env
# Add your API keys (Anthropic, OpenAI, Gemini) to .env
```

### 3. Run Development Mode
```bash
npm run tauri dev
```

### 4. Build Production Binary
```bash
npm run tauri build
```
Binaries will be in `src-tauri/target/release/bundle/`.

---

## 📥 For Users (Installation)

### 🪟 Windows
1. Download `Finch_x64_en-US.msi` or `.exe` from the [Releases](https://github.com/your-repo/Finch/releases) page.
2. Run the installer.
3. If prompted by Windows SmartScreen, click "More info" -> "Run anyway".
4. Open Finch from your Start menu.

### 🐧 Linux
1. Download the `.AppImage` or `.deb` file.
2. **For AppImage**:
   - Right-click -> Properties -> Permissions -> "Allow executing file as program".
   - Double-click to run.
3. **For .deb**:
   ```bash
   sudo dpkg -i finch_amd64.deb
   ```

### 🍎 macOS
1. Download `Finch_x64.dmg` (or `aarch64.dmg` for Apple Silicon).
2. Open the `.dmg` and drag Finch to your **Applications** folder.
3. **Important**: Since Finch may not be notarized yet, right-click the app and select "Open" the first time to bypass the "unidentified developer" warning.

---

## ⚙️ Initial Configuration
Once Finch is running:
1. **API Keys**: Click the "Settings" icon to add your API keys for Anthropic, OpenAI, or Google.
2. **Local AI**: 
   - **Ollama**: Ensure Ollama is running (`ollama serve`). Finch will auto-detect local models.
   - **LM Studio**: Ensure the "Local Server" is started in LM Studio.
3. **Voice**: Go to settings to download the Whisper model for local voice transcription.
