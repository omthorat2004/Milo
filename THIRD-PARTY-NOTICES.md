# Third-Party Notices

Milo itself is licensed under the Elastic License 2.0. See [LICENSE](LICENSE).

Milo is built with third-party open source software. Portions of these packages are included in
Milo's distributed output, including the JavaScript served to browsers. Their licenses require that
their copyright and permission notices be retained, so they are reproduced here.

The copyright lines below are taken verbatim from each package's own license file. Nothing in this
document alters the terms of any listed license, and nothing here applies Milo's own license to
these components.

## Runtime dependencies

| Package | License | Copyright |
| --- | --- | --- |
| [next](https://github.com/vercel/next.js) | MIT | Copyright (c) 2025 Vercel, Inc. |
| [react](https://github.com/facebook/react) | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| [react-dom](https://github.com/facebook/react) | MIT | Copyright (c) Meta Platforms, Inc. and affiliates. |
| [three](https://github.com/mrdoob/three.js) | MIT | Copyright © 2010-2026 three.js authors |
| [@react-three/fiber](https://github.com/pmndrs/react-three-fiber) | MIT | No copyright notice distributed with the package |
| [zod](https://github.com/colinhacks/zod) | MIT | Copyright (c) 2025 Colin McDonnell |
| [clsx](https://github.com/lukeed/clsx) | MIT | Copyright (c) Luke Edwards \<luke.edwards05@gmail.com\> (lukeed.com) |
| [tailwind-merge](https://github.com/dcastil/tailwind-merge) | MIT | Copyright (c) 2021 Dany Castillo |
| [server-only](https://github.com/vercel/next.js) | MIT | No copyright notice distributed with the package |
| [lucide-react](https://github.com/lucide-icons/lucide) | ISC | Copyright (c) for portions of Lucide are held by Cole Bemis 2013-2023 as part of Feather (MIT). All other copyright (c) for Lucide are held by Lucide Contributors 2025. |
| [mongodb](https://github.com/mongodb/node-mongodb-native) | Apache-2.0 | Copyright (c) MongoDB, Inc. |

### MIT License

The MIT-licensed packages above are distributed under the following terms:

```
Permission is hereby granted, free of charge, to any person obtaining a copy of this software and
associated documentation files (the "Software"), to deal in the Software without restriction,
including without limitation the rights to use, copy, modify, merge, publish, distribute,
sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or
substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT
NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND
NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM,
DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT
OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
```

### ISC License

`lucide-react` is dual-noticed. Its license file carries the ISC terms below for Lucide itself,
plus a separate MIT notice covering the portions derived from Feather:

> The MIT License (MIT) (for portions derived from Feather)
>
> Copyright (c) 2013-2023 Cole Bemis

Those Feather-derived portions are covered by the MIT terms already reproduced above. The ISC terms
applying to Lucide are:

```
Permission to use, copy, modify, and/or distribute this software for any purpose with or without
fee is hereby granted, provided that the above copyright notice and this permission notice appear
in all copies.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH REGARD TO THIS
SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS. IN NO EVENT SHALL THE
AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT, INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES
WHATSOEVER RESULTING FROM LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT,
NEGLIGENCE OR OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR PERFORMANCE OF
THIS SOFTWARE.
```

### Apache License 2.0

`mongodb` is licensed under the Apache License, Version 2.0. The full text is available at
<https://www.apache.org/licenses/LICENSE-2.0> and in `node_modules/mongodb/LICENSE.md`. The package
does not ship a NOTICE file, so there is no NOTICE content to propagate under section 4(d).

## Build-time tooling

The following are used to build Milo but are not redistributed as part of its output, so no notice
is required. They are listed for completeness:

- `tailwindcss`, `typescript`, `eslint`, `prettier` and their dependencies (MIT)
- `lightningcss` (MPL-2.0) — file-level copyleft, applying only to modifications of that project
- `caniuse-lite` (CC-BY-4.0) — browser support data consumed at build time
- `@img/sharp-*` (LGPL-3.0-or-later) — Next.js image optimization, invoked as a separate native
  library rather than statically linked

## Originally authored components

`components/ui/slot.tsx` is an original implementation of the common `asChild` prop-merging
pattern. It is not derived from, and contains no code copied from, `@radix-ui/react-slot` or any
other package.
