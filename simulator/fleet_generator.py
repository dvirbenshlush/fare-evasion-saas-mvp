"""
Fleet Generator — simulates 1,000 Gush Dan buses pushing telemetry
to the Mock Government APIs (APC + AFC) in real time.
Maintains a realistic 15-20% fare evasion rate across the fleet.
"""

import random
import threading
import time

import requests

MOT_API       = "http://localhost:3001"
NUM_BUSES     = 1000
TICK_MIN      = 5
TICK_MAX      = 10
SESSION       = requests.Session()

AREAS = [
    {"name": "Tel Aviv",    "lat": (32.04, 32.10), "lon": (34.76, 34.82)},
    {"name": "Jaffa",       "lat": (32.02, 32.06), "lon": (34.755, 34.78)},
    {"name": "Ramat Gan",   "lat": (32.07, 32.11), "lon": (34.80, 34.85)},
    {"name": "Holon",       "lat": (31.97, 32.02), "lon": (34.76, 34.80)},
    {"name": "Petah Tikva", "lat": (32.08, 32.12), "lon": (34.86, 34.93)},
    {"name": "Bat Yam",     "lat": (32.00, 32.03), "lon": (34.748, 34.77)},
    {"name": "Givatayim",   "lat": (32.06, 32.08), "lon": (34.80, 34.83)},
]

# Hard bounding box — keeps buses on land (Mediterranean coast is ~34.748 at Bat Yam)
LAT_MIN, LAT_MAX = 31.96, 32.13
LON_MIN, LON_MAX = 34.748, 34.93

STOPS = [
    "Central Bus Station", "City Hall", "University Gate", "Carmel Market",
    "Dizengoff Center", "Ayalon Mall", "Ichilov Hospital", "HaShalom Station",
    "Savidor Center", "Ben Gurion Airport Link", "Reading", "Herzliya Junction",
]


class Bus:
    def __init__(self, bus_id: str):
        self.bus_id       = bus_id
        area              = random.choice(AREAS)
        self.lat          = random.uniform(*area["lat"])
        self.lon          = random.uniform(*area["lon"])
        self.onboard      = random.randint(5, 30)
        self.evasion_rate = random.uniform(0.15, 0.20)
        validated         = round(self.onboard * (1 - self.evasion_rate))
        self.nfc = round(validated * random.uniform(0.55, 0.75))
        self.qr  = validated - self.nfc

    @property
    def validated(self) -> int:
        return self.nfc + self.qr

    def tick(self) -> None:
        alighters    = random.randint(0, min(5, self.onboard))
        boarders     = random.randint(0, 8)
        self.onboard = max(0, self.onboard - alighters + boarders)

        # Snapshot: validated = current onboard × (1 - evasion_rate)
        # This keeps evaders stable regardless of how long the sim has been running
        validated = round(self.onboard * (1 - self.evasion_rate))
        self.nfc  = round(validated * 0.65)
        self.qr   = validated - self.nfc

        # Simulate GPS movement — clamped to Gush Dan bounding box
        self.lat = round(max(LAT_MIN, min(LAT_MAX, self.lat + random.uniform(-0.0015, 0.0015))), 6)
        self.lon = round(max(LON_MIN, min(LON_MAX, self.lon + random.uniform(-0.0015, 0.0015))), 6)

    def push(self) -> None:
        try:
            SESSION.post(
                f"{MOT_API}/api/v1/mot/update-bus",
                json={
                    "bus_id":          self.bus_id,
                    "onboard_count":   self.onboard,
                    "nfc_validations": self.nfc,
                    "qr_validations":  self.qr,
                    "last_stop":       random.choice(STOPS),
                    "lat":             self.lat,
                    "lon":             self.lon,
                },
                timeout=3,
            )
        except Exception:
            pass


def run_bus(bus: Bus) -> None:
    bus.push()
    while True:
        time.sleep(random.uniform(TICK_MIN, TICK_MAX))
        bus.tick()
        bus.push()


def main() -> None:
    print(f"[simulator] waiting for Mock API at {MOT_API}...")
    for _ in range(10):
        try:
            SESSION.get(f"{MOT_API}/health", timeout=2)
            break
        except Exception:
            time.sleep(1)
    else:
        print("[simulator] ❌ Mock API not reachable — start mock-government-apis first")
        return

    buses = [Bus(f"bus_{i:04d}") for i in range(1, NUM_BUSES + 1)]
    print(f"[simulator] ✅ launching {NUM_BUSES} buses")

    threads = [
        threading.Thread(target=run_bus, args=(bus,), daemon=True)
        for bus in buses
    ]
    for t in threads:
        t.start()

    try:
        while True:
            time.sleep(30)
            active = len(SESSION.get(f"{MOT_API}/api/v1/mot/buses").json()["buses"])
            print(f"[simulator] {active} buses active in MOT API")
    except KeyboardInterrupt:
        print("[simulator] shutting down")


if __name__ == "__main__":
    main()
