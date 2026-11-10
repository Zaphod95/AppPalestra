"""Crea palestra-esempio.json: un backup finto da caricare con "Ripristina da file".

Uso: python esempio/genera_esempio.py
"""
import json
import random
import re
from datetime import datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
random.seed(7)

catalog = [
    {"id": f"c-{i}", "name": n, "muscle": m, "muscle2": m2, "pose": p, "bw": float(bw or 0), "builtin": True}
    for i, n, m, p, bw, m2 in re.findall(r"row\('([^']+)', '([^']+)', '([^']+)', '([^']+)'(?:, ([\d.]+))?(?:, '([^']*)')?\)", (ROOT / "js/catalog.js").read_text(encoding="utf-8"))
]
by_id = {e["id"]: e for e in catalog}

# esercizio, serie, ripetizioni obiettivo, carico iniziale, aumento, corpo libero
DAYS = [
    ("d-a", "Giorno A · Petto e tricipiti", [
        ("c-panca-piana", 4, 8, 60, 2.5), ("c-panca-inclinata", 3, 10, 20, 2), ("c-croci", 3, 12, 12, 1),
        ("c-pushdown", 3, 12, 25, 2.5), ("c-dip", 3, 10, 0, 0),
    ]),
    ("d-b", "Giorno B · Schiena e bicipiti", [
        ("c-lat-machine", 4, 10, 50, 2.5), ("c-rematore", 4, 8, 50, 2.5), ("c-pulley", 3, 12, 45, 2.5),
        ("c-curl-bilanciere", 3, 10, 25, 2.5), ("c-trazioni", 3, 6, 0, 0),
    ]),
    ("d-c", "Giorno C · Gambe e spalle", [
        ("c-squat", 4, 6, 70, 5), ("c-leg-press", 3, 10, 120, 10), ("c-leg-curl", 3, 12, 35, 2.5),
        ("c-lento-avanti", 3, 8, 35, 2.5), ("c-alzate-laterali", 3, 15, 8, 1), ("c-calf", 3, 15, 40, 5),
    ]),
]

plan = {
    "id": "p-esempio", "name": "Forza 3 giorni", "createdAt": int(datetime(2026, 9, 13, 18).timestamp() * 1000),
    "days": [
        {"id": did, "name": dname, "exercises": [
            {"exerciseId": ex, "sets": [{"kg": kg or None, "reps": reps} for _ in range(n)]}
            for ex, n, reps, kg, _ in exs
        ]}
        for did, dname, exs in DAYS
    ],
}

NOTES = ["Ultima serie dura", "Buona tecnica", "Spalla un po' rigida", "Aumentare la prossima volta", "Poco recupero oggi"]
ms = lambda d: int(d.timestamp() * 1000)

workouts = []
load = {ex: kg for _, _, exs in DAYS for ex, _, _, kg, _ in exs}
load.update({"c-hip-thrust": 60, "c-curl-martello": 12})
bw_reps = {ex: reps - 2 for _, _, exs in DAYS for ex, _, reps, kg, _ in exs if not kg}
last = {}
day = datetime(2026, 9, 14)
end = datetime(2026, 11, 9)
cycle = 0
while day <= end:
    if day.weekday() in (0, 2, 4) and random.random() > 0.12:
        did, dname, exs = DAYS[cycle % 3]
        cycle += 1
        t = day.replace(hour=18, minute=random.randint(0, 40))
        start = t
        entries = []
        extra = []
        if did == "d-c" and day < datetime(2026, 10, 1):
            extra = [("c-hip-thrust", 3, 10, 60, 5)]
        if did == "d-b" and datetime(2026, 10, 5) <= day < datetime(2026, 10, 27):
            extra = [("c-curl-martello", 3, 12, 12, 1)]
        for ex, n, reps, kg0, step in exs + extra:
            t += timedelta(minutes=random.randint(2, 4))
            sets = []
            for i in range(n):
                if i == n - 1 and random.random() < 0.06:
                    break
                if kg0:
                    kg = load[ex]
                    r = max(reps - 3, reps - (1 if i >= n - 1 else 0) - random.choice([0, 0, 0, 1]))
                else:
                    kg, r = 0, max(1, bw_reps[ex] - (i // 2) + random.choice([0, 0, 1]))
                sets.append({"kg": kg, "reps": r, "done": True, "doneAt": ms(t)})
                t += timedelta(seconds=random.randint(80, 150))
            if kg0 and random.random() < 0.5:
                load[ex] = round(load[ex] + step, 1)
            elif not kg0 and random.random() < 0.35:
                bw_reps[ex] += 1
            entries.append({
                "exerciseId": ex, "name": by_id[ex]["name"], "muscle": by_id[ex]["muscle"], "muscle2": by_id[ex]["muscle2"], "bw": by_id[ex]["bw"],
                "base": [{"kg": kg0 or None, "reps": reps} for _ in range(n)], "last": last.get(ex),
                "plannedSets": n, "sets": sets, "note": random.choice(NOTES) if random.random() < 0.1 else "",
            })
            last[ex] = [{"kg": s["kg"], "reps": s["reps"]} for s in sets]
        workouts.append({
            "id": f"w-{day:%Y%m%d}", "planId": plan["id"], "dayId": did, "planName": plan["name"], "dayName": dname,
            "startedAt": ms(start), "endedAt": ms(t + timedelta(minutes=3)), "exercises": entries,
        })
    day += timedelta(days=1)

# Una pesata a settimana, in lieve calo.
body = []
kg_body = 79.4
d = datetime(2026, 9, 14, 8)
while d <= end:
    body.append({"id": f"b-{d:%Y%m%d}", "t": ms(d), "kg": round(kg_body, 1)})
    kg_body += random.uniform(-0.6, 0.2)
    d += timedelta(days=7)

out = ROOT / "esempio/palestra-esempio.json"
out.write_text(json.dumps({
    "app": "AppPalestra", "version": 2, "exportedAt": datetime.now().isoformat(),
    "exercises": catalog, "plans": [plan], "workouts": workouts, "body": body, "settings": {"prefill": "last"},
}, ensure_ascii=False), encoding="utf-8")
print(f"{len(workouts)} allenamenti, {len(body)} pesate, {len(catalog)} esercizi -> {out}")
