'use client'

import { useEffect, useRef, useCallback } from 'react'
import { BrowserMultiFormatReader, IScannerControls } from '@zxing/browser'
import { DecodeHintType, BarcodeFormat } from '@zxing/library'
import { X } from '@phosphor-icons/react'

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export function Scanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const controlsRef = useRef<IScannerControls | null>(null)
  const resultHandled = useRef(false)

  const stopAll = useCallback(() => {
    controlsRef.current?.stop()
    if (videoRef.current?.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks()
      tracks.forEach((t) => t.stop())
      videoRef.current.srcObject = null
    }
  }, [])

  const handleResult = useCallback(
    (text: string) => {
      if (resultHandled.current) return
      resultHandled.current = true
      stopAll()
      onResult(text)
    },
    [onResult, stopAll],
  )

  useEffect(() => {
    if (!videoRef.current) return
    const hints = new Map<DecodeHintType, unknown>()
    hints.set(DecodeHintType.POSSIBLE_FORMATS, [
      BarcodeFormat.EAN_13,
      BarcodeFormat.EAN_8,
      BarcodeFormat.UPC_A,
      BarcodeFormat.UPC_E,
      BarcodeFormat.CODE_128,
    ])
    hints.set(DecodeHintType.TRY_HARDER, true)
    const reader = new BrowserMultiFormatReader(hints)
    let mounted = true

    const start = async () => {
      try {
        const controls = await reader.decodeFromConstraints(
          {
            video: {
              facingMode: { ideal: 'environment' },
              width: { ideal: 1920 },
              height: { ideal: 1080 },
            },
          },
          videoRef.current!,
          (result) => {
            if (!mounted) return
            if (result) handleResult(result.getText())
          },
        )
        if (mounted) controlsRef.current = controls
      } catch (err: unknown) {
        const name = (err as { name?: string })?.name
        if (name !== 'NotFoundError' && name !== 'NotFoundException') {
          console.error('Scanner error:', err)
        }
      }
    }

    start()

    return () => {
      mounted = false
      stopAll()
    }
  }, [handleResult, stopAll])

  return (
    <div className="fixed inset-0 z-50 bg-black flex flex-col">
      <div className="flex items-center justify-between px-4 py-3 text-white bg-black/60">
        <span className="font-semibold text-base">バーコードをスキャン</span>
        <button
          onClick={() => { stopAll(); onClose() }}
          className="p-2 rounded-full hover:bg-white/20 transition-colors"
          aria-label="スキャンを閉じる"
        >
          <X size={22} weight="bold" />
        </button>
      </div>
      <div className="relative flex-1">
        <video
          ref={videoRef}
          className="w-full h-full object-cover"
          playsInline
          muted
          autoPlay
        />
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <div className="relative w-64 h-44">
            <div className="absolute inset-0 rounded-2xl border-2 border-white/30" />
            <div className="absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 border-green-400 rounded-tl-xl" />
            <div className="absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 border-green-400 rounded-tr-xl" />
            <div className="absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 border-green-400 rounded-bl-xl" />
            <div className="absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 border-green-400 rounded-br-xl" />
            <div className="absolute top-1/2 left-4 right-4 h-0.5 bg-green-400/60 -translate-y-1/2" />
          </div>
        </div>
      </div>
      <p className="text-center text-white/60 text-sm py-5">バーコードを枠内に合わせてください</p>
    </div>
  )
}
