#!/usr/bin/env python3
# music_v6.py <total_seconds> <marks.json> <out_dir>
# The v6 score, played on REAL SAMPLED instruments (no synthesis). Sources and licences: SOUNDS.md.
#   piano     : Salamander Grand Piano V3 (Alexander Holm, CC BY 3.0) - 48k/24bit FLAC samples, played by the small sampler below.
#               Only the samples the score needs are downloaded (about 30 files, ~50MB) into samples/salamander/ on first run.
#   strings   : FluidR3_GM.sf2 (Frank Wen, MIT) - "String Ensemble 1" + "Cello", rendered from the MIDI score by FluidSynth
#               (falls back to the pip package tinysoundfont if the fluidsynth program is not installed; left out if the .sf2 is missing).
#   heartbeat : the two thumps are low Salamander piano notes (A0+A1) played soft and low-passed like a felted hammer.
# Arc: soft A minor from frame 0 -> near-silence on the breath -> ONE soft note as the 16 appears, then quiet ->
#      the bed returns gently under the label and the conclusion -> sparse A minor + two soft heartbeats on the 2.2 ->
#      warm C major at the closing (the fullest moment of the film), final chord with the event logo, fade.
# The score is also written as a standard MIDI file (score_v6.mid) so it can be opened in any music program.
# Writes: score_v6.mid, music_bed.wav (music only), heartbeat_sfx.wav (thumps only), mix.wav (both; about -16 LUFS, peak <= -2.2 dBFS).
import numpy as np, wave, sys, json, os, re, subprocess, shutil, struct, urllib.parse
HERE = os.path.dirname(os.path.abspath(__file__))
SR = 48000; DUR = float(sys.argv[1]); M = json.load(open(sys.argv[2])); OUT = sys.argv[3]; os.makedirs(OUT, exist_ok=True)
SAL_DIR = os.path.join(HERE, 'samples', 'salamander')
SAL_URL = 'https://raw.githubusercontent.com/sfzinstruments/SalamanderGrandPiano/master/Samples/'
SF2_CANDIDATES = [os.environ.get('SF2', ''), os.path.join(HERE, 'samples', 'FluidR3_GM.sf2'), '/usr/share/sounds/sf2/FluidR3_GM.sf2', '/usr/share/soundfonts/FluidR3_GM.sf2',
                  '/opt/homebrew/share/soundfonts/FluidR3_GM.sf2', '/usr/local/share/soundfonts/FluidR3_GM.sf2']
rng = np.random.default_rng(7)
NOTE = {'C': 0, 'D': 2, 'E': 4, 'F': 5, 'G': 7, 'A': 9, 'B': 11}
def midi(n):
    acc = n[1:-1]; return 12 * (int(n[-1]) + 1) + NOTE[n[0]] + (1 if acc == '#' else -1 if acc == 'b' else 0)

# ---------------------------------------------------------------- the score (times in film seconds, from the render marks)
P = []      # piano notes   [t, midi, vel 0..1]
S = []      # string chords [t, [midi..], dur, vel, attack, release, program-channel]
PED = [0.0] # sustain pedal changes (lift + re-press). A piano note rings until the next change after it starts.
def piano(t, n, v, hum=.012): P.append([max(0, t + rng.uniform(-hum, hum)), midi(n), float(np.clip(v + rng.uniform(-.035, .035), .08, 1))])
def strings(t, notes, dur, v, att, rel, ch=1): S.append([max(0, t), [midi(n) for n in notes], dur, v, att, rel, ch])
tb = M['breath0']; tf = M['fact']; th = M['fact_hit']; tc = M['closing']; tg = M['logo']
# A: cold open -> ages -> question. A minor / F / E minor, three bars fitted exactly up to the breath; ends open (unresolved).
BAR = (tb - .15) / 3; st = BAR / 8
A = [(['A2', 'E3', 'A3', 'C4', 'E4', 'C4', 'A3', 'E3'], ['A2', 'E3', 'C4'], ('E5', 'C5')),
     (['F2', 'C3', 'F3', 'A3', 'C4', 'A3', 'F3', 'C3'], ['F2', 'C3', 'A3'], ('A4', 'C5')),
     (['E2', 'B2', 'E3', 'G3', 'B3', 'G3', 'E3', None], ['E2', 'B2', 'G3'], ('B4', None))]
for b, (arp, pd, mel) in enumerate(A):
    t0 = .04 + b * BAR; PED.append(t0 - .03)
    for i, n in enumerate(arp):
        if n: piano(t0 + i * st, n, (.40 if i == 0 else .27) + .03 * b)
    strings(t0, pd, BAR - .3, .30 + .05 * b, 1.6 if b else .9, 1.2)
    piano(t0, mel[0], .40)
    if mel[1]: piano(t0 + 4 * st, mel[1], .33)
PED.append(tb - .1)                                                   # breath: pedal up, dampers down -> near silence
# B: the 16. No chord hit. One soft note as the number comes into focus, then it is left alone in the quiet.
tn = M['num']; tlb = M['lbl']; tsub = M['sub']; tmsg = M['msg']
PED.append(tn - .1)
piano(tn + .45, 'A4', .30, .004)                                                          # the single note
# the bed returns gently under the label ... (F, pianissimo, slow strings)
PED.append(tlb - .1)
strings(tlb - .2, ['F3', 'C4'], tmsg - tlb - .2, .30, 2.2, 1.2)
for i, (n, v) in enumerate((('F2', .24), ('C3', .22), ('A3', .24), ('C4', .24))): piano(tlb + i * (tsub - tlb) / 2.2, n, v)
piano(tsub + .5, 'G4', .27)
# ... and turns to G under the conclusion, still soft
PED.append(tmsg - .08)
for i, (n, v) in enumerate((('G2', .28), ('D3', .25), ('B3', .26), ('D4', .26), ('G4', .29))): piano(tmsg + i * .42, n, v)
strings(tmsg - .1, ['G2', 'D3', 'B3'], tf - tmsg - .9, .32, 1.6, 1.4)
# C: the 2.2. A minor, sparse. Its landing gets only a soft low octave; then two soft heartbeat thumps (separate stem, below).
PED.append(tf); PED.append(th - .05)
h = (tc - tf) / 8
piano(th, 'A1', .25, .004); piano(th + .01, 'A2', .24, .004); piano(th + .03, 'E3', .22)
for i, (n, v) in enumerate((('A3', .3), ('C4', .26), ('E4', .27), ('C5', .30), ('E4', .25), ('B4', .28), ('D4', .25), ('G4', .26))):
    if i in (3, 5, 6, 7): piano(tf + .1 + i * h, n, v)
strings(tf + .2, ['A2', 'E3', 'C4'], tc - tf - 1.1, .30, 1.2, 1.5)
strings(tf + .2, ['A2'], tc - tf - 1.2, .28, 1.2, 1.4, 2)
# D: closing. C major, warm; IV colour mid-way; final chord lands with the event logo and rings through the fade.
PED.append(tc); c = (tg - tc - .05) / 8
for n, v in (('C2', .5), ('C3', .52), ('G3', .44), ('E4', .44), ('G4', .42), ('E5', .5)): piano(tc + .05, n, v, .006)
for i, (n, v) in enumerate((('G3', .34), ('C4', .34), ('E4', .36), ('G5', .46), ('C4', .3), ('E5', .42), ('G4', .32), ('D5', .42))):
    if i: piano(tc + .05 + i * c, n, v)
PED.append(tc + .05 + 4 * c - .05)
for n, v in (('F2', .4), ('C3', .4), ('A3', .36)): piano(tc + .05 + 4 * c, n, v)
strings(tc, ['C3', 'G3', 'E4', 'G4'], tg - tc - .4, .5, .8, 1.0)
strings(tc, ['C2'], tg - tc - .4, .46, .8, 1.0, 2)
PED.append(tg - .05)
for n, v in (('C2', .52), ('G2', .42), ('C3', .48), ('G3', .42), ('E4', .44), ('C5', .52), ('G5', .32)): piano(tg + rng.uniform(0, .035), n, v, .004)
strings(tg, ['C3', 'G3', 'E4', 'C5'], DUR - tg - 1.2, .56, .5, 2.2)
strings(tg, ['C2'], DUR - tg - 1.2, .5, .5, 2.2, 2)
PED.append(DUR + 5)
HB = [(M['pulse1'], 1.0), (M['pulse2'], .72)]                           # lub, dub

# ---------------------------------------------------------------- write the score as a MIDI file (120 bpm, 960 ticks/beat -> 1920 ticks = 1 s)
def vlq(n):
    b = [n & 127]; n >>= 7
    while n: b.append((n & 127) | 128); n >>= 7
    return bytes(reversed(b))
def track(name, events):
    ev = sorted(events, key=lambda e: (e[0], e[1][0] & 0xF0 != 0x80)); out = b'\x00\xff\x03' + vlq(len(name)) + name.encode(); last = 0
    for t, msg in ev:
        tk = max(0, round(t * 1920)); out += vlq(tk - last) + bytes(msg); last = tk
    out += b'\x00\xff\x2f\x00'; return b'MTrk' + struct.pack('>I', len(out)) + out
def pedal_end(t): return next(p for p in PED if p > t + .05)
def piano_events():
    ev = [(0, (0xC0, 0))]
    for p in PED[:-1]: ev += [(max(0, p), (0xB0, 64, 0)), (max(0, p) + .04, (0xB0, 64, 127))]
    for t, m, v in P: ev += [(t, (0x90, m, int(20 + v * 90))), (t + .35, (0x80, m, 0))]      # short keys; the pedal holds the sound
    return ev
def string_events(only=None):
    ev = [(0, (0xC1, 48)), (0, (0xC2, 42))]
    for t, notes, dur, v, att, rel, ch in S:
        for k in range(13):                                                            # expression swell in, then out
            ev.append((t + att * k / 12, (0xB0 | ch, 11, int(127 * (.08 + .92 * (k / 12) ** 1.4)))))
            ev.append((t + dur + rel * k / 12, (0xB0 | ch, 11, int(127 * (1 - k / 12) ** 1.5))))
        for m in notes: ev += [(t, (0x90 | ch, m, int(30 + v * 70))), (t + dur + rel, (0x80 | ch, m, 0))]
    return ev
def hb_events(): return [(0, (0xC3, 0))] + [e for t, a in HB for e in ((t, (0x93, 21, int(60 * a))), (t, (0x93, 33, int(50 * a))), (t + .3, (0x83, 21, 0)), (t + .3, (0x83, 33, 0)))]
tempo = b'MTrk' + struct.pack('>I', 11) + b'\x00\xff\x51\x03\x07\xa1\x20\x00\xff\x2f\x00'
def write_mid(path, tracks): open(path, 'wb').write(b'MThd' + struct.pack('>IHHH', 6, 1, len(tracks) + 1, 960) + tempo + b''.join(tracks))
write_mid(os.path.join(OUT, 'score_v6.mid'), [track('Piano (felt, soft)', piano_events()), track('Strings + Cello', string_events()), track('Heartbeat (low piano)', hb_events())])

# ---------------------------------------------------------------- piano: Salamander sampler
LAYERS = [3, 5, 7, 9]                                 # of 16 recorded loudness layers; low ones = soft, felt-like touch
SNAMES = ['C', 'D#', 'F#', 'A']                       # Salamander is sampled every minor third
def nearest_sample(m):
    best = None
    for o in range(0, 8):
        for nm in SNAMES:
            sm = 12 * (o + 1) + {'C': 0, 'D#': 3, 'F#': 6, 'A': 9}[nm]
            if 21 <= sm <= 108 and (best is None or abs(sm - m) < abs(best[1] - m)): best = ('%s%d' % (nm, o), sm)
    return best
def layer(v): return min(LAYERS, key=lambda L: abs(L - (1 + v * 11)))
_cache = {}
def sample(name, L):
    key = '%sv%d' % (name, L)
    if key not in _cache:
        os.makedirs(SAL_DIR, exist_ok=True); f = os.path.join(SAL_DIR, key + '.flac')
        if not os.path.exists(f) or os.path.getsize(f) < 10000:
            print('  fetching Salamander sample', key, flush=True)
            subprocess.check_call(['curl', '-fsSL', '--retry', '3', '-m', '180', '-o', f, SAL_URL + urllib.parse.quote(key) + '.flac'])
        raw = subprocess.check_output(['ffmpeg', '-v', 'error', '-i', f, '-f', 'f32le', '-ac', '2', '-ar', str(SR), '-'])
        _cache[key] = np.frombuffer(raw, np.float32).reshape(-1, 2).astype(np.float64)
    return _cache[key]
def play(buf, t, m, v, end, rel=.45, maxlen=14):
    name, sm = nearest_sample(m); L = layer(v); x = sample(name, L)
    ratio = 2 ** ((m - sm) / 12); n = min(int(len(x) / ratio) - 2, int(maxlen * SR), len(buf) - int(t * SR) - 1)
    if n <= 0: return
    idx = np.arange(n) * ratio; i0 = idx.astype(int); fr = (idx - i0)[:, None]
    y = x[i0] * (1 - fr) + x[i0 + 1] * fr
    tt = np.arange(n) / SR
    env = np.minimum(1, tt / .003) * np.where(tt < end - t, 1, np.exp(-(tt - (end - t)) / (rel * (.6 if m > 60 else 1))))   # damper falls at the pedal change
    cut = np.searchsorted(tt, end - t + 6 * rel); y = y[:cut] * env[:cut, None]
    gain = (.55 + .9 * v) * (v / ((L - 1) / 11 + .08)) ** .35                 # blend between recorded layers
    buf[int(t * SR):int(t * SR) + len(y)] += y * gain
N = int(DUR * SR) + SR * 8
pn = np.zeros((N, 2))
for t, m, v in P: play(pn, t, m, v, pedal_end(t))
hbuf = np.zeros((N, 2))
for t, a in HB:
    play(hbuf, t, 21, .5, t + .12, .16); play(hbuf, t + .004, 33, .42, t + .12, .14)
    hbuf[int(t * SR) - 10:int((t + 1.4) * SR)] *= a

# ---------------------------------------------------------------- strings: FluidR3_GM through FluidSynth (or tinysoundfont)
sf2 = next((p for p in SF2_CANDIDATES if p and os.path.exists(p)), None)
sn = np.zeros((N, 2)); STR_INFO = 'none (no FluidR3_GM.sf2 found - piano only)'
if sf2:
    mid = os.path.join(OUT, '_strings.mid'); wav = os.path.join(OUT, '_strings.wav'); write_mid(mid, [track('Strings + Cello', string_events())])
    if shutil.which('fluidsynth'):
        subprocess.check_call(['fluidsynth', '-ni', '-q', '-R', '0', '-C', '0', '-g', '0.5', '-r', str(SR), '-F', wav, sf2, mid], stdout=subprocess.DEVNULL)
        w = wave.open(wav); x = np.frombuffer(w.readframes(w.getnframes()), '<i2').reshape(-1, 2) / 32768; w.close(); os.remove(wav)
        STR_INFO = 'FluidR3_GM.sf2 via fluidsynth'
    else:
        import tinysoundfont
        syn = tinysoundfont.Synth(samplerate=SR); sid = syn.sfload(sf2); syn.program_select(1, sid, 0, 48); syn.program_select(2, sid, 0, 42)
        ev = sorted(string_events(), key=lambda e: e[0]); out = []; pos = 0
        for t, msg in ev:
            k = int(t * SR) - pos
            if k > 0: out.append(np.frombuffer(syn.generate(k), np.float32).copy()); pos += k
            ch = msg[0] & 15; kind = msg[0] & 0xF0
            if kind == 0x90: syn.noteon(ch, msg[1], msg[2])
            elif kind == 0x80: syn.noteoff(ch, msg[1])
            elif kind == 0xB0: syn.control_change(ch, msg[1], msg[2])
        out.append(np.frombuffer(syn.generate(4 * SR), np.float32).copy()); x = np.concatenate(out).reshape(-1, 2).astype(np.float64) * .5
        STR_INFO = 'FluidR3_GM.sf2 via tinysoundfont'
    os.remove(mid); k = min(len(x), N); sn[:k] = x[:k]
else:
    print('WARNING: FluidR3_GM.sf2 not found - strings are left out. See the handoff note for how to get it (apt install fluid-soundfont-gm, or set SF2=/path/to/FluidR3_GM.sf2).')

# ---------------------------------------------------------------- mix: felt low-pass, reverb, gain arc, light compression, loudness
def filt(x, fc, order=2, hp=False):
    X = np.fft.rfft(x, axis=0); fr = np.fft.rfftfreq(len(x), 1 / SR)[:, None]; H = 1 / np.sqrt(1 + (fr / fc) ** (2 * order))
    return np.fft.irfft(X * (np.sqrt(1 - H ** 2) if hp else H), len(x), axis=0)
def verb(x, seed, secs=2.8, decay=2.1, fc=4200):
    r = np.random.default_rng(seed); n = int(secs * SR); ir = r.standard_normal((n, 2)) * np.exp(-np.arange(n) / SR * decay)[:, None]; ir[:int(.015 * SR)] = 0
    ir = filt(ir, fc); ir /= np.sqrt((ir ** 2).sum(0)); m = 1 << (len(x) + n - 1).bit_length()
    return np.fft.irfft(np.fft.rfft(x, m, axis=0) * np.fft.rfft(ir, m, axis=0), m, axis=0)[:len(x)]
pn = .72 * filt(pn, 3400) + .28 * filt(pn, 9000)                                  # felt: soften the hammer brightness, keep a little air
sn = filt(filt(sn, 2600), 110, hp=True)                                           # strings: dark, far back ...
rms = lambda x: np.sqrt((x[:int(DUR * SR)] ** 2).mean()) + 1e-12
if sf2: sn *= rms(pn) / rms(sn) * 10 ** (-9 / 20)                                 # ... and always 9 dB under the piano, whichever renderer played them
dry = pn + sn; bed = dry + .30 * verb(dry, 1)
print('levels before mix: piano rms %.1f dB, strings rms %.1f dB' % tuple(20 * np.log10(np.sqrt((x[:int(DUR * SR)] ** 2).mean()) + 1e-9) for x in (pn, sn)))
hb = filt(hbuf, 150, 3) * 1.0 + filt(hbuf, 420) * .22; hb = hb + .08 * verb(hb, 3, 1.2, 4.5, 600)   # felted low thump
t = np.arange(N) / SR
def ramp(a, b): return np.clip((t - a) / (b - a), 0, 1)
sm = lambda x: x * x * (3 - 2 * x)
gcv = .8 + .2 * sm(ramp(0, .4))                                                    # present from the first frame
gcv *= 1 + .5 * (1 - sm(ramp(tb - .4, tb + .1)))                                   # opening bed a touch forward
gcv *= 1 - .96 * sm(ramp(tb - .2, tb + .25)) * (1 - sm(ramp(tn + .2, tn + .5)))        # near-silent breath; opens just before the single note
gcv *= 1 - .22 * sm(ramp(tn, tn + .4)) * (1 - sm(ramp(tc - .5, tc + 1.2)))             # the 16 and the 2.2 stay under the opening and the closing
for tp, _ in HB: gcv *= 1 - .3 * sm(ramp(tp - .08, tp)) * (1 - sm(ramp(tp + .15, tp + .45)))   # bed dips under each thump
gcv *= 1 - sm(ramp(M['fade_out'], DUR - .03))
n = int(DUR * SR); bed = (bed * gcv[:, None])[:n]; hb = hb[:n]
def envelope(x, att, rel, blk=64):                                                 # peak follower, in blocks of 64 samples
    pk = np.maximum.reduceat(np.abs(x).max(1), np.arange(0, len(x), blk)); eb = np.empty_like(pk); e = 0
    a = np.exp(-blk / (att * SR)) if att else 0; r = np.exp(-blk / (rel * SR))
    for i, p in enumerate(pk): e = a * e + (1 - a) * p if p > e else r * e + (1 - r) * p; eb[i] = e
    return np.repeat(eb, blk)[:len(x)]
def compress(x, thr_db=-22, ratio=2.5):                                             # light: evens out the soft notes against the big chords
    db = 20 * np.log10(np.maximum(envelope(x, .010, .30), 1e-6)); gr = np.where(db > thr_db, (thr_db - db) * (1 - 1 / ratio), 0)
    return x * (10 ** (gr / 20))[:, None]
def limiter_gain(x, ceil):                                                         # look-ahead peak limiter (5 ms ahead, 120 ms release)
    env = envelope(x, 0, .12); env = np.concatenate([env[240:], env[-240:]]); env = np.maximum(env, np.concatenate([env[:1].repeat(240), env[:-240]]))
    return np.minimum(1, ceil / np.maximum(env, 1e-9))
bed /= np.abs(bed).max(); bed = compress(bed)
hb *= .30 * np.abs(bed).max() / np.abs(hb).max()                                   # soft: thumps peak at 30% of the loudest music moment
def save(name, x):
    w = wave.open(os.path.join(OUT, name + '.wav'), 'wb'); w.setnchannels(2); w.setsampwidth(2); w.setframerate(SR); w.writeframes((np.clip(x, -1, 1) * 32767).astype('<i2').tobytes()); w.close()
def lufs(path):
    o = subprocess.run(['ffmpeg', '-hide_banner', '-nostats', '-i', path, '-af', 'ebur128', '-f', 'null', '-'], capture_output=True, text=True).stderr
    return float(re.findall(r'I:\s+(-?[\d.]+) LUFS', o)[-1])
TARGET, CEIL = -16.0, 10 ** (-2.2 / 20)                                            # -16 LUFS; sample peak <= -2.2 dBFS (leaves room for AAC overshoot)
k = 1.0
for _ in range(6):
    lg = limiter_gain((bed + hb) * k, CEIL)[:, None]; mix = (bed + hb) * k * lg
    save('mix', mix); L = lufs(os.path.join(OUT, 'mix.wav'))
    if abs(L - TARGET) < .12: break
    k *= 10 ** ((TARGET - L) / 20)
save('music_bed', bed * k * lg); save('heartbeat_sfx', hb * k * lg)                # stems carry the same limiter gain, so bed + sfx = mix
print('limiter: max gain reduction %.1f dB, active %.1f%% of the time' % (-20 * np.log10(lg.min()), 100 * (lg < .999).mean()))
print('music ok (sampled): piano = Salamander Grand Piano V3 (%d samples), strings = %s, %.1f LUFS, peak %.1f dBFS' % (len(_cache), STR_INFO, L, 20 * np.log10(np.abs(mix).max())))
