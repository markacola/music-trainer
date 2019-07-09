import React, { useEffect, useState, useRef, useReducer } from 'react'
import { Score } from 'react-vexflow'
import Pitchfinder from 'pitchfinder'
const detectPitch = Pitchfinder.AMDF()

export default function Notes() {
  const [stream, setStream] = useState()
  const [{ score, currentNote }, dispatch] = useReducer(
    function(state, { type, ...action }) {
      const { score, currentNote } = state
      switch (type) {
        case 'CLEAR_NOTE': {
          return currentNote ? { score, currentNote: null } : state
        }
        case 'NEW_NOTE': {
          const { note } = action
          if (currentNote && note && currentNote.key === note.key) {
            const nextNote = { ...currentNote, end: Date.now() }
            return {
              score: score.slice(0, score.length - 1).concat(nextNote),
              currentNote: nextNote,
            }
          } else {
            return {
              score: [...score, note],
              currentNote: note,
            }
          }
        }
        case 'CLEAR_SCORE': {
          return { ...state, score: [] }
        }
        default:
          throw new Error(`Unknown type '${type}'`)
      }
    },
    { score: [], currentNote: null }
  )
  const canvas = useRef()
  const [listening, setListening] = useState(true)
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

      try {
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
          const nextNote = pitch && getNote(pitch)
          dispatch({
            type: nextNote ? 'NEW_NOTE' : 'CLEAR_NOTE',
            note: nextNote,
          })
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
      } catch (err) {
        console.error(err)
      }
    })()
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
      <div>
        <Video autoPlay muted srcObject={stream} />
      </div>
      <canvas ref={canvas} width={350} height={100} />
      <Note note={currentNote} />
      <button onClick={() => dispatch({ type: 'CLEAR_SCORE' })}>Clear</button>
      <Score {...getStaves(score)} maxStavesX={4} />
    </section>
  )
}

function getNote(freq) {
  return {
    ...notes.find(({ low, high }) => freq > low && freq < high),
    freq,
    start: Date.now(),
    end: Date.now(),
  }
}

const bpm = 120 // TODO: make configurable
const halfBeatsDurr = 60000 / (bpm * 2)
function getStaves(notes) {
  const staves = [[]]
  let stave = staves[0]
  let staveLength = 0
  for (const note of notes.filter(
    note => note && note.end - note.start > halfBeatsDurr
  )) {
    const durr = note.end - note.start
    let halfBeats = Math.floor(durr / halfBeatsDurr)
    let addTie = false
    while (halfBeats > 0) {
      if (halfBeats >= 8) {
        halfBeats -= 8
        staveLength += 8
        stave.push([note.key, 'w'])
      } else if (halfBeats >= 4) {
        halfBeats -= 4
        staveLength += 4
        stave.push([note.key, 'h'])
      } else if (halfBeats >= 2) {
        halfBeats -= 2
        staveLength += 2
        stave.push([note.key, 'q'])
      } else if (halfBeats >= 1) {
        halfBeats -= 1
        staveLength += 1
        stave.push([note.key, '8'])
      }
      // TODO: add tie if needed
      if (staveLength > 8) {
        staveLength -= 8
        stave = []
        staves.push(stave)
      }
      addTie = true
    }
  }
  notes.map(note => note.key)
  return { staves }
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
  { hz: 27.5, name: 'A0', key: 'a0' },
  { hz: 29.1352, name: 'A♯0/B♭0', key: 'a♯0' },
  { hz: 30.8677, name: 'B0', key: 'b0' },
  { hz: 32.7032, name: 'C1 Pedal C', key: 'c1' },
  { hz: 34.6478, name: 'C♯1/D♭1', key: 'c♯1' },
  { hz: 36.7081, name: 'D1', key: 'd1' },
  { hz: 38.8909, name: 'D♯1/E♭1', key: 'd♯1' },
  { hz: 41.2034, name: 'E1', key: 'e1' },
  { hz: 43.6535, name: 'F1', key: 'f1' },
  { hz: 46.2493, name: 'F♯1/G♭1', key: 'f♯1' },
  { hz: 48.9994, name: 'G1', key: 'g1' },
  { hz: 51.9131, name: 'G♯1/A♭1', key: 'g♯1' },
  { hz: 55, name: 'A1', key: 'a1' },
  { hz: 58.2705, name: 'A♯1/B♭1', key: 'a♯1' },
  { hz: 61.7354, name: 'B1', key: 'b1' },
  { hz: 65.4064, name: 'C2', key: 'c2' },
  { hz: 69.2957, name: 'C♯2/D♭2', key: 'c♯2' },
  { hz: 73.4162, name: 'D2', key: 'd2' },
  { hz: 77.7817, name: 'D♯2/E♭2', key: 'd♯2' },
  { hz: 82.4069, name: 'E2', key: 'e2' },
  { hz: 87.3071, name: 'F2', key: 'f2' },
  { hz: 92.4986, name: 'F♯2/G♭2', key: 'f♯2' },
  { hz: 97.9989, name: 'G2', key: 'g2' },
  { hz: 103.826, name: 'G♯2/A♭2', key: 'g♯2' },
  { hz: 110, name: 'A2', key: 'a2' },
  { hz: 116.541, name: 'A♯2/B♭2', key: 'a♯2' },
  { hz: 123.471, name: 'B2', key: 'b2' },
  { hz: 130.813, name: 'C3', key: 'c3' },
  { hz: 138.591, name: 'C♯3/D♭3', key: 'c♯3' },
  { hz: 146.832, name: 'D3', key: 'd3' },
  { hz: 155.563, name: 'D♯3/E♭3', key: 'd♯3' },
  { hz: 164.814, name: 'E3', key: 'e3' },
  { hz: 174.614, name: 'F3', key: 'f3' },
  { hz: 184.997, name: 'F♯3/G♭3', key: 'f♯3' },
  { hz: 195.998, name: 'G3', key: 'g3' },
  { hz: 207.652, name: 'G♯3/A♭3', key: 'g♯3' },
  { hz: 220, name: 'A3', key: 'a3' },
  { hz: 233.082, name: 'A♯3/B♭3', key: 'a♯3' },
  { hz: 246.942, name: 'B3', key: 'b3' },
  { hz: 261.626, name: 'C4', key: 'c4' },
  { hz: 277.183, name: 'C♯4/D♭4', key: 'c♯4' },
  { hz: 293.665, name: 'D4', key: 'd4' },
  { hz: 311.127, name: 'D♯4/E♭4', key: 'd♯4' },
  { hz: 329.628, name: 'E4', key: 'e4' },
  { hz: 349.228, name: 'F4', key: 'f4' },
  { hz: 369.994, name: 'F♯4/G♭4', key: 'f♯4' },
  { hz: 391.995, name: 'G4', key: 'g4' },
  { hz: 415.305, name: 'G♯4/A♭4', key: 'g♯4' },
  { hz: 440, name: 'A4 A440', key: 'a4' },
  { hz: 466.164, name: 'A♯4/B♭4', key: 'a♯4' },
  { hz: 493.883, name: 'B4', key: 'b4' },
  { hz: 523.251, name: 'C5', key: 'c5' },
  { hz: 554.365, name: 'C♯5/D♭5', key: 'c♯5' },
  { hz: 587.33, name: 'D5', key: 'd5' },
  { hz: 622.254, name: 'D♯5/E♭5', key: 'd♯5' },
  { hz: 659.255, name: 'E5', key: 'e5' },
  { hz: 698.456, name: 'F5', key: 'f5' },
  { hz: 739.989, name: 'F♯5/G♭5', key: 'f♯5' },
  { hz: 783.991, name: 'G5', key: 'g5' },
  { hz: 830.609, name: 'G♯5/A♭5', key: 'g♯5' },
  { hz: 880, name: 'A5', key: 'a5' },
  { hz: 932.328, name: 'A♯5/B♭5', key: 'a♯5' },
  { hz: 987.767, name: 'B5', key: 'b5' },
  { hz: 1046.5, name: 'C6', key: 'c6' },
  { hz: 1108.73, name: 'C♯6/D♭6', key: 'c♯6' },
  { hz: 1174.66, name: 'D6', key: 'd6' },
  { hz: 1244.51, name: 'D♯6/E♭6', key: 'd♯6' },
  { hz: 1318.51, name: 'E6', key: 'e6' },
  { hz: 1396.91, name: 'F6', key: 'f6' },
  { hz: 1479.98, name: 'F♯6/G♭6', key: 'f♯6' },
  { hz: 1567.98, name: 'G6', key: 'g6' },
  { hz: 1661.22, name: 'G♯6/A♭6', key: 'g♯6' },
  { hz: 1760, name: 'A6', key: 'a6' },
  { hz: 1864.66, name: 'A♯6/B♭6', key: 'a♯6' },
  { hz: 1975.53, name: 'B6', key: 'b6' },
  { hz: 2093, name: 'C7', key: 'c7' },
  { hz: 2217.46, name: 'C♯7/D♭7', key: 'c♯7' },
  { hz: 2349.32, name: 'D7', key: 'd7' },
  { hz: 2489.02, name: 'D♯7/E♭7', key: 'd♯7' },
  { hz: 2637.02, name: 'E7', key: 'e7' },
  { hz: 2793.83, name: 'F7', key: 'f7' },
  { hz: 2959.96, name: 'F♯7/G♭7', key: 'f♯7' },
  { hz: 3135.96, name: 'G7', key: 'g7' },
  { hz: 3322.44, name: 'G♯7/A♭7', key: 'g♯7' },
  { hz: 3520, name: 'A7', key: 'a7' },
  { hz: 3729.31, name: 'A♯7/B♭7', key: 'a♯7' },
  { hz: 3951.07, name: 'B7', key: 'b7' },
  { hz: 4186.01, name: 'C8', key: 'c8' },
].map((note, i, notes) => {
  const prev = notes[i - 1]
  const next = notes[i + 1]
  return {
    ...note,
    low: prev ? (prev.hz + note.hz) / 2 : 0,
    high: next ? (next.hz + note.hz) / 2 : Infinity,
  }
})
