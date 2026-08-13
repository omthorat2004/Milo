---
name: three-js-scenes
description: Conventions for building and debugging Three.js / react-three-fiber scenes in Milo. Use when writing or changing anything under components/three, any *-scene.tsx file, scroll-driven animation, instanced meshes, canvas textures, or when a scene renders blank, is dim, mis-layered, or trips React Compiler lint rules.
---

# Three.js scenes in Milo

Hard-won rules from the landing story scene and the frontend raw-story scene. Every item here cost a
debugging cycle at least once. Read before writing scene code.

## Non-negotiables

**Never render text as 3D geometry.** All copy lives in HTML overlaid on the canvas. It stays
selectable, translatable, indexable and screen-reader accessible. The scene carries mood and
mechanism, never words.

**Green means a recorded signal.** `palette.signal` is reserved for something Milo actually
measured: an open, a download, a tracked item. Never use it as decoration. Sand and clay carry
paper, light and everything else.

**Three fallbacks before a frame is drawn.** Reduced-motion preference, no WebGL, and off-screen.
The first two render a static composition, the third sets `frameloop="never"`. A scene that ignores
`prefers-reduced-motion` is a bug.

## React Compiler lint rules

Next 16 ships React Compiler lint rules that reject ordinary imperative Three.js patterns. These are
the three that will bite:

**Seeded RNG must live at module scope.** A `let seed` reassigned inside `useMemo` fails with
"Cannot reassign variable after render completes". Extract a `createSeededRandom(seed)` factory
outside the component. See `packages/landing/lib/three/random.ts`.

**Read the camera off frame state, not `useThree()`.** `const { camera } = useThree()` then mutating
`camera.position` fails with "This value cannot be modified". Use `useFrame((state) => { const
{ camera } = state; ... })` instead.

**Refs you mutate must be named `*Ref`.** A ref written across components (for example a download
flash shared between two scene objects) must end in `Ref` or the immutability rule rejects it.

**Never `setState` synchronously in an effect body.** For media queries and capability probes use
`useSyncExternalStore`. See `hooks/use-media-query.ts` and `hooks/use-webgl-support.ts`.

## Animation driven by scroll

Scroll progress lives in a **ref**, never state. A state update per scroll event re-renders the tree
at 60fps. Only the coarse act index is state, because HTML copy needs it, and that changes about
five times across a whole section.

The pattern is in `components/three/story-progress.tsx`: a rAF-throttled scroll listener writes
`progress.current`, and `useFrame` reads it. Derive every camera move and object state from that one
number so the story scrubs correctly in both directions.

Act windows live in `lib/three/timeline.ts` with helpers `span`, `smoothstep`, `mix`, `actProgress`.
Overlap adjacent windows slightly so acts cross-fade instead of snapping.

**Pass the progress ref as a prop into the canvas.** Do not rely on React context crossing the R3F
reconciler boundary.

## Framerate independence

Use `damp(current, target, smoothing, delta)` from `lib/utils.ts`, not `lerp` with a fixed alpha.
A fixed alpha moves faster on a 144Hz display than on a 60Hz one.

## Layering and transparency

Transparent materials do not sort reliably. When one object must sit behind another:

- Separate them in **z** by a real distance, not 0.01.
- Compensate the perspective shrink with a scale factor. `viewer-chrome.tsx` sits at `z = -1.3` and
  scales by `1.26` to cancel it.
- Set `depthWrite={false}` on additive or glow-like overlays.

A symptom worth recognising: a semi-transparent dark panel appearing to *tint* the object in front
of it means that object is actually behind it mid-transition. Check the animated z, not just the
resting z.

## Performance

- One `<Canvas>` per page. Never two.
- `dpr={[1, 1.75]}` and `frameloop={inView ? "always" : "never"}`.
- Repeated geometry goes in a single `InstancedMesh` with `frustumCulled={false}`, updating
  `instanceMatrix.needsUpdate` once per frame. Eighteen scattered pages is one draw call.
- Prefer `meshBasicMaterial` for glows and rings. It needs no lighting and no postprocessing, which
  avoids pulling in a bloom pass.
- Dispose canvas textures in a `useEffect` cleanup. They are not garbage collected with the mesh.

## Canvas textures

Documents and UI chrome are drawn to a 2D canvas and used as a `CanvasTexture`
(`lib/three/resume-texture.ts`, `lib/three/viewer-texture.ts`). Set `colorSpace = SRGBColorSpace`
and `anisotropy = 8` or the result looks washed out and aliased.

Draw headings and names as real text; render body copy as abstract rules. Real paragraphs are
illegible at scene scale. All sample content must be obviously fictional, `example.com` only.

## Lighting

Ambient around `0.95` with a key light around `1.9`. Earlier values of `0.5` and `2.6` made the paper
read orange rather than warm. If a white-ish surface looks tan, lower the key and raise ambient
before touching material colours.

## Debugging a blank scene

Check in this order:

1. `document.hidden` and whether rAF is firing. A backgrounded tab suspends rAF entirely, which
   freezes the scroll handler, CSS transitions and the R3F loop at once. Verify with a frame counter
   before assuming the code is wrong.
2. `frameloop` stuck on `"never"` because the IntersectionObserver never fired.
3. Objects at `visible={false}` because their act presence value is still 0.
4. Tailwind not generating classes for a shared package: each app's entry CSS needs an explicit
   `@source` pointing at `packages/ui/src`.

## Known upstream noise

`THREE.Clock: This module has been deprecated` comes from inside `@react-three/fiber`, which still
constructs a `Clock`. Our code only reads `state.clock.elapsedTime`. Nothing to fix locally.
