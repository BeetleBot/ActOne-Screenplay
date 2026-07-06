// Ambient Sound Engine using Web Audio API
// Loads MP3 files and plays them in looping AudioBufferSourceNodes.

class AmbientSoundEngine {
  private ctx: AudioContext | null = null;
  private currentTrack: string | null = null;
  private volume: number = 0.5;
  private isPlaying: boolean = false;

  private mainVolumeNode: GainNode | null = null;
  private activeSources: AudioBufferSourceNode[] = [];
  private activeTimers: number[] = [];
  
  // Cache for loaded audio buffers
  private audioBuffers: { [key: string]: AudioBuffer } = {};


  constructor() {
    // Audio Context is initialized lazily on first user interaction.
  }

  private initContext() {
    if (!this.ctx) {
      const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
      this.ctx = new AudioCtx();
      
      this.mainVolumeNode = this.ctx.createGain();
      this.mainVolumeNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
      this.mainVolumeNode.connect(this.ctx.destination);
    }
    if (this.ctx.state === "suspended") {
      this.ctx.resume();
    }
  }

  public setVolume(vol: number) {
    this.volume = Math.max(0, Math.min(1, vol));
    if (this.mainVolumeNode && this.ctx) {
      this.mainVolumeNode.gain.setValueAtTime(this.volume, this.ctx.currentTime);
    }
  }

  public getVolume(): number {
    return this.volume;
  }

  public getActiveTrack(): string | null {
    return this.currentTrack;
  }

  private async loadAudio(url: string): Promise<AudioBuffer | null> {
    if (this.audioBuffers[url]) {
      return this.audioBuffers[url];
    }
    try {
      this.initContext();
      const response = await fetch(url);
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.ctx!.decodeAudioData(arrayBuffer);
      this.audioBuffers[url] = audioBuffer;
      return audioBuffer;
    } catch (e) {
      console.error("Failed to load audio:", url, e);
      return null;
    }
  }

  public async play(trackName: string) {
    this.stop();
    this.initContext();
    this.currentTrack = trackName;
    this.isPlaying = true;



    let url = "";
    switch (trackName) {
      case "Light Rain": url = "/sounds/light-rain.mp3"; break;
      case "Coffee Shop": url = "/sounds/cafe.mp3"; break;
      case "Wind in Trees": url = "/sounds/wind-in-trees.mp3"; break;
      case "Ocean Waves": url = "/sounds/waves.mp3"; break;
      default: return;
    }

    const buffer = await this.loadAudio(url);

    // Check if we stopped or changed track while loading
    if (!this.isPlaying || this.currentTrack !== trackName || !buffer) return;

    const source = this.ctx!.createBufferSource();
    source.buffer = buffer;
    source.loop = true;
    source.connect(this.mainVolumeNode!);
    source.start();
    this.activeSources.push(source);
  }

  public stop() {
    this.isPlaying = false;
    this.currentTrack = null;

    this.activeSources.forEach((node) => {
      try {
        node.stop();
        node.disconnect();
      } catch (e) {}
    });
    this.activeSources = [];

    this.activeTimers.forEach((timer) => clearTimeout(timer));
    this.activeTimers = [];
  }

}

export const ambientSoundEngine = new AmbientSoundEngine();
