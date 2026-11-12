# music_v5.py <total_seconds> <marks.json> <out_dir>
# Generated piano bed for the v5 cut (pure synthesis, no external samples) + the two heartbeat thumps.
# Arc: A minor -> near-silent breath -> big F on the "16" hit -> sparse A minor under the 2.2 -> C major, final chord on the event logo.
# Writes: music_bed.wav (music only), heartbeat_sfx.wav (thumps only), mix.wav (both; what the film uses).
import numpy as np, wave, sys, json, os
def fftconvolve(a,b):
    n=len(a)+len(b)-1; m=1<<(n-1).bit_length()
    return np.fft.irfft(np.fft.rfft(a,m)*np.fft.rfft(b,m),m)[:n]
def lowpass(x,fc=5200):
    X=np.fft.rfft(x); fr=np.fft.rfftfreq(len(x),1/48000); return np.fft.irfft(X/(1+(fr/fc)**4),len(x))
SR=48000; DUR=float(sys.argv[1]); M=json.load(open(sys.argv[2]))
N=int(DUR*SR)+SR*8; L=np.zeros(N); R=np.zeros(N); PL=np.zeros(N); PR=np.zeros(N)
rng=np.random.default_rng(7)
NOTE={'C':0,'D':2,'E':4,'F':5,'G':7,'A':9,'B':11}
def f(n):
    name=n[0]; acc=n[1:-1]; o=int(n[-1]); s=NOTE[name]+(1 if acc=='#' else -1 if acc=='b' else 0)
    return 440*2**((s-9+(o-4)*12)/12)
def piano(t0,n,vel=.5,length=6.0,hum=.01):
    fr=f(n); t0=max(0,t0+rng.uniform(-hum,hum)); i0=int(t0*SR); m=int(min(length,7)*SR); t=np.arange(m)/SR
    y=np.zeros(m); nh=int(max(3,min(9,5000/fr)))
    base=0.55*(fr/220)**.45
    for h in range(1,nh+1):
        fh=fr*h*np.sqrt(1+0.0004*h*h)
        y+=(1/h**1.5)*(0.75+0.25*vel if h>1 else 1)*np.exp(-t*base*(1+.3*h))*np.sin(2*np.pi*fh*t+rng.uniform(0,6.28))
    y*=np.minimum(1,t/.008)*np.minimum(1,(t[-1]-t)/.4)*vel
    pan=np.clip(.5+(np.log2(fr/261.6))*.12,.2,.8)
    L[i0:i0+m]+=y*np.cos(pan*np.pi/2); R[i0:i0+m]+=y*np.sin(pan*np.pi/2)
def pad(t0,notes,dur,vel=.1,att=1.6,rel=2.4):
    t0=max(0,t0); i0=int(t0*SR); m=int((dur+rel)*SR); t=np.arange(m)/SR
    env=np.minimum(1,t/att)**1.5*np.minimum(1,np.maximum(0,(dur+rel-t)/rel))**1.5
    for k,n in enumerate(notes):
        fr=f(n)
        for d,pn in ((-.004,.25),(0,.5),(.004,.75)):
            y=np.sin(2*np.pi*fr*(1+d)*t+rng.uniform(0,6.28))+.28*np.sin(4*np.pi*fr*(1+d)*t)+.1*np.sin(6*np.pi*fr*(1+d)*t)
            y*=env*vel*(1+.06*np.sin(2*np.pi*.23*t+k))/3
            PL[i0:i0+m]+=y*np.cos(pn*np.pi/2); PR[i0:i0+m]+=y*np.sin(pn*np.pi/2)
# --- A: cold open -> ages -> question (enters on frame 0; 3 bars fitted exactly up to the breath) ---
tb=M['breath0']; BAR=(tb-.15)/3; st=BAR/8
A=[(['A2','E3','A3','C4','E4','C4','A3','E3'],['A3','C4','E4'],('E5','C5')),
   (['F2','C3','F3','A3','C4','A3','F3','C3'],['F3','A3','C4'],('A4','C5')),
   (['E2','B2','E3','G3','B3','G3','E3',None],['E3','G3','B3'],('B4',None))]      # ends open (unresolved) into the breath
for b,(arp,pd,mel) in enumerate(A):
    t0=.04+b*BAR
    for i,n in enumerate(arp):
        if n: piano(t0+i*st,n,(.46 if i==0 else .32)+.03*b,5)
    pad(t0,pd,BAR,.07+.015*b,.5 if b==0 else 1.2,1.0 if b==2 else 2.0)
    piano(t0,mel[0],.44,6)
    if mel[1]: piano(t0+4*st,mel[1],.36,6)
# --- breath: nothing new sounds; tails are ducked by the gain curve below ---
# --- B: the hit. big F(add9) on the landing frame, then the answer phrase ---
tl=M['land']; tf=M['fact']; tc=M['closing']
pad(M['reveal']-.1,['F3','C4'],tl-M['reveal']+.2,.10,tl-M['reveal']+.1,.6)       # short swell into the hit
for n,v in (('F1',.62),('F2',.66),('C3',.56),('F3',.5),('A3',.5),('C4',.5),('G4',.42),('A4',.5),('C5',.54),('A5',.5),('C6',.3)): piano(tl,n,v,7,.006)
pad(tl,['F2','C3','A3','C4','G4'],tf-tl-1.0,.17,.25,2.2)
g=(tf-tl)/8                                                                      # answer phrase spread over the hold
for i,(n,v) in enumerate((('C4',.3),('F4',.3),('A4',.34),('G5',.44),('C4',.28),('F5',.4),('A4',.3),('E5',.4))):
    if i>=2: piano(tl+i*g,n,v,6)
piano(tl+4*g,'G2',.46,7); piano(tl+4*g+.02,'D3',.36,6); piano(tl+4*g+.04,'B3',.34,6)   # F -> G under the sub line
# --- fact card: A minor, sparse and steady ---
h=(tc-tf)/8
piano(tf+.1,'A2',.5,7); piano(tf+.12,'E3',.38,6)
th=M['fact_hit']
for n,v in (('A1',.6),('A2',.56),('E3',.44),('A3',.4),('E4',.36)): piano(th,n,v,7,.004)      # accent on the 2.2 landing (smaller than the 16 hit)
for i,(n,v) in enumerate((('A3',.3),('C4',.3),('E4',.32),('C5',.4),('E4',.28),('B4',.36),('D4',.28),('G4',.3))): piano(tf+.1+i*h,n,v,5)
pad(tf,['A2','E3','C4'],tc-tf-.6,.10,.8,1.6)
piano(tf+.1+4*h,'G2',.42,6)
# --- closing: C major, warm and full, final chord rings through the fade ---
te=DUR; c=(M['logo']-tc-.05)/8                                                  # final chord lands with the event logo
for n,v in (('C2',.5),('C3',.52),('G3',.44),('E4',.44),('G4',.42),('E5',.5)): piano(tc+.05,n,v,7,.006)
for i,(n,v) in enumerate((('G3',.34),('C4',.34),('E4',.36),('G5',.46),('C4',.3),('E5',.42),('G4',.32),('D5',.42))):
    if i: piano(tc+.05+i*c,n,v,5)
pad(tc,['C3','G3','E4','G4','C5'],te-tc-2.0,.17,.7,2.6)
tF=tc+.05+8*c
for n,v in (('F2',.4),('C3',.4),('A3',.36),('C5',.44)): piano(tc+.05+4*c,n,v if n!='C5' else 0,6)   # IV colour mid-bar
for n,v in (('C2',.5),('G2',.4),('C3',.46),('G3',.4),('E4',.42),('C5',.5),('G5',.3)): piano(tF+rng.uniform(0,.04),n,v,7,.004)
# --- reverb + mix ---
def verb(x,seed):
    r=np.random.default_rng(seed); n=int(3.0*SR); ir=r.standard_normal(n)*np.exp(-np.arange(n)/SR*2.3); ir[:int(.012*SR)]=0
    ir=lowpass(ir); ir/=np.sqrt((ir**2).sum())
    return fftconvolve(x,ir)[:len(x)]
dl=L+.9*PL; dr=R+.9*PR
wl=verb(dl,1); wr=verb(dr,2)
ol=lowpass(dl)*.8+.2*dl+.40*wl; orr=lowpass(dr)*.8+.2*dr+.40*wr
t=np.arange(N)/SR
def ramp(a,b): return np.clip((t-a)/(b-a),0,1)
# --- heartbeat: two soft low thumps (lub, dub) on the two pulses of the 2.2 ---
HB=np.zeros(N)
def thump(t0,f0,amp):
    m=int(.5*SR); tt=np.arange(m)/SR; fr=f0*(1+.9*np.exp(-tt/.022)); ph=2*np.pi*np.cumsum(fr)/SR
    y=(np.sin(ph)+.45*np.sin(2*ph)+.15*np.sin(3*ph))*(1-np.exp(-tt/.004))*np.exp(-tt/.085)
    i0=int(t0*SR); HB[i0:i0+m]+=y*amp
thump(M['pulse1'],56,1.0); thump(M['pulse2'],64,.72)
HB=lowpass(HB,420)
sm=lambda x:x*x*(3-2*x)
g=.75+.25*sm(ramp(0,.5))                                                     # present from the first frame
g*=1-.94*sm(ramp(tb-.25,tb+.2))*(1-sm(ramp(M['reveal']-.05,tl-.02)))           # near-silent breath, opens into the hit
g*=1+.22*sm(ramp(tl-.05,tl+.05))*(1-sm(ramp(tf-.6,tf+.4)))+.10*sm(ramp(tc-.3,tc+1.5))   # hit is the loudest point; closing warm
g*=1+.7*(1-sm(ramp(tb-.4,tb+.1)))                                            # opening bed more present
for tp in (M['pulse1'],M['pulse2']): g*=1-.28*sm(ramp(tp-.08,tp))*(1-sm(ramp(tp+.12,tp+.4)))   # bed dips slightly under each thump
g*=1-sm(ramp(M['fade_out'],DUR-.03))
ol=(ol*g)[:int(DUR*SR)]; orr=(orr*g)[:int(DUR*SR)]
n=int(DUR*SR); pk=max(np.abs(ol).max(),np.abs(orr).max()); k=.84/pk
bed=np.stack([ol*k,orr*k],1)
hb=(HB[:n]/np.abs(HB).max()*.42); sfx=np.stack([hb,hb],1)
mix=bed+sfx; mix*=min(1,.97/np.abs(mix).max())
os.makedirs(sys.argv[3],exist_ok=True)
for name,x in (('music_bed',bed),('heartbeat_sfx',sfx),('mix',mix)):
    w=wave.open(os.path.join(sys.argv[3],name+'.wav'),'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((x*32767).astype('<i2').tobytes()); w.close()
print('music ok',DUR,'bar',round(BAR,3))
