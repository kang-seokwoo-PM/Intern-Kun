// helper_v6.js - injected into the landing page by build_v6.py. Adds only what the film needs; copy is read from the landing DOM, never retyped here.
window.__anims=new Map();
// frame-exact clock for CSS animations: render_v6.js calls __tick(1000/30) once per frame
window.__tick=function(dt){
  for(const a of document.getAnimations()){
    let t=__anims.get(a); if(t===undefined){a.pause();t=0}
    t+=dt; __anims.set(a,t);
    const end=a.effect.getComputedTiming().endTime;
    if(isFinite(end)&&t>=end){try{a.finish()}catch(e){a.currentTime=end}} else a.currentTime=t;
  }
};
window.__set=function(vars,sel){const el=document.querySelector(sel||'.scr.on');for(const k in vars)el.style.setProperty('--'+k,vars[k])};
window.__vf=async function(n){const im=document.getElementById('bFrame');const s='vf/'+n+'.jpg';if(!im.src.endsWith(s)){im.src=s;await im.decode()}};
window.__lines=function(el,sep){const parts=el.innerHTML.split(sep||/<br\s*\/?>/i);el.innerHTML=parts.map((p,i)=>`<span class="ln" style="--i:${i}">${p}</span>`).join('')};
(function(){
  const q=s=>document.querySelector(s), mk=(tag,id,parent,before,cls)=>{const e=document.createElement(tag);if(id)e.id=id;if(cls)e.className=cls;parent.insertBefore(e,before||null);return e};
  const need=(c,m)=>{if(!c)throw new Error('helper_v6: '+m)};

  // 1. COLD OPEN - belief, left hanging: lines 1-3 of the landing intro paragraph (h1.st-b), then the landing's own question (p.st-q).
  //    Line 4 (the conclusion) is NOT shown here; the conclusion comes only once, after the 16.
  const intro=q('#s-intro'); const L=q('.st-b').innerHTML.split(/<br\s*\/?>/i); need(L.length===4,'intro paragraph should have 4 lines');
  const Q=q('.st-q').innerHTML.split(/<br\s*\/?>/i); need(Q.length===2,'intro question should have 2 lines');
  mk('div',null,intro,intro.firstChild,'v4scrim'); mk('div',null,intro,intro.firstChild,'v4bg');
  const o=mk('div','v5open',intro);
  o.innerHTML=`<div class="a"><span class="ln" style="--d:.2s">${L[0]}</span><span class="ln" style="--d:.65s">${L[1]}</span></div>`+
              `<div class="b"><span class="ln" style="--d:1.6s">${L[2]}</span></div>`+
              `<div class="q"><span class="ln" style="--d:2.75s">${Q[0]}</span><span class="ln" style="--d:2.95s">${Q[1]}</span></div>`;

  // 1b. INTRO CTA - the landing's own button under the copy; pointer + press effect (the film then really clicks it to go to the ages)
  const cta0=q('#s-intro .st-foot .cta'); cta0.id='introCta'; mk('span',null,cta0,null,'rip'); mk('div','ptr0',intro);

  // 2. QUESTION
  const cap=q('.guess .caption'); cap.innerHTML=cap.innerHTML.replace(', ',',<br>'); __lines(cap);
  document.querySelectorAll('#guess .sg').forEach((b,i)=>b.style.setProperty('--i',i));
  const inp=q('#s-input'); mk('div',null,inp,inp.firstChild,'v4scrim'); mk('div',null,inp,inp.firstChild,'v4bg'); mk('div','ptr',inp);

  // 3. BRIDGE (the 16)
  const br=q('#s-bridge'); mk('div','bscrim',br,q('.b-copy'));
  const d=mk('div','v3dots',q('.b-copy'),q('#bLbl'));
  // the conclusion (the landing's bridge message, p.b-msg) - shown once, after the 16 has sat quietly; it takes the place of the sub line
  const msg=mk('div','v6msg',q('.b-copy')); msg.innerHTML=q('.b-msg').innerHTML;
  window.__msgTop=function(){msg.style.top=q('#bSub').offsetTop+'px'};
  window.__dots=function(n){d.innerHTML='';for(let i=0;i<n;i++)d.appendChild(document.createElement('i'))};

  // 4. THE 2.2 - rebuilt from the landing fact card (.b-fact): same sentence, same citation, number pulled out as the hero
  const fb=q('.b-fact b').innerHTML.split(/<br\s*\/?>/i).map(h=>{const t=document.createElement('i');t.innerHTML=h;return t.textContent.trim()});
  const hero='2.2개'; need(fb.length===2&&fb[0].split(hero).length===2,'fact sentence changed');
  const [pre,post]=fb[0].split(hero);
  const f=mk('div','v5fact',br);
  f.innerHTML=`<div class="row"><span class="pre">${pre.trim()}</span><span class="num">${hero.slice(0,-1)}<span class="u">${hero.slice(-1)}</span></span><span class="post">${post}</span></div>`+
              `<div class="s2">${fb[1]}</div><div class="cite">${q('.b-fact small').textContent}</div>`;

  // 5. CLOSING - pointer + press effect on the real CTA button (never clicked)
  const chk=q('#s-check'); mk('div','ptr2',chk); mk('div','ring',chk); mk('span',null,q('#listBtn'),null,'rip');
  window.__btn=function(){const r=q('#listBtn').getBoundingClientRect();return [r.left,r.top,r.width,r.height]};

  // 6. END CARD - event logo slot + brand mark (brand text taken from the landing header)
  const e=mk('div','v5end',q('.app'));
  e.innerHTML=`<div class="bg"></div><div class="warm"></div><div class="scrim"></div><div class="lock"><img class="logo" id="evLogo" src="../assets/event_logo.png" alt=""><div class="mark">${q('.intro .brand').textContent}</div></div>`;

  window.__chip=function(i){const r=document.querySelectorAll('#guess .sg')[i].getBoundingClientRect();return [r.left+r.width/2,r.top+r.height/2]};
  // the landing auto-advances the result screen on timers; the film drives those steps itself
  const _st=window.setTimeout;window.__remap=null;
  window.setTimeout=function(fn,dl,...a){return _st(fn,(window.__remap&&window.__remap[dl]!==undefined)?window.__remap[dl]:dl,...a)};
  window.__startBridge=window.startBridge;window.startBridge=function(){};
})();
