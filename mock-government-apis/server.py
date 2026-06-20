"""
Mock Government APIs — simulates Israel Ministry of Transport data systems.
  APC: Automatic Passenger Counting
  AFC: Automatic Fare Collection
"""

from datetime import datetime, timezone
from typing import Optional

import uvicorn
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Mock MOT APIs", version="1.0.0")
app.add_middleware(CORSMiddleware, allow_origins=["*"], allow_methods=["*"], allow_headers=["*"])

# In-memory bus state store: bus_id → state dict
bus_states: dict[str, dict] = {}


def now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


# ── APC endpoint ──────────────────────────────────────────────────────────────

@app.get("/api/v1/mot/apc")
def get_apc(bus_id: str):
    state = bus_states.get(bus_id, {})
    return {
        "bus_id": bus_id,
        "onboard_count": state.get("onboard_count", 0),
        "last_stop": state.get("last_stop", "Unknown"),
        "lat": state.get("lat"),
        "lon": state.get("lon"),
        "timestamp": now_iso(),
    }


# ── AFC endpoint ──────────────────────────────────────────────────────────────

@app.get("/api/v1/mot/afc")
def get_afc(bus_id: str):
    state = bus_states.get(bus_id, {})
    nfc = state.get("nfc_validations", 0)
    qr  = state.get("qr_validations", 0)
    return {
        "bus_id": bus_id,
        "validated_count": nfc + qr,
        "nfc_validations": nfc,
        "qr_validations": qr,
        "timestamp": now_iso(),
    }


# ── Bulk state (used by backend poller) ──────────────────────────────────────

@app.get("/api/v1/mot/all-states")
def get_all_states():
    """Returns full state for every known bus in one call."""
    result = {}
    for bus_id, state in bus_states.items():
        nfc = state.get("nfc_validations", 0)
        qr  = state.get("qr_validations", 0)
        result[bus_id] = {
            "onboard_count":   state.get("onboard_count", 0),
            "validated_count": nfc + qr,
            "nfc_validations": nfc,
            "qr_validations":  qr,
            "last_stop":       state.get("last_stop", "Unknown"),
            "lat":             state.get("lat"),
            "lon":             state.get("lon"),
        }
    return {"states": result, "timestamp": now_iso()}


# ── Update endpoint (used by simulator & manual form) ────────────────────────

class BusUpdate(BaseModel):
    bus_id: str
    onboard_count: Optional[int]  = None
    nfc_validations: Optional[int] = None
    qr_validations: Optional[int]  = None
    last_stop: Optional[str]       = None
    lat: Optional[float]           = None
    lon: Optional[float]           = None


@app.post("/api/v1/mot/update-bus")
def update_bus(update: BusUpdate):
    state = bus_states.setdefault(update.bus_id, {})
    if update.onboard_count   is not None: state["onboard_count"]   = update.onboard_count
    if update.nfc_validations is not None: state["nfc_validations"] = update.nfc_validations
    if update.qr_validations  is not None: state["qr_validations"]  = update.qr_validations
    if update.last_stop       is not None: state["last_stop"]        = update.last_stop
    if update.lat             is not None: state["lat"]              = update.lat
    if update.lon             is not None: state["lon"]              = update.lon
    return {"status": "ok", "bus_id": update.bus_id}


@app.get("/api/v1/mot/buses")
def list_buses():
    return {"buses": list(bus_states.keys()), "count": len(bus_states)}


@app.get("/health")
def health():
    return {"status": "ok", "buses": len(bus_states)}


if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=3001, reload=False)
