'use client'

import { useEffect, useRef, useCallback } from 'react'
import { X } from '@phosphor-icons/react'
import { setZXingModuleOverrides, readBarcodesFromImageData, type ReadInputBarcodeFormat } from 'zxing-wasm/reader'

setZXingModuleOverrides({
  locateFile: (path: string) => `/${path}`,
})

const READER_FORMATS: ReadInputBarcodeFormat[] = ['EAN13', 'EAN8', 'UPCA', 'UPCE', 'Code128']
const READER_OPTIONS = { formats: READER_FORMATS, tryHarder: true }

interface Props {
  onResult: (text: string) => void
  onClose: () => void
}

export function Scanner({ onResult, onClose }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const resultHandled = useRef(false)
  const scanning = useRef(false)

  const stopAll = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current)
      intervalRef.current = null
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop())
      streamRef.current = null
    }
    if (videoRef.current) {
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
    let mounted = true
    const video = videoRef.current
    const canvas = canvasRef.current
    if (!video || !canvas) return
    const ctx = canvas.getContext('2d', { willReadFrequently: true })
    if (!ctx) return

    const start = async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: { ideal: 'environment' },
            width: { ideal: 1920 },
            height: { ideal: 1080 },
          },
        })
        if (!mounted) {
          stream.getTracks().forEach((t) => t.stop())
          return
        }
        streamRef.current = stream
        video.srcObject = stream
        await video.play()

        intervalRef.current = setInterval(async () => {
          if (!mounted || resultHandled.current || scanning.current) return
          if (video.readyState < 2 || video.videoWidth === 0) return
          scanning.current = true
          try {
            canvas.width = video.videoWidth
            canvas.height = video.videoHeight
            ctx.drawImage(video, 0, 0)
            const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height)
            const results = await readBarcodesFromImageData(imageData, READER_OPTIONS)
            if (results.length > 0 && mounted && !resultHandled.current) {
              handleResult(results[0].text)
            }
          } catch {
            // ignore decode errors
          } finally {
            scanning.current = false
          }
        }, 200)
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
        />
        <canvas ref={canvasRef} className="hidden" />
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
