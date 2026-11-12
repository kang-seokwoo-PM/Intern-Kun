# SOUNDS — 음악에 쓴 악기 소리의 출처와 라이선스

v6 음악은 코드로 소리를 합성하지 않고 **진짜 악기를 녹음한 샘플**로 연주합니다. 전부 무료이고, 유료 서비스는 쓰지 않았습니다.
샘플 파일은 크기가 커서 저장소에 올리지 않습니다(`rules/03`). 아래 방법으로 받습니다.

| 쓰임 | 이름 | 만든 사람 | 라이선스 | 받는 곳 | 크기 |
|---|---|---|---|---|---|
| 피아노, 심장 소리(낮은 피아노 음) | **Salamander Grand Piano V3** (48kHz/24bit FLAC) | Alexander Holm | **CC BY 3.0** (출처 표시 필요) | GitHub `sfzinstruments/SalamanderGrandPiano` 의 `Samples/` 폴더 | 쓰는 것만 약 30개, 약 50MB |
| 현악 패드, 첼로 | **FluidR3_GM.sf2** (Fluid Release 3 General-MIDI SoundFont) | Frank Wen | **MIT** | 우분투·데비안 패키지 `fluid-soundfont-gm` (버전 3.1-5.3에서 확인) | 약 148MB |

연주(렌더) 도구:
- 피아노: `music_v6.py` 안의 작은 샘플러(샘플을 음높이에 맞춰 늘이고 줄여 겹쳐 놓음). FLAC 읽기는 ffmpeg.
- 현악: **FluidSynth** (2.3.4에서 확인)가 MIDI 악보를 FluidR3_GM으로 연주. FluidSynth가 없으면 파이썬 패키지 **tinysoundfont**로 대신 연주.

## 받는 법

```sh
# 1) 피아노 샘플 — 따로 할 일 없음. music_v6.py가 처음 돌 때 필요한 것만 samples/salamander/ 에 받아 옵니다 (curl 사용).

# 2) 현악 사운드폰트 + FluidSynth (우분투·데비안)
sudo apt-get update && sudo apt-get install -y fluid-soundfont-gm fluidsynth
#    -> /usr/share/sounds/sf2/FluidR3_GM.sf2 에 깔리고, 스크립트가 알아서 찾습니다.

# 맥·윈도우처럼 apt가 없으면: FluidR3_GM.sf2 파일을 구해 samples/FluidR3_GM.sf2 로 두거나
#   SF2=/어딘가/FluidR3_GM.sf2 python3 assemble_v6.py   처럼 위치를 알려 줍니다.   [확인 필요: 맥·윈도우에서는 돌려 보지 않음]
# FluidSynth가 없으면:  pip install --no-deps tinysoundfont
```

- FluidR3_GM.sf2가 없으면 현악 없이 **피아노만**으로 만들어지고, 경고가 뜹니다.
- 피아노 샘플을 못 받으면(네트워크 차단 등) 음악 만들기가 멈춥니다. 이때는 완성된 음악 파일을 `python3 assemble_v6.py --music 파일`로 넣으면 됩니다.

## 출처 표시 (CC BY 3.0)

Salamander Grand Piano는 **출처를 밝히는 조건**으로 무료입니다. 영상을 밖으로 내보낼 때는 자막·설명란·제출 문서 중 한 곳에 아래 한 줄을 적어 주세요. `[확인 필요: 어디에 적을지는 팀장 결정]`

> Piano: "Salamander Grand Piano V3" by Alexander Holm, licensed under CC BY 3.0 (https://creativecommons.org/licenses/by/3.0/)

FluidR3_GM(MIT)은 영상에 표시할 의무는 없고, 사운드폰트 파일을 다시 배포할 때 라이선스 글을 함께 두면 됩니다.

## 라이선스를 확인한 곳

- Salamander: 위 GitHub 저장소 README의 License 항목 ("Creative Commons Attribution 3.0 Unported License").
- FluidR3_GM: 패키지에 들어 있는 `/usr/share/doc/fluid-soundfont-gm/copyright` ("I hereby release Fluid under the MIT license").
