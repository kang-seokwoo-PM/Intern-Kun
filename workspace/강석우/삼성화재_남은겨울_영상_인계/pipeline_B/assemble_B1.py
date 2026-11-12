#!/usr/bin/env python3
# assemble_B1.py [--music real_track.wav]
# Lays one continuous snowfall (../pipeline/snow_v6.py, same as the v6 film) over the rendered frames (work/frames_B1), builds the audio (music_B1.py)
# and writes out/samsung_winters_16x9_B1.mp4 (+ a no-audio copy, the audio parts in out/audio/, and out/timeline_B1.json).
# --music FILE : use a real track instead of the generated one. The two heartbeat thumps are still mixed in on top.
import json, subprocess, os, sys, argparse
ap = argparse.ArgumentParser(); ap.add_argument('--music'); ap.add_argument('--music-gain', type=float, default=1.0); a = ap.parse_args()
real = os.path.abspath(a.music) if a.music else None
os.chdir(os.path.dirname(os.path.abspath(__file__)))
F = 'work/frames_B1'; OUT = 'out'; AUD = OUT + '/audio'; os.makedirs(AUD, exist_ok=True)
m = json.load(open(F + '/marks.json')); T = m['T']; total = T['total']
marks = dict(age=T['age'][0], question=T['q'], guess=[g[1] for g in T['guess']], settle=T['settle'], breath0=T['breath'][0], num=T['n16'][0], lbl16=T['lbl16'], now=T['now'],
             lbl96=T['lbl96'], basis=T['basis'], fact=T['fact'], fact_hit=T['factHit'], pulse1=T['pulse1'], pulse2=T['pulse2'],
             closing_chord=round(T['closing'] + .3, 3), logo=T['logo'], fade_out=round(total - 1.6, 3))
json.dump(dict(fps=30, total=total, final_fade=T['fade'], T=T, music_marks=marks, onscreen=m['onscreen']), open(OUT + '/timeline_B1.json', 'w', encoding='utf-8'), ensure_ascii=False, indent=1)
json.dump(marks, open(F + '/music_marks.json', 'w'))
try: subprocess.check_call([sys.executable, 'music_B1.py', str(total), F + '/music_marks.json', AUD])
except Exception as e: sys.exit('\nMUSIC FAILED (%s).\nMost likely the piano samples could not be downloaded - see ../pipeline/SOUNDS.md. Or pass a finished track: python3 assemble_B1.py --music track.wav' % e)
audio = AUD + '/mix.wav'
if real:
    audio = AUD + '/mix_real_track.wav'
    subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', real, '-i', AUD + '/heartbeat_sfx.wav', '-filter_complex',
        f'[0:a]aresample=48000,atrim=0:{total},volume={a.music_gain},afade=t=out:st={total-1.6}:d=1.6[m];[m][1:a]amix=inputs=2:duration=first:normalize=0[a]', '-map', '[a]', '-t', str(total), audio])
snow = subprocess.Popen([sys.executable, '../pipeline/snow_v6.py', str(total)], stdout=subprocess.PIPE)
# the picture already fades to dark by itself at the end (film_B1.js); the snow is faded with it here
fc = (f'[0:v]scale=1920:1080:flags=lanczos,setsar=1,format=gbrp[base];[1:v]fade=t=out:st={total - T["fade"]}:d={T["fade"]},format=gbrp[sn];'
      '[base][sn]blend=all_mode=screen:all_opacity=0.95,format=yuv420p[v]')
final = OUT + '/samsung_winters_16x9_B1.mp4'
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-framerate', '30', '-i', F + '/%05d.jpg', '-f', 'rawvideo', '-pix_fmt', 'gray', '-s', '1920x1080', '-framerate', '30', '-i', 'pipe:0', '-i', audio,
    '-filter_complex', fc, '-map', '[v]', '-map', '2:a', '-c:v', 'libx264', '-profile:v', 'high', '-level', '4.1', '-preset', 'slow', '-crf', '18', '-r', '30', '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '192k', '-t', str(total), '-movflags', '+faststart', final], stdin=snow.stdout)
subprocess.check_call(['ffmpeg', '-v', 'error', '-y', '-i', final, '-an', '-c:v', 'copy', '-movflags', '+faststart', OUT + '/samsung_winters_16x9_B1_noaudio.mp4'])
print('done ->', final)
