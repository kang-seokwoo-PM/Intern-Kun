#!/usr/bin/env python3
# build_v6.py <landing.html>  ->  work/page_v6.html
# Takes the landing page as-is and injects the 16:9 film styles (ls_v6.css) + film helpers (helper_v6.js).
# All on-screen copy stays in the landing HTML; this script only checks that the lines the film relies on are there.
import re, sys, os
HERE = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(HERE, 'work'), exist_ok=True)
s = open(sys.argv[1], encoding='utf-8').read()
for c in ['짜증을 내도, 투정을 부려도<br>늘 다 받아 주시던 우리 부모님.', '언제까지나 그 자리에 계실 것 같지만,', '부모님과 함께할 겨울이 얼마나 남았는지<br>궁금하지 않으신가요?', '생각보다, 부모님과 함께할 시간은<br>많지 않을 수 있어요.',
          '부모님과 함께할 시간, 몇 년쯤 남았을까요?', '먼저 맞혀 보세요', '>5년쯤<', '>10년쯤<', '>20년쯤<', '>30년 넘게<',
          '생각하신 것보다 조금 짧은 <b>약 ${m.w}년</b>이에요', '평균 2.2개의 만성질환을 갖고 계세요', '3개 이상인 분도 3명 중 1명이 넘어요.',
          '보건복지부·한국보건사회연구원, 2023 노인실태조사', '내 건강보험 점검 신청하기', '>함께할 수 있는 겨울 세어 보기<', '>삼성화재 다이렉트<']:
    assert c in s, 'copy not found in the landing HTML: ' + c
s = re.sub(r'<link rel="stylesheet" href="https://cdn[^>]+>', '', s)          # web font CDN -> local fonts/
s = re.sub(r'(id="bVidData">)[^<]+(<)', r'\1\2', s)                           # bridge video is fed as stills instead
s = s.replace('</head>', '<style>' + open(os.path.join(HERE, 'ls_v6.css'), encoding='utf-8').read() + '</style></head>', 1)
s = s.replace('<video class="bvid"', '<img class="bvid" id="bFrame" src="vf/f0001.jpg" alt=""><video class="bvid"', 1)
s = s.replace('</body>', '<script>' + open(os.path.join(HERE, 'helper_v6.js'), encoding='utf-8').read() + '</script></body>', 1)
open(os.path.join(HERE, 'work', 'page_v6.html'), 'w', encoding='utf-8').write(s)
print('build ok -> work/page_v6.html')
