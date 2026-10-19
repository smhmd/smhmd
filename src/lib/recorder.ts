import { audioContext, globalGain } from './audio'
import { clientOnly } from './ssr'
import { download } from './utils'

/**
 * Records the app's audio output — everything routed through `globalGain`,
 * plus any extra nodes passed to the constructor — and offers playback and
 * download of the captured take.
 */
export class Recorder {
  public url?: string
  public duration?: number

  private audio: HTMLAudioElement
  private recorder: MediaRecorder | null = null
  private recordedChunks: BlobPart[] = []
  private destination: MediaStreamAudioDestinationNode
  private isReady = false

  /** Sets up a recording node and prepares the HTML audio element for playback. */
  constructor(...inputs: (AudioNode | undefined)[]) {
    this.destination = audioContext?.createMediaStreamDestination()
    globalGain?.connect(this.destination)
    for (const input of inputs) input?.connect(this.destination)

    this.audio = clientOnly(() => new Audio())
    this.isReady = true
  }

  /** Starts recording the audio routed into the destination node. */
  record() {
    if (!this?.isReady) return
    this.recordedChunks = []

    this.recorder = new MediaRecorder(this.destination.stream)
    this.recorder.ondataavailable = (e) => this.recordedChunks.push(e.data)
    this.recorder.start()
  }

  /**
   * Stops recording and finalizes the take. Async. Resolves with the take's
   * object URL — or `undefined` if nothing was being recorded.
   */
  async stop() {
    return new Promise<string | undefined>((resolve) => {
      if (!this.recorder || this.recorder.state !== 'recording')
        return resolve(undefined)

      this.recorder.onstop = () => {
        const type = this.recorder?.mimeType || 'audio/webm'
        const blob = new Blob(this.recordedChunks, { type })
        this.url = URL.createObjectURL(blob)

        this.audio.onloadedmetadata = () => {
          this.duration = this.audio.duration
          resolve(this.url)
        }
        this.audio.src = this.url
      }

      this.recorder.stop()
    })
  }

  /**
   * Stops recording and plays back the captured audio on a loop.
   * Async. Resolves with `false` if no audio was captured.
   */
  async play() {
    const url = await this.stop()
    if (!url) return false

    this.audio.loop = true
    await this.audio.play()
    return true
  }

  /** Saves the last take to a file. No-op if there's no take. */
  download(filename = 'recording.webm') {
    if (this.url) download(this.url, filename)
  }

  /** Resets everything to default state. */
  reset() {
    if (this.url) URL.revokeObjectURL(this.url)

    this.audio.pause()
    this.audio.currentTime = 0
    this.audio.removeAttribute('src')

    this.url = undefined
    this.duration = undefined
    this.recordedChunks = []
    this.recorder = null
  }
}
