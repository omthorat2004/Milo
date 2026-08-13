"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { useMemo, useRef } from "react";
import * as THREE from "three";

import { usePrefersReducedMotion } from "@/hooks/use-media-query";

const CARD_COUNT = 54;
const FALL_TOP = 8;
const FALL_BOTTOM = -8;

/** Seconds for one full catch cycle: rise, hold, pulse, release. */
const CATCH_CYCLE = 9;

const PAPER = "#e6d8c4";
const PAPER_DIM = "#6d6455";
const SIGNAL = "#3fcf8e";

/**
 * Seeded generator, defined at module scope.
 *
 * Keeping the mutable counter out of the component body satisfies the React
 * Compiler rule against reassigning captured variables during render, and makes
 * the layout identical on every load.
 */
function createSeededRandom(seed: number): () => number {
  let state = seed >>> 0;
  return () => {
    state = (Math.imul(state, 1664525) + 1013904223) >>> 0;
    return state / 4294967296;
  };
}

function smoothstep(t: number): number {
  const x = Math.min(Math.max(t, 0), 1);
  return x * x * (3 - 2 * x);
}

type Card = {
  x: number;
  z: number;
  speed: number;
  offset: number;
  spin: number;
  tilt: number;
};

/**
 * The applications, falling into the dark.
 *
 * Every plane is one resume sent. They drift down past the viewer, dimming as
 * they go, and vanish. Depth drives both scale and brightness, so the field
 * reads as a volume rather than a flat sheet of rectangles.
 */
function FallingApplications({ cards }: { cards: readonly Card[] }) {
  const mesh = useRef<THREE.InstancedMesh>(null);
  const dummy = useMemo(() => new THREE.Object3D(), []);
  const tint = useMemo(() => new THREE.Color(), []);
  const near = useMemo(() => new THREE.Color(PAPER), []);
  const far = useMemo(() => new THREE.Color(PAPER_DIM), []);

  useFrame((state) => {
    const node = mesh.current;
    if (!node) return;

    const time = state.clock.elapsedTime;
    const span = FALL_TOP - FALL_BOTTOM;

    cards.forEach((card, index) => {
      // Wrap rather than respawn, so the field never thins out.
      const travelled = (card.offset + time * card.speed) % span;
      const y = FALL_TOP - travelled;

      dummy.position.set(card.x, y, card.z);
      dummy.rotation.set(card.tilt, time * card.spin * 0.3, card.spin * 0.7);
      // Distant cards are smaller and dimmer: cheap depth without a fog pass.
      const depth = smoothstep((card.z + 10) / 12);
      dummy.scale.setScalar(0.34 + depth * 0.4);
      dummy.updateMatrix();
      node.setMatrixAt(index, dummy.matrix);

      // Fade in at the top and out at the bottom so nothing pops.
      const edge = Math.min(smoothstep(travelled / 2), smoothstep((span - travelled) / 3));
      tint.copy(far).lerp(near, depth * edge);
      node.setColorAt(index, tint);
    });

    node.instanceMatrix.needsUpdate = true;
    if (node.instanceColor) node.instanceColor.needsUpdate = true;
  });

  return (
    <instancedMesh ref={mesh} args={[undefined, undefined, CARD_COUNT]} frustumCulled={false}>
      <planeGeometry args={[0.78, 1.01]} />
      <meshBasicMaterial transparent opacity={0.62} side={THREE.DoubleSide} depthWrite={false} />
    </instancedMesh>
  );
}

/**
 * The one you would actually know about.
 *
 * On a loop, a single application stops falling, holds in the light, and emits
 * a signal ring. That is the whole product in one gesture: the same document,
 * except this time something came back. It resolves the scene from "everything
 * disappears" into "one of these reported in".
 */
function CaughtApplication() {
  const group = useRef<THREE.Group>(null);
  const card = useRef<THREE.Mesh>(null);
  const rings = useRef<(THREE.Mesh | null)[]>([]);

  useFrame((state) => {
    const node = group.current;
    const sheet = card.current;
    if (!node || !sheet) return;

    const time = state.clock.elapsedTime;
    const cycle = (time % CATCH_CYCLE) / CATCH_CYCLE;

    // Falls in, decelerates to a stop, holds, then releases downward.
    const arrive = smoothstep(cycle / 0.28);
    const leave = smoothstep((cycle - 0.78) / 0.22);
    node.position.y = 6 - arrive * 6 - leave * 7;
    node.position.x = 2.1;
    node.rotation.y = Math.sin(time * 0.5) * 0.25;
    node.rotation.z = (1 - arrive) * 0.4;

    const present = arrive * (1 - leave);
    const material = sheet.material as THREE.MeshBasicMaterial;
    material.opacity = present;
    sheet.scale.setScalar(0.62 + present * 0.16);

    // Rings fire only while the card is held, one after another.
    const held = cycle > 0.3 && cycle < 0.8 ? (cycle - 0.3) / 0.5 : -1;
    rings.current.forEach((ring, index) => {
      if (!ring) return;
      if (held < 0) {
        ring.visible = false;
        return;
      }
      const phase = (held * 2.4 - index * 0.33) % 1;
      if (phase < 0) {
        ring.visible = false;
        return;
      }
      ring.visible = true;
      ring.scale.setScalar(0.4 + phase * 2.6);
      (ring.material as THREE.MeshBasicMaterial).opacity = (1 - phase) ** 2 * 0.7;
    });
  });

  return (
    <group ref={group}>
      <mesh ref={card}>
        <planeGeometry args={[0.78, 1.01]} />
        <meshBasicMaterial
          color={SIGNAL}
          transparent
          opacity={0}
          side={THREE.DoubleSide}
          depthWrite={false}
        />
      </mesh>

      {[0, 1, 2].map((index) => (
        <mesh
          key={index}
          ref={(node) => {
            rings.current[index] = node;
          }}
          rotation={[Math.PI / 2.4, 0, 0]}
          visible={false}
        >
          <torusGeometry args={[0.75, 0.006, 6, 64]} />
          <meshBasicMaterial color={SIGNAL} transparent opacity={0} depthWrite={false} />
        </mesh>
      ))}
    </group>
  );
}

/** Slow camera drift, so a static composition never feels frozen. */
function DriftingCamera() {
  useFrame((state) => {
    const time = state.clock.elapsedTime;
    state.camera.position.x = Math.sin(time * 0.12) * 0.5;
    state.camera.position.y = Math.sin(time * 0.09) * 0.3;
    state.camera.lookAt(0, 0, 0);
  });
  return null;
}

/**
 * Background layer for the story section.
 *
 * Deliberately low contrast: it sits behind readable copy, so it adds
 * atmosphere without competing with the text. Skipped entirely for visitors who
 * asked for reduced motion.
 */
export function RawStoryScene() {
  const reducedMotion = usePrefersReducedMotion();

  const cards = useMemo<Card[]>(() => {
    const random = createSeededRandom(424242);
    return Array.from({ length: CARD_COUNT }, () => ({
      x: (random() - 0.5) * 16,
      z: (random() - 0.5) * 10 - 3,
      speed: 0.3 + random() * 0.55,
      offset: random() * (FALL_TOP - FALL_BOTTOM),
      spin: (random() - 0.5) * 0.6,
      tilt: 0.2 + random() * 0.3,
    }));
  }, []);

  if (reducedMotion) return null;

  return (
    <Canvas
      className="!absolute inset-0"
      dpr={[1, 1.5]}
      gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
      camera={{ position: [0, 0, 9], fov: 45 }}
      aria-hidden="true"
    >
      <DriftingCamera />
      <FallingApplications cards={cards} />
      <CaughtApplication />
    </Canvas>
  );
}
