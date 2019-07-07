import React, { useEffect, useState, useRef } from 'react'
import Pitchfinder from 'pitchfinder'
const detectPitch = Pitchfinder.AMDF()

export default function Notes() {
  const [stream, setStream] = useState()
  const canvas = useRef()
  const [listening, setListening] = useState(true)
  const [note, setCurrentNote] = useState()

  useEffect(() => {
    if (!listening || !navigator.mediaDevices) return
    ;(async () => {
      const audioCtx = new AudioContext()
      let stream
      try {
        stream = await navigator.mediaDevices.getUserMedia({
          audio: true,
          video: true,
        })
      } catch (err) {
        console.error('Failed to get stream:', err)
        setListening(false)
        return
      }
      setStream(stream)

      const audioSource = audioCtx.createMediaStreamSource(stream)
      const analyser = audioCtx.createAnalyser()
      analyser.smoothingTimeConstant = 0
      analyser.fftSize = 2048
      audioSource.connect(analyser)

      const bufferLength = analyser.fftSize
      const dataArray = new Float32Array(bufferLength)
      const arrayFreqDomain = new Uint8Array(analyser.fftSize)

      const scriptNode = audioCtx.createScriptProcessor(2048, 1, 1)
      scriptNode.onaudioprocess = () => {
        analyser.getFloatTimeDomainData(dataArray)
        const pitch = detectPitch(dataArray)
        setCurrentNote(pitch ? getNote(pitch) : null)
      }

      analyser.connect(scriptNode)
      scriptNode.connect(audioCtx.destination)

      const canvasCtx = canvas.current.getContext('2d')
      draw()
      function draw() {
        requestAnimationFrame(draw)

        analyser.getByteTimeDomainData(arrayFreqDomain)

        canvasCtx.fillStyle = 'rgb(200, 200, 200)'
        canvasCtx.fillRect(0, 0, canvas.current.width, canvas.current.height)

        canvasCtx.lineWidth = 2
        canvasCtx.strokeStyle = 'rgb(0, 0, 0)'

        canvasCtx.beginPath()

        var sliceWidth = (canvas.current.width * 1.0) / bufferLength
        var x = 0

        for (var i = 0; i < bufferLength; i++) {
          var v = arrayFreqDomain[i] / 128.0
          var y = (v * canvas.current.height) / 2

          if (i === 0) {
            canvasCtx.moveTo(x, y)
          } else {
            canvasCtx.lineTo(x, y)
          }

          x += sliceWidth
        }

        canvasCtx.lineTo(canvas.width, canvas.height / 2)
        canvasCtx.stroke()
      }
    })()
    function getNote(freq) {
      return {
        ...notes.find(({ low, high }) => freq > low && freq < high),
        freq,
      }
    }
  }, [listening])
  return (
    <section>
      {!listening && (
        <button
          onClick={() => {
            setListening(true)
          }}>
          start listening
        </button>
      )}
      <Video autoPlay muted srcObject={stream} />
      <canvas ref={canvas} width={350} height={100} />
      <Note note={note} />
    </section>
  )
}

function Note({ note }) {
  if (note == null)
    return (
      <>
        <p>-</p>
        <p>-</p>
        <p>-</p>
      </>
    )
  const flat = note.freq < note.hz - (note.hz - note.low) / 5
  const sharp = note.freq > note.hz + (note.high - note.hz) / 5
  return (
    <>
      <p style={{ height: '1em' }}>{note.name}</p>
      <p style={{ color: flat || sharp ? 'red' : 'green', height: '1em' }}>
        {flat ? '↑' : sharp ? '↓' : '✅'}
      </p>
      <p style={{ height: '1em' }}>
        {note.freq.toFixed(2)}/{note.hz.toFixed(2)}
      </p>
    </>
  )
}

function Video({ srcObject, ...props }) {
  const ref = useRef()
  useEffect(() => {
    ref.current.srcObject = srcObject
  }, [ref.current, srcObject])
  return <video ref={ref} {...props} />
}

const notes = [
  { hz: 27.5, name: 'A0 Double Pedal A' },
  { hz: 29.1352, name: 'A♯0/B♭0' },
  { hz: 30.8677, name: 'B0' },
  { hz: 32.7032, name: 'C1 Pedal C' },
  { hz: 34.6478, name: 'C♯1/D♭1' },
  { hz: 36.7081, name: 'D1' },
  { hz: 38.8909, name: 'D♯1/E♭1' },
  { hz: 41.2034, name: 'E1' },
  { hz: 43.6535, name: 'F1' },
  { hz: 46.2493, name: 'F♯1/G♭1' },
  { hz: 48.9994, name: 'G1' },
  { hz: 51.9131, name: 'G♯1/A♭1' },
  { hz: 55, name: 'A1' },
  { hz: 58.2705, name: 'A♯1/B♭1' },
  { hz: 61.7354, name: 'B1' },
  { hz: 65.4064, name: 'C2 Deep C' },
  { hz: 69.2957, name: 'C♯2/D♭2' },
  { hz: 73.4162, name: 'D2' },
  { hz: 77.7817, name: 'D♯2/E♭2' },
  { hz: 82.4069, name: 'E2' },
  { hz: 87.3071, name: 'F2' },
  { hz: 92.4986, name: 'F♯2/G♭2' },
  { hz: 97.9989, name: 'G2' },
  { hz: 103.826, name: 'G♯2/A♭2' },
  { hz: 110, name: 'A2' },
  { hz: 116.541, name: 'A♯2/B♭2' },
  { hz: 123.471, name: 'B2' },
  { hz: 130.813, name: 'C3' },
  { hz: 138.591, name: 'C♯3/D♭3' },
  { hz: 146.832, name: 'D3' },
  { hz: 155.563, name: 'D♯3/E♭3' },
  { hz: 164.814, name: 'E3' },
  { hz: 174.614, name: 'F3' },
  { hz: 184.997, name: 'F♯3/G♭3' },
  { hz: 195.998, name: 'G3' },
  { hz: 207.652, name: 'G♯3/A♭3' },
  { hz: 220, name: 'A3' },
  { hz: 233.082, name: 'A♯3/B♭3' },
  { hz: 246.942, name: 'B3' },
  { hz: 261.626, name: 'C4 Middle C' },
  { hz: 277.183, name: 'C♯4/D♭4' },
  { hz: 293.665, name: 'D4' },
  { hz: 311.127, name: 'D♯4/E♭4' },
  { hz: 329.628, name: 'E4' },
  { hz: 349.228, name: 'F4' },
  { hz: 369.994, name: 'F♯4/G♭4' },
  { hz: 391.995, name: 'G4' },
  { hz: 415.305, name: 'G♯4/A♭4' },
  { hz: 440, name: 'A4 A440' },
  { hz: 466.164, name: 'A♯4/B♭4' },
  { hz: 493.883, name: 'B4' },
  { hz: 523.251, name: 'C5 Tenor C' },
  { hz: 554.365, name: 'C♯5/D♭5' },
  { hz: 587.33, name: 'D5' },
  { hz: 622.254, name: 'D♯5/E♭5' },
  { hz: 659.255, name: 'E5' },
  { hz: 698.456, name: 'F5' },
  { hz: 739.989, name: 'F♯5/G♭5' },
  { hz: 783.991, name: 'G5' },
  { hz: 830.609, name: 'G♯5/A♭5' },
  { hz: 880, name: 'A5' },
  { hz: 932.328, name: 'A♯5/B♭5' },
  { hz: 987.767, name: 'B5' },
  { hz: 1046.5, name: 'C6 Soprano C(High C)' },
  { hz: 1108.73, name: 'C♯6/D♭6' },
  { hz: 1174.66, name: 'D6' },
  { hz: 1244.51, name: 'D♯6/E♭6' },
  { hz: 1318.51, name: 'E6' },
  { hz: 1396.91, name: 'F6' },
  { hz: 1479.98, name: 'F♯6/G♭6' },
  { hz: 1567.98, name: 'G6' },
  { hz: 1661.22, name: 'G♯6/A♭6' },
  { hz: 1760, name: 'A6' },
  { hz: 1864.66, name: 'A♯6/B♭6' },
  { hz: 1975.53, name: 'B6' },
  { hz: 2093, name: 'C7 Double high C' },
  { hz: 2217.46, name: 'C♯7/D♭7' },
  { hz: 2349.32, name: 'D7' },
  { hz: 2489.02, name: 'D♯7/E♭7' },
  { hz: 2637.02, name: 'E7' },
  { hz: 2793.83, name: 'F7' },
  { hz: 2959.96, name: 'F♯7/G♭7' },
  { hz: 3135.96, name: 'G7' },
  { hz: 3322.44, name: 'G♯7/A♭7' },
  { hz: 3520, name: 'A7' },
  { hz: 3729.31, name: 'A♯7/B♭7' },
  { hz: 3951.07, name: 'B7' },
  { hz: 4186.01, name: 'C8 Eighth octave' },
].map((note, i, notes) => {
  const prev = notes[i - 1]
  const next = notes[i + 1]
  return {
    ...note,
    low: prev ? (prev.hz + note.hz) / 2 : 0,
    high: next ? (next.hz + note.hz) / 2 : Infinity,
  }
})
