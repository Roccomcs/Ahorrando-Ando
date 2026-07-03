'use client'

import { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Props {
  color: string
  position?: [number, number, number]
  scale?: number
  opacity?: number
  /** Si es > 0, la opacidad pulsa a esta velocidad (rad/s). */
  pulseSpeed?: number
}

/** Destello difuso detrás de la moneda (gradiente radial generado en canvas). */
export function Flare({ color, position = [0, 0, -0.9], scale = 3.2, opacity = 0.32, pulseSpeed = 0 }: Props) {
  const mat = useRef<THREE.SpriteMaterial>(null)

  const texture = useMemo(() => {
    const c = document.createElement('canvas')
    c.width = c.height = 128
    const ctx = c.getContext('2d')!
    const g = ctx.createRadialGradient(64, 64, 0, 64, 64, 64)
    g.addColorStop(0, 'rgba(255,255,255,1)')
    g.addColorStop(0.35, 'rgba(255,255,255,0.4)')
    g.addColorStop(1, 'rgba(255,255,255,0)')
    ctx.fillStyle = g
    ctx.fillRect(0, 0, 128, 128)
    return new THREE.CanvasTexture(c)
  }, [])

  useFrame(({ clock }) => {
    if (!pulseSpeed || !mat.current) return
    mat.current.opacity = opacity * (0.72 + 0.28 * Math.sin(clock.getElapsedTime() * pulseSpeed))
  })

  return (
    <sprite position={position} scale={[scale, scale, 1]}>
      <spriteMaterial
        ref={mat}
        map={texture}
        color={color}
        transparent
        opacity={opacity}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
      />
    </sprite>
  )
}
