# snow_v5.py <seconds>  -> raw 1920x1080 gray frames on stdout (piped into ffmpeg by assemble_v5.py)
# One continuous snowfall for the whole film, screen-blended over all cuts so it never jumps at a cut. Same seed = same snow every time.
import numpy as np, sys
W,H,FPS=1920,1080,30; n=int(float(sys.argv[1])*FPS); rng=np.random.default_rng(11)
K=230
x=rng.uniform(0,W,K); y=rng.uniform(0,H,K); r=rng.uniform(1.4,5.2,K)**1.0; sp=rng.uniform(.6,1.8,K); op=rng.uniform(.4,.85,K); ph=rng.uniform(0,6.28,K)
r=np.where(rng.uniform(size=K)<.8,rng.uniform(1.3,3.0,K),rng.uniform(3.0,5.6,K)); op=np.where(r>3.5,op*.6,op)
def sprite(rad):
    s=int(rad*2.5)+3; yy,xx=np.mgrid[-s:s+1,-s:s+1]; d=np.hypot(xx,yy); soft=.9+rad*.28
    return np.clip((rad-d)/soft+.5,0,1)**1.3
spr=[sprite(a) for a in r]
out=sys.stdout.buffer
for i in range(n):
    t=i/FPS; gust=(.45+np.sin(t*1.3)*.7+np.sin(t*3.1)*.25)*2.4
    f=np.zeros((H+40,W+40),np.float32)
    for k in range(K):
        s=spr[k]; h=s.shape[0]//2; cx=int(x[k])+20; cy=int(y[k])+20
        if h<=cx<W+40-h and h<=cy<H+40-h: 
            a=f[cy-h:cy+h+1,cx-h:cx+h+1]; np.maximum(a,s*op[k],out=a)
    out.write((f[20:-20,20:-20]*255).astype(np.uint8).tobytes())
    x+=(gust*sp+np.sin(t*1.6+ph)*.9)*(60/FPS)*.75; y+=sp*(1.9+r*.28)*(60/FPS)*.75
    x=np.where(x>W+8,-8,x); x=np.where(x<-8,W+8,x)
    j=y>H+8; y[j]=-8; x[j]=rng.uniform(0,W,j.sum())
