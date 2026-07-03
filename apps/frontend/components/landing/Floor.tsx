'use client'

import { MeshReflectorMaterial, Grid } from '@react-three/drei'

interface Props {
  y?: number
}

/** Piso moderno: plano oscuro reflectante + grilla tenue que se desvanece. */
export function Floor({ y = -3.85 }: Props) {
  return (
    <group>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]}>
        <planeGeometry args={[44, 30]} />
        <MeshReflectorMaterial
          blur={[300, 80]}
          resolution={512}
          mixBlur={0.9}
          mixStrength={0.8}
          roughness={0.85}
          depthScale={1.1}
          minDepthThreshold={0.4}
          maxDepthThreshold={1.2}
          color="#0b0e13"
          metalness={0.5}
          mirror={0.55}
        />
      </mesh>
      <Grid
        position={[0, y + 0.01, 0]}
        args={[44, 30]}
        cellSize={0.7}
        cellThickness={0.5}
        cellColor="#1c2735"
        sectionSize={3.5}
        sectionThickness={1}
        sectionColor="#27384c"
        fadeDistance={22}
        fadeStrength={1.2}
      />
    </group>
  )
}
