/**
 * Input Management System
 * Handles keyboard, mouse, and touch input with event processing and state tracking
 * Provides action mapping and input buffering for responsive gameplay
 */

import { Vector2 } from "../../utils/math.ts";

/**
 * Input event types
 */
export type InputEventType =
  | "keydown"
  | "keyup"
  | "mousedown"
  | "mouseup"
  | "mousemove"
  | "wheel"
  | "touchstart"
  | "touchend"
  | "touchmove";

/**
 * Input event data
 */
export interface InputEvent {
  type: InputEventType;
  key?: string;
  button?: number;
  position?: Vector2;
  deltaX?: number;
  deltaY?: number;
  timestamp: number;
}

/**
 * Action mapping configuration
 */
export interface ActionMapping {
  /** Action name */
  action: string;
  /** Input keys/buttons that trigger this action */
  inputs: string[];
  /** Whether this is a continuous action (like movement) */
  continuous?: boolean;
}

/**
 * Input state for a single frame
 */
export interface InputState {
  /** Currently pressed keys */
  keysDown: Set<string>;
  /** Keys pressed this frame */
  keysPressed: Set<string>;
  /** Keys released this frame */
  keysReleased: Set<string>;
  /** Currently pressed mouse buttons */
  mouseButtonsDown: Set<number>;
  /** Mouse buttons pressed this frame */
  mouseButtonsPressed: Set<number>;
  /** Mouse buttons released this frame */
  mouseButtonsReleased: Set<number>;
  /** Current mouse position */
  mousePosition: Vector2;
  /** Mouse movement delta this frame */
  mouseDelta: Vector2;
  /** Mouse wheel delta this frame */
  wheelDelta: Vector2;
  /** Currently active touches */
  touches: Map<number, Vector2>;
  /** Active actions this frame */
  activeActions: Set<string>;
  /** Actions that started this frame */
  actionsPressed: Set<string>;
  /** Actions that ended this frame */
  actionsReleased: Set<string>;
}

/**
 * Input manager handles all user input and provides a unified interface
 */
export class InputManager {
  private canvas: HTMLCanvasElement;
  private enabled = true;

  // Current input state
  private currentState: InputState;
  private previousState: InputState;

  // Action mappings
  private actionMappings: Map<string, ActionMapping> = new Map();
  private keyToActions: Map<string, string[]> = new Map();

  // Event handlers (bound to maintain 'this' context)
  private boundKeyDown = this.handleKeyDown.bind(this);
  private boundKeyUp = this.handleKeyUp.bind(this);
  private boundMouseDown = this.handleMouseDown.bind(this);
  private boundMouseUp = this.handleMouseUp.bind(this);
  private boundMouseMove = this.handleMouseMove.bind(this);
  private boundWheel = this.handleWheel.bind(this);
  private boundTouchStart = this.handleTouchStart.bind(this);
  private boundTouchEnd = this.handleTouchEnd.bind(this);
  private boundTouchMove = this.handleTouchMove.bind(this);
  private boundContextMenu = this.handleContextMenu.bind(this);

  // Input buffering for responsive controls
  private inputBuffer: InputEvent[] = [];
  private bufferMaxSize = 60; // Buffer up to 1 second at 60fps

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;

    // Initialize input states
    this.currentState = this.createEmptyState();
    this.previousState = this.createEmptyState();

    this.setupEventListeners();
  }

  /**
   * Creates an empty input state
   */
  private createEmptyState(): InputState {
    return {
      keysDown: new Set(),
      keysPressed: new Set(),
      keysReleased: new Set(),
      mouseButtonsDown: new Set(),
      mouseButtonsPressed: new Set(),
      mouseButtonsReleased: new Set(),
      mousePosition: { x: 0, y: 0 },
      mouseDelta: { x: 0, y: 0 },
      wheelDelta: { x: 0, y: 0 },
      touches: new Map(),
      activeActions: new Set(),
      actionsPressed: new Set(),
      actionsReleased: new Set(),
    };
  }

  /**
   * Sets up event listeners for all input types
   */
  private setupEventListeners(): void {
    // Keyboard events (global)
    window.addEventListener("keydown", this.boundKeyDown);
    window.addEventListener("keyup", this.boundKeyUp);

    // Mouse events (canvas-specific)
    this.canvas.addEventListener("mousedown", this.boundMouseDown);
    this.canvas.addEventListener("mouseup", this.boundMouseUp);
    this.canvas.addEventListener("mousemove", this.boundMouseMove);
    this.canvas.addEventListener("wheel", this.boundWheel);

    // Touch events (canvas-specific)
    this.canvas.addEventListener("touchstart", this.boundTouchStart, {
      passive: false,
    });
    this.canvas.addEventListener("touchend", this.boundTouchEnd, {
      passive: false,
    });
    this.canvas.addEventListener("touchmove", this.boundTouchMove, {
      passive: false,
    });

    // Prevent context menu on right-click
    this.canvas.addEventListener("contextmenu", this.boundContextMenu);

    // Make canvas focusable for keyboard input
    this.canvas.tabIndex = 0;
    this.canvas.focus();
  }

  /**
   * Removes all event listeners
   */
  private removeEventListeners(): void {
    window.removeEventListener("keydown", this.boundKeyDown);
    window.removeEventListener("keyup", this.boundKeyUp);

    this.canvas.removeEventListener("mousedown", this.boundMouseDown);
    this.canvas.removeEventListener("mouseup", this.boundMouseUp);
    this.canvas.removeEventListener("mousemove", this.boundMouseMove);
    this.canvas.removeEventListener("wheel", this.boundWheel);

    this.canvas.removeEventListener("touchstart", this.boundTouchStart);
    this.canvas.removeEventListener("touchend", this.boundTouchEnd);
    this.canvas.removeEventListener("touchmove", this.boundTouchMove);

    this.canvas.removeEventListener("contextmenu", this.boundContextMenu);
  }

  /**
   * Keyboard event handlers
   */
  private handleKeyDown(event: KeyboardEvent): void {
    if (!this.enabled) return;

    const key = event.code;
    this.addInputEvent({ type: "keydown", key, timestamp: performance.now() });

    // Prevent default behavior for game keys
    if (this.isGameKey(key)) {
      event.preventDefault();
    }
  }

  private handleKeyUp(event: KeyboardEvent): void {
    if (!this.enabled) return;

    const key = event.code;
    this.addInputEvent({ type: "keyup", key, timestamp: performance.now() });

    if (this.isGameKey(key)) {
      event.preventDefault();
    }
  }

  /**
   * Mouse event handlers
   */
  private handleMouseDown(event: MouseEvent): void {
    if (!this.enabled) return;

    const position = this.getMousePositionFromEvent(event);
    this.addInputEvent({
      type: "mousedown",
      button: event.button,
      position,
      timestamp: performance.now(),
    });

    event.preventDefault();
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.enabled) return;

    const position = this.getMousePositionFromEvent(event);
    this.addInputEvent({
      type: "mouseup",
      button: event.button,
      position,
      timestamp: performance.now(),
    });

    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.enabled) return;

    const position = this.getMousePositionFromEvent(event);
    this.addInputEvent({
      type: "mousemove",
      position,
      deltaX: event.movementX,
      deltaY: event.movementY,
      timestamp: performance.now(),
    });
  }

  private handleWheel(event: WheelEvent): void {
    if (!this.enabled) return;

    this.addInputEvent({
      type: "wheel",
      deltaX: event.deltaX,
      deltaY: event.deltaY,
      timestamp: performance.now(),
    });

    event.preventDefault();
  }

  /**
   * Touch event handlers
   */
  private handleTouchStart(event: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const position = this.getTouchPosition(touch);

      this.addInputEvent({
        type: "touchstart",
        position,
        timestamp: performance.now(),
      });
    }

    event.preventDefault();
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const position = this.getTouchPosition(touch);

      this.addInputEvent({
        type: "touchend",
        position,
        timestamp: performance.now(),
      });
    }

    event.preventDefault();
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.enabled) return;

    for (let i = 0; i < event.changedTouches.length; i++) {
      const touch = event.changedTouches[i];
      const position = this.getTouchPosition(touch);

      this.addInputEvent({
        type: "touchmove",
        position,
        timestamp: performance.now(),
      });
    }

    event.preventDefault();
  }

  private handleContextMenu(event: Event): void {
    event.preventDefault();
  }

  /**
   * Gets mouse position relative to canvas
   */
  private getMousePositionFromEvent(event: MouseEvent): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }

  /**
   * Gets touch position relative to canvas
   */
  private getTouchPosition(touch: Touch): Vector2 {
    const rect = this.canvas.getBoundingClientRect();
    return {
      x: touch.clientX - rect.left,
      y: touch.clientY - rect.top,
    };
  }

  /**
   * Checks if a key is used by the game (to prevent default behavior)
   */
  private isGameKey(key: string): boolean {
    const gameKeys = [
      "Space",
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "KeyW",
      "KeyA",
      "KeyS",
      "KeyD",
      "Escape",
      "Enter",
      "Tab",
    ];
    return gameKeys.includes(key);
  }

  /**
   * Adds an input event to the buffer
   */
  private addInputEvent(event: InputEvent): void {
    this.inputBuffer.push(event);

    // Trim buffer if it gets too large
    if (this.inputBuffer.length > this.bufferMaxSize) {
      this.inputBuffer = this.inputBuffer.slice(-this.bufferMaxSize);
    }
  }

  /**
   * Updates input state (call once per frame)
   */
  update(): void {
    // Store previous state
    this.previousState = {
      keysDown: new Set(this.currentState.keysDown),
      keysPressed: new Set(),
      keysReleased: new Set(),
      mouseButtonsDown: new Set(this.currentState.mouseButtonsDown),
      mouseButtonsPressed: new Set(),
      mouseButtonsReleased: new Set(),
      mousePosition: { ...this.currentState.mousePosition },
      mouseDelta: { x: 0, y: 0 },
      wheelDelta: { x: 0, y: 0 },
      touches: new Map(this.currentState.touches),
      activeActions: new Set(this.currentState.activeActions),
      actionsPressed: new Set(),
      actionsReleased: new Set(),
    };

    // Clear frame-specific data
    this.currentState.keysPressed.clear();
    this.currentState.keysReleased.clear();
    this.currentState.mouseButtonsPressed.clear();
    this.currentState.mouseButtonsReleased.clear();
    this.currentState.mouseDelta.x = 0;
    this.currentState.mouseDelta.y = 0;
    this.currentState.wheelDelta.x = 0;
    this.currentState.wheelDelta.y = 0;
    this.currentState.actionsPressed.clear();
    this.currentState.actionsReleased.clear();

    // Process buffered input events
    for (const event of this.inputBuffer) {
      this.processInputEvent(event);
    }

    // Clear input buffer
    this.inputBuffer = [];

    // Update actions based on input state
    this.updateActions();
  }

  /**
   * Processes a single input event
   */
  private processInputEvent(event: InputEvent): void {
    switch (event.type) {
      case "keydown":
        if (event.key && !this.currentState.keysDown.has(event.key)) {
          this.currentState.keysDown.add(event.key);
          this.currentState.keysPressed.add(event.key);
        }
        break;

      case "keyup":
        if (event.key && this.currentState.keysDown.has(event.key)) {
          this.currentState.keysDown.delete(event.key);
          this.currentState.keysReleased.add(event.key);
        }
        break;

      case "mousedown":
        if (
          event.button !== undefined &&
          !this.currentState.mouseButtonsDown.has(event.button)
        ) {
          this.currentState.mouseButtonsDown.add(event.button);
          this.currentState.mouseButtonsPressed.add(event.button);
        }
        break;

      case "mouseup":
        if (
          event.button !== undefined &&
          this.currentState.mouseButtonsDown.has(event.button)
        ) {
          this.currentState.mouseButtonsDown.delete(event.button);
          this.currentState.mouseButtonsReleased.add(event.button);
        }
        break;

      case "mousemove":
        if (event.position) {
          this.currentState.mousePosition = event.position;
        }
        if (event.deltaX !== undefined) {
          this.currentState.mouseDelta.x += event.deltaX;
        }
        if (event.deltaY !== undefined) {
          this.currentState.mouseDelta.y += event.deltaY;
        }
        break;

      case "wheel":
        if (event.deltaX !== undefined) {
          this.currentState.wheelDelta.x += event.deltaX;
        }
        if (event.deltaY !== undefined) {
          this.currentState.wheelDelta.y += event.deltaY;
        }
        break;
    }
  }

  /**
   * Updates action states based on current input
   */
  private updateActions(): void {
    const previousActions = new Set(this.currentState.activeActions);
    this.currentState.activeActions.clear();

    // Check each action mapping
    for (const [actionName, mapping] of this.actionMappings) {
      let actionActive = false;

      // Check if any of the mapped inputs are active
      for (const input of mapping.inputs) {
        if (this.isInputActive(input)) {
          actionActive = true;
          break;
        }
      }

      if (actionActive) {
        this.currentState.activeActions.add(actionName);

        // Check if action just started
        if (!previousActions.has(actionName)) {
          this.currentState.actionsPressed.add(actionName);
        }
      } else if (previousActions.has(actionName)) {
        // Action just ended
        this.currentState.actionsReleased.add(actionName);
      }
    }
  }

  /**
   * Checks if an input (key or mouse button) is currently active
   */
  private isInputActive(input: string): boolean {
    // Check keyboard input
    if (this.currentState.keysDown.has(input)) {
      return true;
    }

    // Check mouse button input
    if (input.startsWith("Mouse")) {
      const buttonNumber = parseInt(input.replace("Mouse", ""));
      return this.currentState.mouseButtonsDown.has(buttonNumber);
    }

    return false;
  }

  /**
   * Registers an action mapping
   */
  registerAction(mapping: ActionMapping): void {
    this.actionMappings.set(mapping.action, mapping);

    // Update key-to-actions mapping for quick lookup
    for (const input of mapping.inputs) {
      if (!this.keyToActions.has(input)) {
        this.keyToActions.set(input, []);
      }
      this.keyToActions.get(input)!.push(mapping.action);
    }
  }

  /**
   * Unregisters an action mapping
   */
  unregisterAction(actionName: string): void {
    const mapping = this.actionMappings.get(actionName);
    if (mapping) {
      // Remove from key-to-actions mapping
      for (const input of mapping.inputs) {
        const actions = this.keyToActions.get(input);
        if (actions) {
          const index = actions.indexOf(actionName);
          if (index >= 0) {
            actions.splice(index, 1);
          }
          if (actions.length === 0) {
            this.keyToActions.delete(input);
          }
        }
      }

      this.actionMappings.delete(actionName);
    }
  }

  /**
   * Input state query methods
   */

  isKeyDown(key: string): boolean {
    return this.currentState.keysDown.has(key);
  }

  isKeyPressed(key: string): boolean {
    return this.currentState.keysPressed.has(key);
  }

  isKeyReleased(key: string): boolean {
    return this.currentState.keysReleased.has(key);
  }

  isMouseButtonDown(button: number): boolean {
    return this.currentState.mouseButtonsDown.has(button);
  }

  isMouseButtonPressed(button: number): boolean {
    return this.currentState.mouseButtonsPressed.has(button);
  }

  isMouseButtonReleased(button: number): boolean {
    return this.currentState.mouseButtonsReleased.has(button);
  }

  getMousePosition(): Vector2 {
    return { ...this.currentState.mousePosition };
  }

  getMouseDelta(): Vector2 {
    return { ...this.currentState.mouseDelta };
  }

  getWheelDelta(): Vector2 {
    return { ...this.currentState.wheelDelta };
  }

  isActionActive(actionName: string): boolean {
    return this.currentState.activeActions.has(actionName);
  }

  isActionPressed(actionName: string): boolean {
    return this.currentState.actionsPressed.has(actionName);
  }

  isActionReleased(actionName: string): boolean {
    return this.currentState.actionsReleased.has(actionName);
  }

  /**
   * Control methods
   */

  setEnabled(enabled: boolean): void {
    this.enabled = enabled;
    if (!enabled) {
      // Clear all input state when disabled
      this.currentState = this.createEmptyState();
    }
  }

  isEnabled(): boolean {
    return this.enabled;
  }

  /**
   * Cleanup
   */
  destroy(): void {
    this.removeEventListeners();
    this.actionMappings.clear();
    this.keyToActions.clear();
    this.inputBuffer = [];
  }
}
