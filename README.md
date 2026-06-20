# Fare Evasion SaaS MVP

Real-time transit fare evasion detection via Cloud-to-Cloud API integration.

## Architecture

```
Mock Gov APIs (FastAPI :3001)
       ↑ POST updates          ↑ GET all-states (poll)
Fleet Simulator (Python)    Backend (Node.js :8080)
                                    ↓ WebSocket
                              Frontend (React :5173)
```

## Quick Start — 4 terminals

### Terminal 1 — Mock Government APIs
```bash
cd mock-government-apis
pip install -r requirements.txt
python server.py
```

### Terminal 2 — Backend
```bash
cd backend
npm install
npm run dev
```

### Terminal 3 — Fleet Simulator
```bash
cd simulator
pip install -r requirements.txt
python fleet_generator.py
```

### Terminal 4 — Frontend
```bash
cd frontend
npm install
npm run dev
# open http://localhost:5173
```

## Testing Manual Bus Injection

1. Open `http://localhost:5173`
2. Click **➕ Manual Inject** tab in the sidebar
3. Fill in:
   - **Bus ID**: `line_189_holon`
   - **Station**: `Holon Central`
   - **Onboard**: `15`
   - **Validated**: `7`
4. Click **📍 Pick on map** → click anywhere on the Gush Dan map
5. Click **🚌 Inject Bus**
6. The bus appears immediately on the map — RED (8 evaders ≥ 3) with a yellow border
7. The alert feed updates in real time

## Evasion Formula

```
evaders = onboard_count (APC) − validated_count (AFC)
alert   = evaders ≥ 3
```

## API Reference

| Service | Endpoint | Description |
|---------|----------|-------------|
| Mock API | `GET /api/v1/mot/apc?bus_id=X` | Passenger count |
| Mock API | `GET /api/v1/mot/afc?bus_id=X` | Validated tickets |
| Mock API | `GET /api/v1/mot/all-states` | All buses bulk |
| Mock API | `POST /api/v1/mot/update-bus` | Update bus state |
| Backend  | `POST /api/v1/buses/manual-inject` | Manual inject |
| Backend  | `GET /health` | Health check |
| Backend  | `ws://localhost:8080` | Live WebSocket |
