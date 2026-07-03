'use client'

import { useMemo, useRef } from 'react'
import { useGLTF } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

interface Paint {
  /** Color del cuerpo de la moneda. */
  base: string
  /** Color del relieve (logo). Se detecta por la altura en Z local del vértice. */
  relief?: string
  /** Fracción del semiespesor a partir de la cual un vértice cuenta como relieve (0-1). */
  reliefCut?: number
  metalness?: number
  roughness?: number
  emissive?: string
  emissiveIntensity?: number
}

interface Props {
  url: string
  position: [number, number, number]
  floatSpeed: number
  floatAmplitude: number
  spinSpeed: number
  phase?: number
  paint: Paint
  /** Radio final de la moneda en unidades de escena. */
  size?: number
  /** Inclinación fija en X (radianes) — cada moneda con la suya para variedad. */
  tilt?: number
}

export function CoinModel({
  url,
  position,
  floatSpeed,
  floatAmplitude,
  spinSpeed,
  phase = 0,
  paint,
  size = 1.25,
  tilt = 0,
}: Props) {
  const { scene } = useGLTF(url)
  const group = useRef<THREE.Group>(null)

  const { content, scale } = useMemo(() => {
    // Se clona la escena entera para conservar la transformación del nodo que
    // decodifica las posiciones cuantizadas de gltfpack (KHR_mesh_quantization).
    const cloned = scene.clone(true)

    cloned.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return

      const geo = mesh.geometry
      let colors: THREE.BufferAttribute | undefined

      if (paint.relief) {
        // El relieve del logo sobresale del plano de la cara en Z local.
        // Se trabaja centrado porque las posiciones cuantizadas traen offset.
        const pos = geo.getAttribute('position')
        let minZ = Infinity
        let maxZ = -Infinity
        for (let i = 0; i < pos.count; i++) {
          const z = pos.getZ(i)
          if (z < minZ) minZ = z
          if (z > maxZ) maxZ = z
        }
        const center = (minZ + maxZ) / 2
        const half = (maxZ - minZ) / 2 || 1
        const cut = half * (paint.reliefCut ?? 0.9)
        const base = new THREE.Color(paint.base)
        const relief = new THREE.Color(paint.relief)
        const arr = new Float32Array(pos.count * 3)
        for (let i = 0; i < pos.count; i++) {
          const c = Math.abs(pos.getZ(i) - center) > cut ? relief : base
          arr[i * 3] = c.r
          arr[i * 3 + 1] = c.g
          arr[i * 3 + 2] = c.b
        }
        colors = new THREE.BufferAttribute(arr, 3)
        geo.setAttribute('color', colors)
      }

      mesh.material = new THREE.MeshStandardMaterial({
        color: paint.relief ? '#ffffff' : paint.base,
        vertexColors: !!paint.relief,
        metalness: paint.metalness ?? 0.85,
        roughness: paint.roughness ?? 0.25,
        emissive: new THREE.Color(paint.emissive ?? '#000000'),
        emissiveIntensity: paint.emissiveIntensity ?? 0,
      })
    })

    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    cloned.position.sub(center)
    const radius = sphere.radius || 1
    return { content: <primitive object={cloned} />, scale: size / radius }
  }, [scene, paint, size])

  useFrame(({ clock }) => {
    if (!group.current) return
    const t = clock.getElapsedTime()
    group.current.position.y = position[1] + Math.sin(t * floatSpeed + phase) * floatAmplitude
    // Rotación continua muy lenta — natural, sin sincronía entre monedas.
    group.current.rotation.y = t * spinSpeed + phase
  })

  return (
    <group rotation={[tilt, 0, 0]}>
      <group ref={group} position={position}>
        <group scale={scale}>{content}</group>
      </group>
    </group>
  )
}
