#!/usr/bin/env python3
"""伴走コンサル LP のビルド。

  python3 _consulting/build.py

_consulting/config.json と _consulting/src/ から /consulting/ を生成する。
サービス名・数字・FAQ・店舗などは config.json だけを編集すればよい。
（_consulting/ は先頭が "_" なので GitHub Pages では公開されない）
"""
import html
import json
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parent
SRC = ROOT / "src"
OUT = ROOT.parent / "consulting"

cfg = json.loads((ROOT / "config.json").read_text(encoding="utf-8"))
e = html.escape

ICONS = {
    "CHECK": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
    "ARROW": '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg>',
    "PROFIT": '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 40h36"/><path d="M11 33V25M20 33V20M29 33V15M38 33V9"/><path d="M9 19l9-7 8 5 13-10"/><path d="M33 7h6v6"/></svg>',
    "CASH": '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><rect x="5" y="12" width="38" height="24" rx="3"/><circle cx="24" cy="24" r="5.5"/><path d="M11 18v0M37 30v0"/><path d="M14 40h20"/></svg>',
    "BANK": '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M6 18L24 8l18 10"/><path d="M8 18h32"/><path d="M12 22v12M20 22v12M28 22v12M36 22v12"/><path d="M6 40h36"/></svg>',
    "STORES": '<svg viewBox="0 0 48 48" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M4 20l3-9h14l3 9"/><path d="M6 20v18h16V20"/><path d="M11 38v-8h6v8"/><path d="M28 24l2-7h11l3 7"/><path d="M30 24v14h12V24"/><path d="M34 38v-6h4v6"/></svg>',
}

# ロゴマーク：並んで上っていく2本の線（＝伴走）
LOGO_MARK = (
    '<svg class="logo-mark" viewBox="0 0 34 34" aria-hidden="true">'
    '<rect width="34" height="34" rx="8" fill="var(--accent)"/>'
    '<path d="M8 25.5L17.5 9" stroke="#fff" stroke-width="3" stroke-linecap="round"/>'
    '<path d="M15.5 26L25 9.5" stroke="#fff" stroke-width="3" stroke-linecap="round" opacity=".55"/>'
    '</svg>'
)


def stats_html():
    out = []
    for s in cfg["stats"]:
        pre = f'<span class="pre">{e(s["prefix"])}</span>' if s.get("prefix") else ""
        note = f'<span class="stat-note">{e(s["note"])}</span>' if s.get("note") else ""
        out.append(
            f'          <div class="stat"><p class="stat-value">{pre}{e(s["value"])}<small>{e(s["unit"])}</small></p>'
            f'<p class="stat-label">{e(s["label"])}{note}</p></div>'
        )
    return "\n".join(out)


def brands_html():
    return "\n".join(
        f'              <tr><th scope="row">{e(b["name"])}</th><td>{e(b["area"])}・{e(b["genre"])}</td><td>{e(b["desc"])}</td></tr>'
        for b in cfg["brands"])


def case_parts():
    cs = cfg["case"]
    kpis = "\n".join(
        f'            <div class="kpi"><p class="kpi-l">{e(k["label"])}</p><p class="kpi-v">{e(k["value"])}<small>{e(k["unit"])}</small></p><p class="kpi-s">{e(k["sub"])}</p></div>'
        for k in cs["kpis"])
    top = max(cs["before"] + cs["after"])
    bars = "\n".join(
        f'              <div class="m"><div class="m-bars"><span class="b0" style="--h:{b / top * 100:.1f}%" title="{e(cs["before_label"])} {m} {b}万円"></span>'
        f'<span class="b1" style="--h:{a / top * 100:.1f}%" title="{e(cs["after_label"])} {m} {a}万円"><em>{a}</em></span></div><p>{e(m)}</p></div>'
        for m, b, a in zip(cs["months"], cs["before"], cs["after"]))
    alt = "月ごとの売上。" + "、".join(f'{m} {b}万円→{a}万円' for m, b, a in zip(cs["months"], cs["before"], cs["after"]))
    return {"CASE_LABEL": e(cs["label"]), "CASE_LEAD": e(cs["lead"]), "CASE_KPIS": kpis, "CASE_BARS": bars,
            "CASE_BEFORE_LABEL": e(cs["before_label"]), "CASE_AFTER_LABEL": e(cs["after_label"]),
            "CASE_CHART_ALT": e(alt), "CASE_NOTE": e(cs["note"])}


def faq_html():
    return "\n".join(
        f'          <details><summary>{e(f["q"])}</summary><p class="faq-a">{e(f["a"])}</p></details>'
        for f in cfg["faq"]
    )


def jsonld():
    url = cfg["site_url"]
    co = cfg["company"]
    org = {"@type": "Organization", "@id": co["url"] + "#org", "name": co["name"], "alternateName": co["name_en"],
           "url": co["url"], "foundingDate": "2024-01",
           "address": {"@type": "PostalAddress", "streetAddress": "駒場2丁目9-9", "addressLocality": "目黒区",
                       "addressRegion": "東京都", "addressCountry": "JP"}}
    service = {
        "@type": "ProfessionalService", "@id": url + "#service", "name": cfg["service_name"], "url": url,
        "description": "飲食店専門の成果報酬型経営コンサルティング。店舗別PL・原価・人件費・BS・キャッシュフローを分析し、利益改善、財務・資金繰り改善、借入・財務戦略、多店舗展開を、改善施策の実行まで伴走して支援する。",
        "provider": {"@id": org["@id"]}, "areaServed": {"@type": "Country", "name": "日本"},
        "audience": {"@type": "BusinessAudience", "audienceType": "飲食店を経営する事業者"},
        "serviceType": "飲食店 経営改善コンサルティング",
        "hasOfferCatalog": {"@type": "OfferCatalog", "name": "提供サービス", "itemListElement": [
            {"@type": "Offer", "itemOffered": {"@type": "Service", "name": n}} for n in
            ["利益改善", "財務・資金繰り改善", "借入・財務戦略", "多店舗展開支援"]]},
    }
    faq = {"@type": "FAQPage", "@id": url + "#faq", "mainEntity": [
        {"@type": "Question", "name": f["q"], "acceptedAnswer": {"@type": "Answer", "text": f["a"]}} for f in cfg["faq"]]}
    page = {"@type": "WebPage", "@id": url, "url": url, "inLanguage": "ja",
            "name": f"飲食店の経営改善・利益改善コンサル｜完全成果報酬型【{cfg['service_name']}】",
            "about": {"@id": service["@id"]}, "publisher": {"@id": org["@id"]}}
    data = {"@context": "https://schema.org", "@graph": [org, service, page, faq]}
    return '  <script type="application/ld+json">' + json.dumps(data, ensure_ascii=False) + "</script>"


def ga():
    gid = cfg.get("ga4_id", "").strip()
    if not gid:
        return ""
    return (f'  <script async src="https://www.googletagmanager.com/gtag/js?id={gid}"></script>\n'
            "  <script>window.dataLayer=window.dataLayer||[];function gtag(){dataLayer.push(arguments);}"
            f"gtag('js',new Date());gtag('config','{gid}');</script>")


def llms_txt():
    lines = [f"# {cfg['service_name']}（飲食店専門・成果報酬型の経営改善コンサルティング）", "",
             f"> 運営：{cfg['company']['name']}（自社でも複数の飲食ブランドを経営）。すでに飲食店を経営している事業者向けに、"
             "利益改善・財務／資金繰り改善・借入／財務戦略・多店舗展開を、分析から実行まで伴走して支援する。"
             "初回相談無料・着手金0円・成果報酬型（適用には事前審査あり。成果指標・測定期間・報酬条件・実費負担は契約前に個別合意）。", "",
             f"- ページ: {cfg['site_url']}", f"- 無料相談: {cfg['site_url']}#contact", "",
             "## 自社運営店舗の実績", "", cfg["case"]["lead"],
             "、".join(f"{k['label']} {k['value']}{k['unit']}（{k['sub']}）" for k in cfg["case"]["kpis"]), cfg["case"]["note"], "",
             "## よくある質問", ""]
    for f in cfg["faq"]:
        lines += [f"### {f['q']}", f["a"], ""]
    return "\n".join(lines)


def main():
    c = cfg["colors"]
    repl = {
        "SERVICE_NAME": e(cfg["service_name"]), "SERVICE_NAME_EN": e(cfg["service_name_en"]),
        "SITE_URL": cfg["site_url"], "PRIVACY_URL": cfg["company"]["privacy_url"],
        "COMPANY_NAME": e(cfg["company"]["name"]), "COMPANY_URL": cfg["company"]["url"],
        "COMPANY_CEO": e(cfg["company"]["ceo"]), "COMPANY_FOUNDED": e(cfg["company"]["founded"]),
        "COMPANY_ADDRESS": e(cfg["company"]["address"]),
        "C_BG": c["bg"], "C_TEXT": c["text"], "C_ACCENT": c["accent"], "C_SUB": c["sub"],
        "C_BORDER": c["border"], "C_WHITE": c["white"],
        "ROBOTS": "noindex, nofollow" if cfg.get("noindex") else "index, follow, max-image-preview:large",
        "STATS": stats_html(), "STATS_DISCLAIMER": e(cfg["stats_disclaimer"]),
        "BRANDS": brands_html(), "REPLY_NOTE": e(cfg.get("reply_note", "")), "FAQ": faq_html(), "JSONLD": jsonld(), "GA": ga(), "LOGO_MARK": LOGO_MARK,
        "GOOGLE_FORM_URL": cfg["google_form_url"],
        "GOOGLE_FORM_EMBED": cfg["google_form_url"] + "?embedded=true",
        "CONFIG_JS": json.dumps({"ads_conversion_send_to": cfg.get("ads_conversion_send_to", "")}),
    }
    repl.update(case_parts())
    for k, v in ICONS.items():
        repl["ICON_" + k] = v

    page = (SRC / "index.html").read_text(encoding="utf-8")
    for k, v in repl.items():
        page = page.replace("{{" + k + "}}", v)
    left = [p.split("}}")[0] for p in page.split("{{")[1:]]
    if left:
        raise SystemExit(f"未置換のプレースホルダ: {left}")

    if OUT.exists():
        shutil.rmtree(OUT / "assets", ignore_errors=True)
    (OUT / "assets").mkdir(parents=True, exist_ok=True)
    shutil.copytree(SRC / "assets", OUT / "assets", dirs_exist_ok=True)
    (OUT / "assets" / "favicon.svg").write_text(
        LOGO_MARK.replace('class="logo-mark" ', 'xmlns="http://www.w3.org/2000/svg" ').replace("var(--accent)", c["accent"]),
        encoding="utf-8")
    (OUT / "index.html").write_text(page, encoding="utf-8")
    (OUT / "llms.txt").write_text(llms_txt(), encoding="utf-8")
    print(f"built → {OUT}")


if __name__ == "__main__":
    main()
