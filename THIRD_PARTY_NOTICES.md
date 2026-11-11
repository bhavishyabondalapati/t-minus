# Third-party notices

T-Minus's own code is MIT licensed (see `LICENSE`). The items below belong to other people and
keep their own licenses.

## ThreeUI Community (`@designcodeio/threeui`)

Scenes and controls by Meng To, https://github.com/MengTo/threeui, MIT License.

- The components are installed from npm and are not copied into this repository.
- `public/landscape.html` is a copy of the package's `lib-dist/assets/landscape.html`, served
  from this site's own origin. It includes the scene's image textures, which the package's
  `ASSET-LICENSES.md` lists as part of its MIT-licensed release ("ThreeUI-authored images,
  textures, and other scene assets").
- **Modification:** the music and sound clips embedded in the original file were removed from the
  copy, because the package's asset notice does not name audio explicitly. The scene is silent
  here. Nothing else in the file was changed.

```
MIT License

Copyright (c) 2026 Meng To

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

## Three.js

`public/landscape.html` bundles the Three.js runtime (Copyright 2010-2023 Three.js Authors,
MIT License, https://github.com/mrdoob/three.js). Its license header is kept in the file.

## Fonts

Instrument Serif, Fragment Mono and Onest are loaded from Google Fonts under the SIL Open Font
License 1.1. No font files are stored in this repository.

## Data

Arrival predictions and alerts come from the MBTA V3 API, and forecasts from the National Weather
Service API. They are fetched at run time and are not redistributed here. This project is not
affiliated with the MBTA.
