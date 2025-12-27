# Sushi Sync - Restaurant Simulation

A Japanese-style restaurant simulation and visualization tool.

## 🚀 Getting Started

### Prerequisites
- Node.js (v16+)
- Rust (latest stable)
- Tauri prerequisites (see [Tauri Docs](https://tauri.app/v1/guides/getting-started/prerequisites))

### Installation
```bash
npm install
```

### Running the Application
```bash
npm run tauri dev
# xvfb-run npm run tauri dev
```

---

## 📖 User Guide

### 1. Configure Seats (位置設定)
- Click the **"Seats"** button in the top-left header.
- Adjust the number of Single, 4-Person, and 6-Person tables.
- Set wheelchair accessibility and baby chair support.
- Click **"Apply"** to save.

### 2. Configure Customers (顧客設定)
- Click the **"Customers"** button.
- Add customers manually by setting arrival time, party size, and type.
- Or click **"Sample"** to load test data.
- Click **"Done"** when finished.

### 3. Run Simulation (開始模擬)
- Click the **Play (▶)** button in the top center.
- The simulation will calculate the schedule and begin playback.

### 4. Visualization (視覺化)
- **Timeline**: Drag the slider or use playback controls to move through time.
- **Map**: Watch customers arrive (Waiting Area) and get seated.
- **Details**:
  - Click a **Seat** to see its occupancy history.
  - Click a **Family** (in waiting area or on seat) to see their full timeline.
  - **Multi-select**: Hold `Ctrl` (or `Cmd`) to select multiple families/seats. Overlapping times will be highlighted.

### 5. Export (匯出)
- Click the **"Export"** button (top right or bottom right).
- Choose JSON, Text, or CSV format to save the simulation logs.

---

## 🛠️ Project Structure

- **Frontend**: Svelte 5 + Tailwind CSS (Japanese Theme)
- **Backend**: Rust (Tauri) for simulation logic
- **State Management**: Svelte Stores

### Key Components
- `RestaurantMap`: Visualizes the floor plan.
- `MasterTimeline`: Global time control.
- `SelectionTimeline`: Detailed view for selected entities.
- `LogTerminal`: Real-time event logs.
