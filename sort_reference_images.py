import json, os
from PIL import Image

base = r'C:\Users\Danie\Desktop\scraper_ergebnisse_20260316_015834'
project = r'C:\Users\Danie\Desktop\CannaDiagnose'
ref_dir = os.path.join(project, 'assets', 'reference_images')

with open(os.path.join(base, 'bilder_index.json'), 'r', encoding='utf-8') as f:
    images = json.load(f)

keywords = {
    'nitrogen': 'N_mangel', 'stickstoff': 'N_mangel', 'n deficiency': 'N_mangel',
    'phosphorus': 'P_mangel', 'phosphor': 'P_mangel', 'p deficiency': 'P_mangel',
    'potassium': 'K_mangel', 'kalium': 'K_mangel', 'k deficiency': 'K_mangel',
    'calcium': 'Ca_mangel', 'kalzium': 'Ca_mangel', 'ca deficiency': 'Ca_mangel',
    'magnesium': 'Mg_mangel', 'mg deficiency': 'Mg_mangel',
    'sulfur': 'S_mangel', 'schwefel': 'S_mangel', 's deficiency': 'S_mangel',
    'iron': 'Fe_mangel', 'eisen': 'Fe_mangel', 'fe deficiency': 'Fe_mangel',
    'manganese': 'Mn_mangel', 'mangan': 'Mn_mangel', 'mn deficiency': 'Mn_mangel',
    'zinc': 'Zn_mangel', 'zink': 'Zn_mangel', 'zn deficiency': 'Zn_mangel',
    'boron': 'B_mangel', 'bor': 'B_mangel', 'b deficiency': 'B_mangel',
    'copper': 'Cu_mangel', 'kupfer': 'Cu_mangel', 'cu deficiency': 'Cu_mangel',
    'molybdenum': 'Mo_mangel', 'mo deficiency': 'Mo_mangel',
}

category_map = {
    'Stickstoffmangel': 'N_mangel',
    'Phosphormangel': 'P_mangel',
    'Kaliummangel': 'K_mangel',
    'Kalziummangel': 'Ca_mangel',
    'Magnesiummangel': 'Mg_mangel',
}

categorized = {}
for img in images:
    cat = img.get('kategorie', '')
    text = (img.get('alt_text', '') + ' ' + img.get('figcaption', '')).lower()
    kb = img.get('groesse_kb', 0)
    if kb < 10:
        continue

    target = None
    if cat == 'wissenschaft':
        for kw, tgt in keywords.items():
            if kw in text:
                target = tgt
                break
    if not target and cat in category_map:
        target = category_map[cat]

    if target:
        if target not in categorized:
            categorized[target] = []
        categorized[target].append(img)

os.makedirs(ref_dir, exist_ok=True)
index = {}

SEP = os.sep

for cat, imgs in sorted(categorized.items()):
    cat_dir = os.path.join(ref_dir, cat)
    os.makedirs(cat_dir, exist_ok=True)
    imgs.sort(key=lambda x: x.get('groesse_kb', 0), reverse=True)
    selected = imgs[:3]
    index[cat] = []

    for i, img in enumerate(selected):
        raw_path = img['datei']
        # Normalize path separators
        normalized = raw_path.replace('/', SEP).replace('\\', SEP)
        src = os.path.join(base, normalized)
        if not os.path.exists(src):
            print(f"  SKIP: {src}")
            continue
        try:
            pil_img = Image.open(src).convert('RGB')
            pil_img.thumbnail((256, 256), Image.LANCZOS)
            dst_name = f'ref_{i+1}.jpg'
            dst = os.path.join(cat_dir, dst_name)
            pil_img.save(dst, 'JPEG', quality=75)
            index[cat].append({
                'file': dst_name,
                'source': img.get('quelle', ''),
                'description': (img.get('figcaption', '') or img.get('alt_text', ''))[:100]
            })
            print(f"  {cat}/{dst_name} ({pil_img.size[0]}x{pil_img.size[1]})")
        except Exception as e:
            print(f"  ERROR: {e}")

with open(os.path.join(ref_dir, 'index.json'), 'w', encoding='utf-8') as f:
    json.dump(index, f, indent=2, ensure_ascii=False)

print(f"\nGesamt: {sum(len(v) for v in index.values())} Referenzbilder in {len(index)} Kategorien")
