#!/usr/bin/env python3
"""Собирает лендинг (<main id="landing">) из JSON с текстами.

Тексты живут отдельно от разметки, чтобы редактировать их как текст, а не как HTML,
и чтобы гейт на слоп проверял один файл. Использование:
  python3 scripts/apply-copy.py copy.json
"""
import html, json, pathlib, sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
INDEX = ROOT / "app" / "index.html"
GITHUB = "https://github.com/TsapkovAlexander/tgwrapped"
FILE_ICON = '<svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z"/><path d="M14 3v5h5"/><path d="M9 13h6"/><path d="M9 17h6"/></svg>'
LOCK_ICON = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="flex-shrink:0"><rect x="4" y="11" width="16" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>'

e = html.escape

def link_github(text):
    """«лежит на GitHub» в тексте становится ссылкой, если такая фраза есть."""
    for phrase in ("лежит на GitHub", "на GitHub", "GitHub"):
        if phrase in text:
            return e(text).replace(e(phrase), f'<a href="{GITHUB}" rel="noopener" style="text-decoration:underline">{e(phrase)}</a>', 1)
    return e(text)

def render(c):
    reveal = "\n".join(f"   <li>{e(t)}</li>" for t in c["reveal"]["items"])
    msgs = "\n".join(f'  <div class="m {m["side"]}">{e(m["text"])}</div>' for m in c["chat"]["messages"])
    proof = "\n".join(f"   <div><b>{e(p['title'])}</b><p>{link_github(p['text'])}</p></div>" for p in c["privacy"]["proof"])
    footer = c["footer"]
    foot_l, foot_r = (footer.split(" — ", 1) + [""])[:2] if " — " in footer else (footer, "")
    return f'''<main id="landing">
<div class="wrap">
 <header class="top"><span class="brand">tgwrapped</span>
  <nav><a href="#how">Инструкция</a><a href="#privacy">Приватность</a></nav></header>

 <section class="hero">
  <h1 class="d">{e(c["hero"]["h1"])}</h1>
  <p>{e(c["hero"]["sub"])}</p>
  <label class="drop" id="drop">
   <input type="file" id="file" accept=".json,application/json">
   {FILE_ICON}
   <strong>{e(c["drop"]["title"])}</strong>
   <span class="btn">{e(c["drop"]["btn"])}</span>
   <small class="hint">{e(c["drop"]["hint"])}</small>
  </label>
  <p class="priv">
   {LOCK_ICON}
   {e(c["privacy_line"])}</p>
  <div class="status" id="status"></div>
 </section>
</div>

<div class="wrap">
 <section class="reveal"><h2 class="d">{e(c["reveal"]["h2"])}</h2>
  <ul>
{reveal}
  </ul>
 </section>
</div>

<div class="wrap"><div class="showcase" id="showcase"></div>
 <p class="caption">{e(c["showcase_caption"])}</p></div>

<div class="wrap">
 <section class="block chat" id="how"><h2 class="d">{e(c["chat"]["h2"])}</h2>
  <div class="msgs">
{msgs}
  </div>
 </section>

 <section class="block" id="privacy"><h2 class="d">{e(c["privacy"]["h2"])}</h2>
  <p class="lead">{e(c["privacy"]["p"])}</p>
  <div class="proof">
{proof}
  </div>
 </section>

 <footer><span>{e(foot_l)}</span><span>{e(foot_r)}</span></footer>
</div>
</main>'''

def main():
    src = pathlib.Path(sys.argv[1])
    copy = json.loads(src.read_text(encoding="utf-8"))
    page = INDEX.read_text(encoding="utf-8")
    a = page.index('<main id="landing">')
    b = page.index("</main>", a) + len("</main>")
    INDEX.write_text(page[:a] + render(copy) + page[b:], encoding="utf-8")
    print(f"лендинг собран из {src.name}: {len(copy['reveal']['items'])} крючков, {len(copy['chat']['messages'])} реплик")

main()
