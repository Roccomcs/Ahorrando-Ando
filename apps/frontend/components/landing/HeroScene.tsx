'use client'

import { useEffect, useRef } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { useGLTF, Environment, Lightformer } from '@react-three/drei'
import gsap from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { useGSAP } from '@gsap/react'
import * as THREE from 'three'
import { CoinModel } from './CoinModel'
import { OrbitRing } from './OrbitRing'
import { CoinGlow } from './CoinGlow'
import { SparkField } from './SparkField'
import s from './HeroScene.module.css'

gsap.registerPlugin(useGSAP, ScrollTrigger)

const MODELS = {
  bitcoin: '/models/bitcoin-hq.glb',
  binance: '/models/binance-hq.glb',
  mercadoPago: '/models/mercado-pago-hq.glb',
}

useGLTF.preload(MODELS.bitcoin)
useGLTF.preload(MODELS.binance)
useGLTF.preload(MODELS.mercadoPago)

function Parallax({ children }: { children: React.ReactNode }) {
  const group = useRef<THREE.Group>(null)
  const target = useRef({ x: 0, y: 0 })

  useEffect(() => {
    function onMove(e: PointerEvent) {
      const nx = (e.clientX / window.innerWidth) * 2 - 1
      const ny = (e.clientY / window.innerHeight) * 2 - 1
      const max = THREE.MathUtils.degToRad(8)
      target.current.x = -ny * max
      target.current.y = nx * max
    }
    window.addEventListener('pointermove', onMove)
    return () => window.removeEventListener('pointermove', onMove)
  }, [])

  useFrame(() => {
    if (!group.current) return
    group.current.rotation.x = THREE.MathUtils.damp(group.current.rotation.x, target.current.x, 4, 0.016)
    group.current.rotation.y = THREE.MathUtils.damp(group.current.rotation.y, target.current.y, 4, 0.016)
  })

  return <group ref={group}>{children}</group>
}

function Scene() {
  const bitcoinRef = useRef<THREE.Group>(null)
  const binanceRef = useRef<THREE.Group>(null)
  const mpRef = useRef<THREE.Group>(null)

  useGSAP(() => {
    const tl = gsap.timeline({ defaults: { ease: 'power4.out', duration: 1.5 } })
    if (bitcoinRef.current) {
      gsap.set(bitcoinRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.fromTo(bitcoinRef.current.position, { y: 5 }, { y: 1.6 }, 0)
        .to(bitcoinRef.current.scale, { x: 1, y: 1, z: 1 }, 0)
    }
    if (binanceRef.current) {
      gsap.set(binanceRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.to(binanceRef.current.scale, { x: 1, y: 1, z: 1 }, 0.1)
    }
    if (mpRef.current) {
      gsap.set(mpRef.current.scale, { x: 0.8, y: 0.8, z: 0.8 })
      tl.fromTo(mpRef.current.position, { y: -5 }, { y: -1.6 }, 0)
        .to(mpRef.current.scale, { x: 1, y: 1, z: 1 }, 0.1)
    }

    ScrollTrigger.create({
      trigger: document.body,
      start: 'top top',
      end: '+=600',
      scrub: 0.6,
      onUpdate: self => {
        const p = self.progress
        if (bitcoinRef.current) bitcoinRef.current.position.z = p * 0.6
        if (binanceRef.current) binanceRef.current.rotation.z = p * 0.25
        if (mpRef.current) mpRef.current.position.z = -p * 0.6
      },
    })
  }, [])

  return (
    <Parallax>
      <group ref={bitcoinRef} position={[0.15, 1.6, 0]}>
        <CoinGlow color="#f7931a" />
        <CoinModel
          url={MODELS.bitcoin}
          position={[0, 0, 0]}
          metalBoost={{ metalness: 0.55, roughness: 0.3 }}
          floatSpeed={0.6}
          floatAmplitude={0.18}
          spinSpeed={0.35}
        />
      </group>
      <group ref={binanceRef} position={[-0.15, 0, 0]}>
        <CoinGlow color="#F0B90B" />
        <CoinModel
          url={MODELS.binance}
          position={[0, 0, 0]}
          metalBoost={{ metalness: 0.5, roughness: 0.32 }}
          floatSpeed={0.5}
          floatAmplitude={0.16}
          spinSpeed={0.3}
          phase={2}
        />
      </group>
      <group ref={mpRef} position={[0.15, -1.6, 0]}>
        <CoinGlow color="#41A4EF" />
        <CoinModel
          url={MODELS.mercadoPago}
          position={[0, 0, 0]}
          metalBoost={{ metalness: 0.45, roughness: 0.35 }}
          floatSpeed={0.55}
          floatAmplitude={0.2}
          spinSpeed={0.32}
          phase={4}
        />
      </group>

      <OrbitRing position={[0.15, 1.6, 0]} radius={1.05} color="#ffcf8a" speed={0.15} tilt={0.5} />
      <OrbitRing position={[-0.15, 0, 0]} radius={1.05} color="#F0B90B" speed={-0.12} tilt={-0.45} />
      <OrbitRing position={[0.15, -1.6, 0]} radius={1.05} color="#6fc3ff" speed={0.18} tilt={0.4} />

      <SparkField count={55} spread={[3.5, 4.5, 2.5]} colors={['#f7c268', '#ffffff', '#6fc3ff']} />

      <ambientLight intensity={0.45} />
      <directionalLight position={[4, 6, 5]} intensity={1.8} color="#ffd9a0" castShadow />
      <directionalLight position={[-4, -2, -3]} intensity={0.5} color="#3a6ea5" />
      <Environment resolution={64} environmentIntensity={0.5}>
        <Lightformer form="rect" color="#fff3d6" intensity={2} position={[3, 4, 4]} scale={[4, 4, 1]} />
        <Lightformer form="rect" color="#bfe3ff" intensity={0.8} position={[-4, -2, 3]} scale={[3, 4, 1]} />
      </Environment>
    </Parallax>
  )
}

function Chip({ value, label, icon, alt }: { value: string; label: string; icon?: string; alt?: string }) {
  return (
    <div className={s.chip}>
      {icon && (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={icon} alt={alt ?? ''} className={s.chipIcon} />
      )}
      <div className={s.chipText}>
        <span className={s.chipValue}>{value}</span>
        <span className={s.chipLabel}>{label}</span>
      </div>
    </div>
  )
}

export function HeroScene() {
  return (
    <div className={s.canvasWrap}>
      <Canvas
        aria-hidden="true"
        gl={{ alpha: true, antialias: true }}
        dpr={[1, 2]}
        camera={{ fov: 45, position: [0, 0, 10.5] }}
        style={{ background: 'transparent' }}
      >
        <Scene />
      </Canvas>

      <div className={`${s.chipCol} ${s.chipColLeft}`} aria-hidden="true">
        <Chip value="+US$ 150" label="Ganancia hoy" />
        <Chip value="ARS / USD" label="+0,85%" />
        <Chip value="Tu patrimonio" label="+4,21%" />
      </div>
      <div className={`${s.chipCol} ${s.chipColRight}`} aria-hidden="true">
        <Chip value="BTC" label="Bitcoin" icon="/crypto/btc.svg" alt="Bitcoin" />
        <Chip value="BNB" label="Binance Coin" icon="/providers/binance.svg" alt="Binance" />
        <Chip value="MP" label="Mercado Pago" icon="/providers/mercado-pago.svg" alt="Mercado Pago" />
      </div>
    </div>
  )
}
