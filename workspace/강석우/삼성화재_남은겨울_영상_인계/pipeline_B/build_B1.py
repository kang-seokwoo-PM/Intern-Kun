#!/usr/bin/env python3
# build_B1.py <landing.html>  ->  work/film_B1.html
# B cut: a standalone film page (not the landing page itself). Every line of copy is read out of the landing HTML here, so it stays word for word -
# EXCEPT the two NEW lines below, which are drafts waiting for approval. To change them, edit these two constants and re-run.
NEW_LINE_1 = '어머니는 올해 몇 살이신가요?'      # cut 1 (opening question)        [NEW - not in the landing]
NEW_LINE_2 = '올겨울이 그중 한 번이에요'         # cut 4 (as the first dot goes out) [NEW - not in the landing]

import re, sys, os, json, html
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE, 'work'), exist_ok=True)
s = open(sys.argv[1], encoding='utf-8').read()
def one(pat, what):
    m = re.search(pat, s, re.S); assert m, 'not found in the landing HTML: ' + what
    return m.group(1) if m.lastindex == 1 else m.groups()
text = lambda h: html.unescape(re.sub(r'<[^>]+>', '', h)).strip()
mom_label = one(r'<label[^>]*for="mom"[^>]*>([^<]+)</label>', 'mother age label')
mom_age, age_unit = one(r'<input id="mom"[^>]*value="(\d+)"[^>]*><span>([^<]+)</span>', 'mother age default + unit')
question = one(r'<p class="caption">([^<]*몇 년쯤[^<]*)</p>', 'guess question')
chips = re.findall(r'<button class="sg"[^>]*>([^<]+)</button>', s); assert len(chips) == 4, 'expected 4 guess chips'
winters, unit = one(r'id="bNum" data-n="(\d+)"[^>]*></b><span class="u">([^<]+)</span>', 'winters number + unit')
winters_label = one(r'id="bLbl">([^<]+)<', 'winters label')
meals_label, meals_basis = one(r"\{n:r\.meet, l:'([^']+)', s:'([^']+)'\}", 'meals label + basis')
freq = int(one(r'const S = \{[^}]*freq:(\d+)', 'visits per year'))
assert ('1년 %d번' % freq) in meals_basis, 'basis line no longer matches the visits-per-year default'
assert re.search(r'meet: main \? main\.w \* S\.freq', s), 'meals formula changed'
meals = int(winters) * freq                                  # same formula as the landing: winters x visits per year
fact_b = one(r'class="b-fin b-fact"><b>(.*?)</b>', 'fact sentence'); f1, f2 = [text(x) for x in re.split(r'<br\s*/?>', fact_b)]
cite = one(r'class="b-fin b-fact"><b>.*?</b><small>([^<]+)</small>', 'fact citation')
hero = '2.2개'; assert hero in f1
close_head = [text(x) for x in re.split(r'<br\s*/?>', one(r'id="closeHead">(.*?)</h2>', 'closing headline'))]
cta = one(r'id="listBtn">([^<]+)</button>', 'closing button'); brand = one(r'class="brand">([^<]+)<', 'brand')
COPY = dict(newLine1=NEW_LINE_1, newLine2=NEW_LINE_2, momLabel=mom_label, momAge=mom_age, ageUnit=age_unit, question=question, chips=chips,
            winters=winters, wintersUnit=unit, wintersLabel=winters_label, meals=str(meals), mealsLabel=meals_label, mealsBasis=meals_basis,
            fact1=f1, factHero=hero, fact2=f2, factCite=cite, closeHead=close_head, cta=cta, brand=brand)
rd = lambda n: open(os.path.join(HERE, n), encoding='utf-8').read()
page = ('<!doctype html><html lang="ko"><head><meta charset="utf-8"><style>' + rd('film_B1.css') + '</style></head><body><div id="stage"></div>'
        '<script>window.COPY=' + json.dumps(COPY, ensure_ascii=False) + ';</script><script>' + rd('film_B1.js') + '</script></body></html>')
open(os.path.join(HERE, 'work', 'film_B1.html'), 'w', encoding='utf-8').write(page)
json.dump(COPY, open(os.path.join(HERE, 'work', 'copy_B1.json'), 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
print('build ok -> work/film_B1.html'); print(json.dumps(COPY, ensure_ascii=False, indent=1))
