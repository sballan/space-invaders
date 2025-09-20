/**
 * Audio Management System
 * Handles loading, playing, and managing audio assets using Web Audio API
 * Provides sound effects and music playback with volume and spatial audio support
 */

/**
 * Audio configuration options
 */
export interface AudioOptions {
  /** Volume level (0.0 to 1.0) */
  volume?: number;
  /** Whether the audio should loop */
  loop?: boolean;
  /** Playback rate (1.0 = normal speed) */
  playbackRate?: number;
  /** Pan value (-1.0 = left, 0 = center, 1.0 = right) */
  pan?: number;
}

/**
 * Audio source data
 */
export interface AudioSource {
  /** Audio buffer containing the decoded audio data */
  buffer: AudioBuffer;
  /** Original duration in seconds */
  duration: number;
  /** Whether this is a music track (for volume grouping) */
  isMusic?: boolean;
}

/**
 * Playing audio instance
 */
export interface AudioInstance {
  /** Web Audio source node */
  source: AudioBufferSourceNode;
  /** Gain node for volume control */
  gainNode: GainNode;
  /** Panner node for spatial audio */
  pannerNode: StereoPannerNode;
  /** Unique identifier for this instance */
  id: string;
  /** Name of the audio source */
  sourceName: string;
  /** Whether this instance is currently playing */
  playing: boolean;
  /** Start time for tracking playback */
  startTime: number;
}

/**
 * Audio manager handles all audio operations using Web Audio API
 */
export class AudioManager {
  private audioContext: AudioContext;
  private masterGainNode: GainNode;
  private sfxGainNode: GainNode;
  private musicGainNode: GainNode;

  // Audio sources cache
  private audioSources: Map<string, AudioSource> = new Map();

  // Playing audio instances
  private playingInstances: Map<string, AudioInstance> = new Map();

  // Volume settings
  private masterVolume = 1.0;
  private sfxVolume = 1.0;
  private musicVolume = 0.8;

  // Instance counter for unique IDs
  private instanceCounter = 0;

  // Audio context state
  private isInitialized = false;

  constructor() {
    // Initialize Audio Context
    this.audioContext =
      new (window.AudioContext || (window as any).webkitAudioContext)();

    // Create master gain node
    this.masterGainNode = this.audioContext.createGain();
    this.masterGainNode.connect(this.audioContext.destination);

    // Create separate gain nodes for SFX and music
    this.sfxGainNode = this.audioContext.createGain();
    this.sfxGainNode.connect(this.masterGainNode);

    this.musicGainNode = this.audioContext.createGain();
    this.musicGainNode.connect(this.masterGainNode);

    // Set initial volumes
    this.updateVolumeNodes();

    // Handle page visibility change (pause/resume audio)
    document.addEventListener(
      "visibilitychange",
      this.handleVisibilityChange.bind(this),
    );
  }

  /**
   * Initializes the audio context (must be called after user interaction)
   */
  async initialize(): Promise<void> {
    if (this.isInitialized) return;

    try {
      // Resume audio context if it's suspended
      if (this.audioContext.state === "suspended") {
        await this.audioContext.resume();
      }

      this.isInitialized = true;
      console.log("Audio system initialized");
    } catch (error) {
      console.error("Failed to initialize audio system:", error);
      throw error;
    }
  }

  /**
   * Loads an audio file from a URL
   */
  async loadAudio(name: string, url: string, isMusic = false): Promise<void> {
    if (this.audioSources.has(name)) {
      console.warn(`Audio '${name}' is already loaded`);
      return;
    }

    try {
      // Fetch the audio file
      const response = await fetch(url);
      if (!response.ok) {
        throw new Error(`Failed to fetch audio: ${response.statusText}`);
      }

      // Decode the audio data
      const arrayBuffer = await response.arrayBuffer();
      const audioBuffer = await this.audioContext.decodeAudioData(arrayBuffer);

      // Store the audio source
      const audioSource: AudioSource = {
        buffer: audioBuffer,
        duration: audioBuffer.duration,
        isMusic,
      };

      this.audioSources.set(name, audioSource);
      console.log(
        `Loaded audio '${name}' (${audioBuffer.duration.toFixed(2)}s)`,
      );
    } catch (error) {
      console.error(`Failed to load audio '${name}':`, error);
      throw error;
    }
  }

  /**
   * Plays an audio source with optional configuration
   */
  playAudio(name: string, options: AudioOptions = {}): string | null {
    if (!this.isInitialized) {
      console.warn("Audio system not initialized. Call initialize() first.");
      return null;
    }

    const audioSource = this.audioSources.get(name);
    if (!audioSource) {
      console.warn(`Audio source '${name}' not found`);
      return null;
    }

    try {
      // Create audio nodes
      const source = this.audioContext.createBufferSource();
      const gainNode = this.audioContext.createGain();
      const pannerNode = this.audioContext.createStereoPanner();

      // Configure source
      source.buffer = audioSource.buffer;
      source.loop = options.loop || false;
      source.playbackRate.value = options.playbackRate || 1.0;

      // Configure gain
      gainNode.gain.value = options.volume || 1.0;

      // Configure panner
      pannerNode.pan.value = options.pan || 0.0;

      // Connect audio graph
      source.connect(gainNode);
      gainNode.connect(pannerNode);

      // Connect to appropriate output (SFX or Music)
      if (audioSource.isMusic) {
        pannerNode.connect(this.musicGainNode);
      } else {
        pannerNode.connect(this.sfxGainNode);
      }

      // Create instance data
      const instanceId = `audio_${++this.instanceCounter}`;
      const instance: AudioInstance = {
        source,
        gainNode,
        pannerNode,
        id: instanceId,
        sourceName: name,
        playing: true,
        startTime: this.audioContext.currentTime,
      };

      // Handle playback end
      source.onended = () => {
        this.stopAudioInstance(instanceId);
      };

      // Store and start playback
      this.playingInstances.set(instanceId, instance);
      source.start();

      return instanceId;
    } catch (error) {
      console.error(`Failed to play audio '${name}':`, error);
      return null;
    }
  }

  /**
   * Stops a specific audio instance
   */
  stopAudio(instanceId: string): void {
    this.stopAudioInstance(instanceId);
  }

  /**
   * Stops all instances of a specific audio source
   */
  stopAllAudio(sourceName?: string): void {
    const instancesToStop = Array.from(this.playingInstances.values());

    for (const instance of instancesToStop) {
      if (!sourceName || instance.sourceName === sourceName) {
        this.stopAudioInstance(instance.id);
      }
    }
  }

  /**
   * Internal method to stop an audio instance
   */
  private stopAudioInstance(instanceId: string): void {
    const instance = this.playingInstances.get(instanceId);
    if (instance && instance.playing) {
      try {
        instance.source.stop();
      } catch (error) {
        // Source might already be stopped
      }

      instance.playing = false;
      this.playingInstances.delete(instanceId);
    }
  }

  /**
   * Adjusts the volume of a playing audio instance
   */
  setInstanceVolume(instanceId: string, volume: number): void {
    const instance = this.playingInstances.get(instanceId);
    if (instance) {
      instance.gainNode.gain.value = Math.max(0, Math.min(1, volume));
    }
  }

  /**
   * Adjusts the pan of a playing audio instance
   */
  setInstancePan(instanceId: string, pan: number): void {
    const instance = this.playingInstances.get(instanceId);
    if (instance) {
      instance.pannerNode.pan.value = Math.max(-1, Math.min(1, pan));
    }
  }

  /**
   * Volume control methods
   */

  setMasterVolume(volume: number): void {
    this.masterVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumeNodes();
  }

  setSfxVolume(volume: number): void {
    this.sfxVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumeNodes();
  }

  setMusicVolume(volume: number): void {
    this.musicVolume = Math.max(0, Math.min(1, volume));
    this.updateVolumeNodes();
  }

  getMasterVolume(): number {
    return this.masterVolume;
  }

  getSfxVolume(): number {
    return this.sfxVolume;
  }

  getMusicVolume(): number {
    return this.musicVolume;
  }

  /**
   * Updates volume nodes with current volume settings
   */
  private updateVolumeNodes(): void {
    this.masterGainNode.gain.value = this.masterVolume;
    this.sfxGainNode.gain.value = this.sfxVolume;
    this.musicGainNode.gain.value = this.musicVolume;
  }

  /**
   * Handles page visibility changes (pause/resume)
   */
  private handleVisibilityChange(): void {
    if (document.hidden) {
      // Page is hidden, suspend audio context to save resources
      if (this.audioContext.state === "running") {
        this.audioContext.suspend();
      }
    } else {
      // Page is visible, resume audio context
      if (this.audioContext.state === "suspended") {
        this.audioContext.resume();
      }
    }
  }

  /**
   * Convenience methods for common audio operations
   */

  /**
   * Plays a sound effect (short, non-looping audio)
   */
  playSfx(name: string, volume = 1.0): string | null {
    return this.playAudio(name, { volume, loop: false });
  }

  /**
   * Plays background music (looping audio)
   */
  playMusic(name: string, volume = 1.0, loop = true): string | null {
    // Stop any currently playing music
    this.stopAllMusic();

    return this.playAudio(name, { volume, loop });
  }

  /**
   * Stops all background music
   */
  stopAllMusic(): void {
    const musicInstances = Array.from(this.playingInstances.values())
      .filter((instance) => {
        const source = this.audioSources.get(instance.sourceName);
        return source?.isMusic;
      });

    for (const instance of musicInstances) {
      this.stopAudioInstance(instance.id);
    }
  }

  /**
   * Gets information about loaded audio sources
   */
  getAudioInfo(): { name: string; duration: number; isMusic: boolean }[] {
    return Array.from(this.audioSources.entries()).map(([name, source]) => ({
      name,
      duration: source.duration,
      isMusic: source.isMusic || false,
    }));
  }

  /**
   * Gets information about currently playing audio
   */
  getPlayingAudio(): { id: string; sourceName: string; playing: boolean }[] {
    return Array.from(this.playingInstances.values()).map((instance) => ({
      id: instance.id,
      sourceName: instance.sourceName,
      playing: instance.playing,
    }));
  }

  /**
   * Checks if audio is supported
   */
  isSupported(): boolean {
    return !!(window.AudioContext || (window as any).webkitAudioContext);
  }

  /**
   * Gets the current audio context state
   */
  getContextState(): AudioContextState {
    return this.audioContext.state;
  }

  /**
   * Destroys the audio manager and cleans up resources
   */
  async destroy(): Promise<void> {
    // Stop all playing audio
    this.stopAllAudio();

    // Remove event listeners
    document.removeEventListener(
      "visibilitychange",
      this.handleVisibilityChange,
    );

    // Close audio context
    if (this.audioContext.state !== "closed") {
      await this.audioContext.close();
    }

    // Clear data
    this.audioSources.clear();
    this.playingInstances.clear();

    this.isInitialized = false;
    console.log("Audio system destroyed");
  }
}
