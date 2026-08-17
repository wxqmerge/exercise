import base64
import json
import re
import subprocess
from pathlib import Path

import numpy as np
from PIL import Image

REPO = Path(__file__).resolve().parent.parent
IMAGES = REPO / "data" / "images"
OUT_DIR = REPO / "exercise"
MAX_DIM = 512
WHITE_T = 245
MAX_FRAMES = 12

BASE_CSS = [
    "*{box-sizing:border-box}body{margin:0;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;background:#f6f7f9;color:#1c2430;line-height:1.5}",
    "header{background:#fff;border-bottom:1px solid #e3e7ec;padding:20px 16px 16px;max-width:720px;margin:0 auto}",
    "header h1{margin:0 0 6px;font-size:1.4rem}header p{margin:0;color:#5a6675;font-size:.92rem}",
    "main{max-width:720px;margin:0 auto;padding:8px 16px 48px}",
    "section{margin-top:28px}h2{font-size:1.15rem;margin:0 0 12px;padding:8px 12px;background:#1c2430;color:#fff;border-radius:10px}",
    "article{background:#fff;border:1px solid #e3e7ec;border-radius:12px;overflow:hidden;margin-bottom:14px}",
    "article img{display:block;width:100%;max-height:340px;object-fit:contain;background:#fff}",
    ".body{padding:12px 14px 14px}h3{margin:0 0 6px;font-size:1.02rem;display:flex;justify-content:space-between;align-items:baseline}p{margin:0;color:#45505f;font-size:.93rem}",
    ".noimg{display:flex;align-items:center;justify-content:center;height:160px;color:#9aa5b1;font-size:.95rem;background:#fafbfc}",
    ".log{font-size:.92rem;font-weight:500;color:#5a6675;letter-spacing:.03em}",
    ".log:empty{display:none}",
]


def read_env() -> dict:
    env = {}
    p = REPO / "server" / ".env"
    if p.exists():
        for line in p.read_text().splitlines():
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                env[k.strip()] = v.strip().strip('"').strip("'")
    return env


ENV = read_env()
_DOMAIN = ENV.get("DOMAIN", "localhost")
_PORT = ENV.get("PORT", "3000")
API_BASE = f"http://{_DOMAIN}:{_PORT}/api" if _DOMAIN in ("localhost", "127.0.0.1") else f"https://{_DOMAIN}/api"
APP_KEY = ENV.get("APP_KEY", "")

LOG_JS = (
    "<script>"
    "(function(){"
    "var API = " + json.dumps(API_BASE) + ";"
    "var KEY = " + json.dumps(APP_KEY) + ";"
    "var pick = function (arr) {"
    "var v = '';"
    "(arr || []).forEach(function (x) { var s = String(x); if (s) v = s; });"
    "return v;"
    "};"
    "function render(entries) {"
    "document.querySelectorAll('.log').forEach(function (el) {"
    "var type = entries[el.getAttribute('data-type')];"
    "var day = type && type[el.getAttribute('data-day')];"
    "var ex = day && day[el.getAttribute('data-ex')];"
    "if (!ex) return;"
    "var parts = [];"
    "var r = pick(ex.reps);"
    "var w = pick(ex.weights);"
    "if (r) parts.push(r + '-reps');"
    "if (w) parts.push(w + '-lbs');"
    "if (parts.length) el.textContent = parts.join(' ');"
    "});"
    "}"
    "var req = { headers: {} };"
    "if (KEY) req.headers['X-App-Key'] = KEY;"
    "fetch(API + '/entries', req)"
    ".then(function (res) { if (!res.ok) { throw new Error('http ' + res.status); } return res.json(); })"
    ".then(render)"
    ".catch(function () {"
    "var local = {};"
    "try { local = JSON.parse(localStorage.getItem('exercise-entries') || '{}'); } catch (e) { local = {}; }"
    "render(local);"
    "});"
    "})();"
    "</script>"
)


def load_programs():
    code = (
        "import { pathToFileURL } from 'node:url';"
        "const m = await import(pathToFileURL(process.argv[1]).href);"
        "console.log(JSON.stringify(m.PROGRAMS));"
    )
    res = subprocess.run(
        ["node", "--input-type=module", "-e", code, str(REPO / "src" / "data" / "exercises.local.js")],
        capture_output=True, text=True, cwd=REPO,
    )
    if res.returncode != 0:
        raise SystemExit(f"node failed:\n{res.stderr}")
    return json.loads(res.stdout)


def days_from_program(program):
    return [(f"Day {k}", [(e["id"], e["name"], e["description"]) for e in program["NUMBERED_WORKOUTS"][k]])
            for k in sorted(program["NUMBERED_WORKOUTS"], key=lambda x: int(x))]


PROGRAMS = load_programs()

ROUTINES = [
    {
        "slug": "dumbbells",
        "title": PROGRAMS["dumbbells"]["name"],
        "note": "Do each exercise once to find your working weight and reps, then repeat the same loads each session.",
        "days": days_from_program(PROGRAMS["dumbbells"]),
    },
    {
        "slug": "hotel",
        "title": PROGRAMS["hotel"]["name"],
        "note": "",
        "days": days_from_program(PROGRAMS["hotel"]),
    },
]


def to_rgb(img: Image.Image) -> Image.Image:
    if img.mode in ("P", "RGBA", "LA"):
        img = img.convert("RGBA")
        bg = Image.new("RGBA", img.size, (255, 255, 255, 255))
        img = Image.alpha_composite(bg, img)
    return img.convert("RGB")


def trim_box(rgb: Image.Image):
    a = np.asarray(rgb)
    mask = (a[..., 0] < WHITE_T) | (a[..., 1] < WHITE_T) | (a[..., 2] < WHITE_T)
    if not mask.any():
        return None
    ys, xs = np.where(mask)
    return (int(xs.min()), int(ys.min()), int(xs.max()) + 1, int(ys.max()) + 1)


def fit(img: Image.Image) -> Image.Image:
    w, h = img.size
    m = max(w, h)
    if m <= MAX_DIM:
        return img
    s = MAX_DIM / m
    return img.resize((max(1, round(w * s)), max(1, round(h * s))), Image.LANCZOS)


def load_frames(src: Path):
    gif = Image.open(src)
    frames, durs = [], []
    i = 0
    while True:
        try:
            gif.seek(i)
        except EOFError:
            break
        frames.append(gif.copy())
        durs.append(int(gif.info.get("duration", 100)))
        i += 1
    return frames, durs


def decimate(frames, durs, target):
    if len(frames) <= target:
        return frames, durs
    n = len(frames)
    idx = sorted({int(round(i * n / target)) for i in range(target)})
    factor = max(1, round(n / len(idx)))
    return [frames[i] for i in idx], [durs[i] * factor for i in idx]


def process_gif(src: Path, dst: Path) -> None:
    frames, durs = load_frames(src)
    frames, durs = decimate(frames, durs, MAX_FRAMES)
    out = []
    for f in frames:
        box = trim_box(f.convert("RGB"))
        if box:
            f = f.crop(box)
        out.append(fit(f))
    out[0].save(dst, save_all=True, append_images=out[1:], duration=durs, loop=0, optimize=True)


def process_static(src: Path, dst: Path) -> None:
    img = to_rgb(Image.open(src))
    box = trim_box(img)
    if box:
        img = img.crop(box)
    img = fit(img)
    if dst.suffix.lower() == ".webp":
        img.save(dst, quality=80, method=4)
    else:
        img.save(dst, quality=85)


def b64(path: Path) -> str:
    return base64.b64encode(path.read_bytes()).decode("ascii")


def page_css():
    return "\n".join(BASE_CSS)


def build_index() -> str:
    cards = []
    for r in ROUTINES:
        total = sum(len(ex) for _, ex in r["days"])
        cards.append(
            f'<a class="card" href="{r["slug"]}.html">'
            f'<h2>{r["title"]}</h2>'
            f'<p>{len(r["days"])} days · {total} exercises</p></a>'
        )
    return "\n".join([
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        "<title>Workouts</title>",
        "<style>",
        *BASE_CSS,
        "main{padding-top:28px}.card{display:block;background:#fff;border:1px solid #e3e7ec;border-radius:12px;padding:16px;margin-bottom:14px;text-decoration:none;color:inherit}",
        ".card h2{margin:0 0 4px;font-size:1.2rem}.card p{margin:0;color:#5a6675;font-size:.92rem}",
        ".card:hover{border-color:#1c2430}",
        "</style></head><body>",
        "<header><h1>Workouts</h1><p>Pick a routine.</p></header>",
        "<main>",
        *cards,
        "</main></body></html>",
    ])


def build_page(routine, files, chosen) -> str:
    parts = [
        "<!doctype html>",
        '<html lang="en"><head><meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{routine['title']}</title>",
        "<style>",
        page_css(),
        "</style></head><body>",
        "<header><h1>" + routine["title"] + "</h1>"
        + (f"<p>{routine['note']}</p>" if routine["note"] else "")
        + "</header>",
        "<main>",
    ]
    for day, exercises in routine["days"]:
        parts.append(f"<section><h2>{day}</h2>")
        for ex_id, name, desc in exercises:
            if ex_id in chosen:
                pick = chosen[ex_id]
                src = files[ex_id]
                data = b64(pick)
                mime = "image/gif" if src.suffix.lower() == ".gif" else ("image/webp" if src.suffix.lower() == ".webp" else "image/jpeg")
                img_tag = f'<img src="data:{mime};base64,{data}" alt="{name}">'
            else:
                img_tag = '<div class="noimg">No image yet</div>'
            parts.append(
                f'<article>{img_tag}'
                f'<div class="body"><h3>{name} <span class="log" data-type="{routine["slug"]}" data-day="{day}" data-ex="{ex_id}"></span></h3>'
                f'<p>{desc}</p></div></article>'
            )
        parts.append("</section>")
    parts.append(LOG_JS)
    parts.append("</main></body></html>")
    return "\n".join(parts)


def main() -> None:
    processed = REPO / "tmp" / "processed"
    processed.mkdir(parents=True, exist_ok=True)
    files = {p.stem: p for p in IMAGES.iterdir() if p.suffix.lower() in (".gif", ".jpg", ".jpeg", ".webp", ".png")}
    report = []
    chosen = {}
    for r in ROUTINES:
        for day, exercises in r["days"]:
            for ex_id, _, _ in exercises:
                src = files.get(ex_id)
                if src is None:
                    report.append(f"{ex_id:36s} {'(no image)':32s}")
                    continue
                dst = processed / src.name
                if src.suffix.lower() == ".gif":
                    process_gif(src, dst)
                else:
                    process_static(src, dst)
                # safety: never use a processed file bigger than the original
                pick = dst if dst.stat().st_size < src.stat().st_size else src
                chosen[ex_id] = pick
                report.append(f"{ex_id:36s} {src.name:32s} {src.stat().st_size/1024:8.0f} KB -> {pick.stat().st_size/1024:8.0f} KB {'(processed)' if pick is dst else '(original)'}")
    print("\n".join(report))

    OUT_DIR.mkdir(exist_ok=True)
    (OUT_DIR / "index.html").write_text(build_index(), encoding="utf-8")
    for r in ROUTINES:
        out = OUT_DIR / f"{r['slug']}.html"
        out.write_text(build_page(r, files, chosen), encoding="utf-8")
        print(f"{out}  {out.stat().st_size/1024/1024:.2f} MB")


if __name__ == "__main__":
    main()
