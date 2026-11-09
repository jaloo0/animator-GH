"""Word timings for the narration with local Whisper (faster-whisper small.en) → data/words.json.

  scripts/py scripts/words.py <project>                      data/narration.wav + the script → data/words.json
  scripts/py scripts/words.py <project> --audio my_voice.m4a  use your own recording (becomes data/narration.wav)

data/words.json = [{"w": "phone", "s": 2.31, "e": 2.6}, …] — what the shots' w()/wt() look up. The words keep the
SCRIPT's spelling (script.json lines or script.txt), with the times Whisper heard; words it heard differently
("1919" vs "nineteen nineteen") share the heard span by length, words it missed share the gap between neighbours.
Also writes data/words.txt (one word per line) to eyeball the timing.

Stickman projects (data/lines.json from their tools/voice.py): every word of every spoken line, in order, as
[{"i", "w", "line", "s", "e"}, …] (what the stickman wd(line, k) looks up), each line's words kept inside that
line's exact TTS start/end. Word starts get +0.06 s (Whisper's starts run ~0.08 s early; measured on the stickman
example against wav2vec2 forced alignment: median error 95 → 48 ms).
"""
import argparse, json, re, subprocess, sys
from difflib import SequenceMatcher
from pathlib import Path

norm = lambda w: re.sub(r'[^a-z0-9]+', '', w.lower())


def line_words(P):
    """stickman: data/lines.json → every whitespace token of every spoken line, tagged with its line index"""
    f = P / 'data/lines.json'
    if not f.exists(): return None, None
    L = [l for l in json.loads(f.read_text())['lines'] if l.get('who') != 'beat' and l.get('text')]
    return [(w, l['i']) for l in L for w in l['text'].split()], {l['i']: (l['start'], l['end']) for l in L}


def script_words(P):
    if (P / 'script.json').exists():
        text = ' '.join(l['text'] for l in json.loads((P / 'script.json').read_text())['lines'])
    elif (P / 'script.txt').exists():
        text = re.sub(r'^\s*#.*$', '', (P / 'script.txt').read_text(), flags=re.M)
    else:
        return None
    return [w for w in text.split() if norm(w)]


def fill(times, n, dur, floor=None):
    """words with no time share the gap between their timed neighbours (floor[i] = earliest start allowed)"""
    i = 0
    while i < n:
        if times[i] is None:
            j = i
            while j < n and times[j] is None: j += 1
            t0 = times[i - 1][1] if i > 0 else 0.0
            if floor: t0 = max(t0, floor[i])
            t1 = times[j][0] if j < n else dur
            t1 = max(t1, t0)
            for k in range(j - i):
                times[i + k] = (round(t0 + (t1 - t0) * k / (j - i), 3), round(t0 + (t1 - t0) * (k + 1) / (j - i), 3))
            i = j
        else:
            i += 1


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('project')
    ap.add_argument('--audio', help='your own narration file (any format) → data/narration.wav')
    ap.add_argument('--no-script', action='store_true', help="use Whisper's own words (unscripted recording)")
    ap.add_argument('--model', default='small.en', help='base.en is faster, medium.en more exact')
    a = ap.parse_args()
    P = Path(a.project); (P / 'data').mkdir(parents=True, exist_ok=True)
    wav = P / 'data/narration.wav'
    if a.audio:
        subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', a.audio, '-ac', '2', '-ar', '48000', '-c:a', 'pcm_s16le', str(wav)], check=True)
    if not wav.exists():
        sys.exit(f'missing {wav} (make it with voice.py, or pass --audio <file>)')
    dur = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', str(wav)], capture_output=True, text=True).stdout.strip())

    from faster_whisper import WhisperModel
    print(f'listening with Whisper {a.model}…', flush=True)
    m = WhisperModel(a.model, device='cpu', compute_type='int8')
    segs, _ = m.transcribe(str(wav), language='en', word_timestamps=True, beam_size=5, vad_filter=False, condition_on_previous_text=False)
    heard = [{'w': w.word.strip(), 's': round(w.start, 3), 'e': round(w.end, 3)} for s in segs for w in (s.words or []) if norm(w.word)]
    if not heard:
        sys.exit('Whisper heard no words — is the narration silent?')

    tagged, spans = (None, None) if a.no_script else line_words(P)
    if tagged:                       # stickman: keep every token (punctuation-only ones get a zero-length time)
        sw = [w for w, _ in tagged if norm(w)]
    else:
        sw = None if a.no_script else script_words(P)
    if not sw:
        words = heard
    else:
        A, B = [norm(w) for w in sw], [norm(w['w']) for w in heard]
        times = [None] * len(sw)
        ops = SequenceMatcher(None, A, B, autojunk=False).get_opcodes()
        for tag, i1, i2, j1, j2 in ops:
            if tag == 'equal':
                for k in range(i2 - i1): times[i1 + k] = (heard[j1 + k]['s'], heard[j1 + k]['e'])
            elif tag == 'replace':
                t0, t1 = heard[j1]['s'], heard[j2 - 1]['e']
                L = [max(1, len(A[i])) for i in range(i1, i2)]; tot = sum(L); c = 0
                for k, n in enumerate(L):
                    times[i1 + k] = (round(t0 + (t1 - t0) * c / tot, 3), round(t0 + (t1 - t0) * (c + n) / tot, 3)); c += n
        if tagged and spans and not a.audio:   # a word Whisper put outside its own line's TTS window → re-spread it
            lines_of = [li for w, li in tagged if norm(w)]
            for k, li in enumerate(lines_of):
                s0, s1 = spans[li]
                if times[k] and (times[k][0] < s0 - 0.12 or times[k][1] > s1 + 0.12): times[k] = None
        fill(times, len(sw), dur, [spans[li][0] for w, li in tagged if norm(w)] if tagged and spans and not a.audio else None)
        words = [{'w': w, 's': s, 'e': e} for w, (s, e) in zip(sw, times)]
        exact = sum(i2 - i1 for tag, i1, i2, *_ in ops if tag == 'equal')
        print(f'{len(sw)} script words, {len(heard)} heard, {exact} matched exactly')
        if tagged:                   # back to every token of every line, in order
            it = iter(words); out = []
            for w, li in tagged:
                if norm(w):
                    x = next(it); s0 = x['s']
                    if x['e'] - s0 > 0.09: s0 = round(s0 + 0.06, 3)   # Whisper starts run ~0.08 s early vs a forced aligner
                    out.append({'i': len(out), 'w': w, 'line': li, 's': s0, 'e': x['e']})
                else:
                    prev = out[-1]['e'] if out else spans[li][0]
                    out.append({'i': len(out), 'w': w, 'line': li, 's': prev, 'e': prev})
            words = out

    (P / 'data/words.json').write_text(json.dumps(words, indent=0))
    (P / 'data/words.txt').write_text('\n'.join(f"{w['s']:7.2f} {w['e']:7.2f}  {w['w']}" for w in words) + '\n')
    print(f"{P / 'data/words.json'}  {len(words)} words, narration {dur:.1f}s")


if __name__ == '__main__':
    main()
