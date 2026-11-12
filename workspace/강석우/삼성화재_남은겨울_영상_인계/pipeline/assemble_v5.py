#!/usr/bin/env python3
# assemble_v5.py [--music real_track.wav]
# Joins the rendered scenes (work/frames_v5) with short cross-fades, lays one continuous snowfall over everything from frame 0,
# builds the audio and writes out/samsung_winters_16x9_v5.mp4 (+ a no-audio copy and the audio parts in out/audio/).
# --music FILE : use a real track instead of the generated bed. The two heartbeat thumps are still mixed in on top.
import json, subprocess, os, sys, argparse
ap = argparse.ArgumentParser(); ap.add_argument('--music'); ap.add_argument('--music-gain', type=float, default=1.0); a = ap.parse_args()
real = os.path.abspath(a.music) if a.music else None
os.chdir(os.path.dirname(os.path.abspath(__file__)))
F = 'work/frames_v5'; OUT = 'out'; AUD = OUT + '/audio'; os.makedirs(AUD, exist_ok=True)
m = json.load(open(F + '/marks.json')); d = m['dur']; T = m['T']
names = ['1_intro', '2_input', '3_bridge', '4_fact', '5_closing']; xf = [0.3, 0.4, 0.4, 0.5]     # cross-fade lengths between scenes
st = [0.0]
for i in range(4): st.append(round(st[i] + d[names[i]] - xf[i], 4))
total = round(st[4] + d[names[4]], 4); FO = m['FADE']
r = lambda x: round(x, 3)
marks = dict(ages=r(st[1]), question=r(st[1] + m['G']), guess_pick=r(st[1] + m['PICK']), breath0=r(st[2] + xf[1] * .5), reveal=r(st[2] + T['reveal']), land=r(st[2] + T['land']),
             fact=r(st[3] + .1), fact_hit=r(st[3] + T['fact_hit']), pulse1=r(st[3] + T['pulse1']), pulse2=r(st[3] + T['pulse2']),
             closing=r(st[4] + .1), press=r(st[4] + T['press']), release=r(st[4] + T['release']), endcard=r(st[4] + T['end0']), logo=r(st[4] + T['logo']), fade_out=r(total - 1.6))
json.dump(dict(fps=30, starts=st, total=total, xf=xf, final_fade=FO, marks=marks), open(OUT + '/timeline_v5.json', 'w'), indent=1)
print('scene starts', st, 'total', total); print(marks)
json.dump(marks, open(F + '/timeline_marks.json', 'w'))
subprocess.check_call([sys.executable, 'music_v5.py', str(total), F + '/timeline_marks.json', AUD])
audio = AUD + '/mix.wav'
if real:   # real track (trimmed to length, faded out with the picture) + heartbeat thumps
    audio = AUD + '/mix_real_track.wav'
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', real, '-i', AUD + '/heartbeat_sfx.wav', '-filter_complex',
        f'[0:a]aresample=48000,atrim=0:{total},volume={a.music_gain},afade=t=out:st={total-1.6}:d=1.6[m];[m][1:a]amix=inputs=2:duration=first:normalize=0[a]', '-map', '[a]', '-t', str(total), audio])
snow = subprocess.Popen([sys.executable, 'snow_v5.py', str(total)], stdout=subprocess.PIPE)
fc = ''.join(f'[{i}:v]scale=1920:1080:flags=lanczos,setsar=1[v{i}];' for i in range(5))
cur = 'v0'
for i in range(4):
    fc += f'[{cur}][v{i+1}]xfade=transition=fade:duration={xf[i]}:offset={st[i+1]}[x{i}];'; cur = f'x{i}'
fc += f'[{cur}]format=gbrp[base];[5:v]format=gbrp[sn];[base][sn]blend=all_mode=screen:all_opacity=0.95,fade=t=out:st={total-FO}:d={FO},format=yuv420p[v]'
final = OUT + '/samsung_winters_16x9_v5.mp4'
cmd = ['ffmpeg', '-v', 'error', '-y']
for n in names: cmd += ['-framerate', '30', '-i', f'{F}/{n}/%05d.jpg']
cmd += ['-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '1920x1080', '-framerate', '30', '-i', 'pipe:0', '-i', audio,
        '-filter_complex', fc, '-map', '[v]', '-map', '6:a', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'slow', '-crf', '18', '-r', '30',
        '-c:a', 'aac', '-b:a', '192k', '-t', str(total), '-movflags', '+faststart', final]
subprocess.check_call(cmd, stdin=snow.stdout)
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', final, '-an', '-c:v', 'copy', '-movflags', '+faststart', OUT + '/samsung_winters_16x9_v5_noaudio.mp4'])
print('done ->', final)
