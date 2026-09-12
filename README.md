# Haven — White Noise Generator

A browser app for sleep, focus, and rain-on-the-window hours.

Noise and weather are **synthesized in the tab** with the Web Audio API (no audio files). Layer that under public **meditation / relaxation radio** streams, or paste your own `.m3u` / stream URL.

**Repo:** https://github.com/tbenitz/white-noise-generator  
**App (after Pages is live):** https://tbenitz.github.io/white-noise-generator/

## Run it

No build, no install.

```bash
git clone https://github.com/tbenitz/white-noise-generator.git
cd white-noise-generator
```

Open `index.html` in a browser (`app.js` must sit next to it).

Or use GitHub Pages. This repo includes a Pages deploy workflow on `main`. If the first run needs approval, open **Settings → Pages** and allow GitHub Actions as the source.

Browsers require a click (or spacebar) before audio starts.

## What it does

### Local generator (works offline after the page loads)

| Layer | What you hear |
| --- | --- |
| White / pink / brown noise | Classic masking noise |
| Rainfall | Filtered hiss plus drop bursts |
| Distant thunder | Occasional low rumbles |
| Ocean swell | Slow-modulated brown noise |
| Wind | Moving bandpass on pink noise |
| Hearth | Soft bed + crackle pops |
| Night air | Sparse high chirps |

Presets: Focus hiss, Soft rain, Storm window, Coast, Cabin, Deep sleep.

Also: master volume, mix sliders, sleep timer with fade (15 / 30 / 60 / 90 min), spacebar play/pause.

### Radio

Preset HTTPS streams from SomaFM, RadioArt, and Positivity Radio. Mix them with the generator. Paste any direct MP3/AAC URL or an `.m3u` / `.m3u8` playlist. Download an `.m3u` of the built-in stations for VLC.

Streams belong to those stations and can move or drop. If one fails, try another.

## Files

```
index.html                    # UI + styles
app.js                        # Web Audio generator + radio player
.github/workflows/pages.yml   # GitHub Pages deploy
LICENSE                       # MIT
```

## License

MIT. Radio streams remain the property of their broadcasters — support them if you listen often.
