'use client'

// Página de depuración para orientar la "B" de Bitcoin en 3D.
// Moná una moneda quieta mirando a cámara y un slider que rota el logo en vivo.
// Ajustá hasta que la B quede derecha y pasame el ángulo (y flips). No linkeada;
// se borra cuando fijemos la orientación.
import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import { Canvas } from '@react-three/fiber'
import { useGLTF, Environment } from '@react-three/drei'
import * as THREE from 'three'
import { faceAxis, applyPlanarUV, loadLogoTexture } from '@/components/three/logoProjection'

const URL_GLB = '/models/Bitcoin_Logo.glb'
const LOGO = '/crypto/btc.svg'
const BASE = '#F7931A'

interface Cfg { rot: number; flipU: boolean; flipV: boolean; backRot: number; backFlipU: boolean; backFlipV: boolean }

function DebugCoin({ cfg }: { cfg: Cfg }) {
  const { scene } = useGLTF(URL_GLB)
  const [tex, setTex] = useState<THREE.Texture | null>(null)

  useEffect(() => {
    let alive = true
    loadLogoTexture(LOGO, BASE).then(t => { if (alive) setTex(t) }).catch(() => {})
    return () => { alive = false }
  }, [])

  const { object, scale } = useMemo(() => {
    const cloned = scene.clone(true)
    cloned.traverse(child => {
      const mesh = child as THREE.Mesh
      if (!mesh.isMesh) return
      const geo = mesh.geometry as THREE.BufferGeometry
      if (!geo.getAttribute('normal')) geo.computeVertexNormals()
      // force:true → recalcula el UV en cada cambio de slider.
      applyPlanarUV(geo, faceAxis(geo), {
        rotationDeg: cfg.rot, flipU: cfg.flipU, flipV: cfg.flipV,
        backRotationDeg: cfg.backRot, backFlipU: cfg.backFlipU, backFlipV: cfg.backFlipV,
        force: true,
      })
      mesh.material = new THREE.MeshStandardMaterial({
        color: '#ffffff', map: tex, metalness: 0.6, roughness: 0.28,
        emissive: new THREE.Color(BASE), emissiveIntensity: 0.08,
      })
    })
    const box = new THREE.Box3().setFromObject(cloned)
    const center = box.getCenter(new THREE.Vector3())
    const sphere = box.getBoundingSphere(new THREE.Sphere())
    cloned.position.sub(center)
    return { object: cloned, scale: 1.9 / (sphere.radius || 1) }
  }, [scene, tex, cfg])

  return <group scale={scale}><primitive object={object} /></group>
}

export default function CoinTest() {
  const [cfg, setCfg] = useState<Cfg>({ rot: 10, flipU: false, flipV: false, backRot: 10, backFlipU: true, backFlipV: false })
  const [spin, setSpin] = useState(true)
  const set = (patch: Partial<Cfg>) => setCfg(c => ({ ...c, ...patch }))
  const wrap = (n: number) => ((n % 360) + 360) % 360

  return (
    <div style={{ width: '100vw', height: '100vh', background: '#0a0a0a', position: 'relative' }}>
      <Canvas gl={{ preserveDrawingBuffer: true }} camera={{ fov: 40, position: [0, 0, 6] }}>
        <ambientLight intensity={0.9} />
        <directionalLight position={[4, 6, 5]} intensity={2} color="#ffdca6" />
        <directionalLight position={[-4, -2, -3]} intensity={0.6} color="#2f6bb0" />
        <Environment preset="city" />
        <SpinWrap spin={spin}>
          <DebugCoin cfg={cfg} />
        </SpinWrap>
      </Canvas>

      <div style={{ position: 'absolute', top: 0, left: 0, right: 0, padding: 14, background: 'rgba(0,0,0,0.72)', color: '#fff', fontFamily: 'monospace', fontSize: 13, display: 'flex', flexDirection: 'column', gap: 8 }}>
        <div style={{ fontSize: 15, fontWeight: 700 }}>
          FRENTE rot={cfg.rot}° flipU={String(cfg.flipU)} flipV={String(cfg.flipV)} · ATRÁS rot={cfg.backRot}° flipU={String(cfg.backFlipU)} flipV={String(cfg.backFlipV)}
        </div>

        <div>Cara de FRENTE — rotación: {cfg.rot}°</div>
        <input type="range" min={0} max={359} value={cfg.rot} onChange={e => set({ rot: Number(e.target.value) })} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => set({ rot: wrap(cfg.rot - 1) })}>◀ −1°</button>
          <button onClick={() => set({ rot: wrap(cfg.rot + 1) })}>+1° ▶</button>
          <button onClick={() => set({ rot: wrap(cfg.rot + 90) })}>+90°</button>
          <button onClick={() => set({ flipU: !cfg.flipU })}>flipU frente</button>
          <button onClick={() => set({ flipV: !cfg.flipV })}>flipV frente</button>
        </div>

        <div>Cara de ATRÁS — rotación: {cfg.backRot}°</div>
        <input type="range" min={0} max={359} value={cfg.backRot} onChange={e => set({ backRot: Number(e.target.value) })} style={{ width: '100%' }} />
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button onClick={() => set({ backRot: wrap(cfg.backRot - 1) })}>◀ −1°</button>
          <button onClick={() => set({ backRot: wrap(cfg.backRot + 1) })}>+1° ▶</button>
          <button onClick={() => set({ backRot: wrap(cfg.backRot + 90) })}>+90°</button>
          <button onClick={() => set({ backFlipU: !cfg.backFlipU })}>flipU atrás</button>
          <button onClick={() => set({ backFlipV: !cfg.backFlipV })}>flipV atrás</button>
        </div>

        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={() => setSpin(s => !s)}>{spin ? 'PARAR giro' : 'GIRAR'}</button>
        </div>
        <div style={{ opacity: 0.8 }}>Con la moneda girando, ajustá FRENTE y ATRÁS hasta que la B se lea bien de los dos lados, y pasame la línea de arriba completa.</div>
      </div>
    </div>
  )
}

function SpinWrap({ spin, children }: { spin: boolean; children: ReactNode }) {
  const local = useRef<THREE.Group>(null)
  useEffect(() => {
    if (!spin) return
    let raf = 0
    const tick = () => { if (local.current) local.current.rotation.y += 0.01; raf = requestAnimationFrame(tick) }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [spin])
  return <group ref={local}>{children}</group>
}
