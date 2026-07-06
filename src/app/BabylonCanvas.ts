import { Directive, effect, ElementRef, inject, model, type OnDestroy, type OnInit, signal } from '@angular/core';
import {
  type ArcRotateCamera,
  type EngineContext,
  type SceneContext,
  type StandardMaterialProps,
  resizeEngine,
  disposeScene,
  disposeEngine,
  stopEngine,
  registerScene,
  startEngine,
  createEngine,
  createSceneContext,
  createArcRotateCamera,
  createHemisphericLight,
  createSphere,
  createGround,
  createStandardMaterial,
  addToScene,
  onBeforeRender,
  attachControl,
} from '@babylonjs/lite';
import type { PresetColor } from './sidebar/sidebar';

const colorLookup: Record<PresetColor, [number, number, number]> = {
  red: [1, 0, 0],
  green: [0, 1, 0],
  blue: [0, 0, 1],
};

const initialCamera = {
  alpha: -Math.PI / 2,
  beta: Math.PI / 2.5,
  radius: 10,
  target: { x: 0, y: 1, z: 0 },
} as const;
const fpsUpdateIntervalMs = 500;

@Directive({
  selector: 'canvas[babylonCanvas]',
})
export class BabylonCanvas implements OnInit, OnDestroy {
  private readonly hostRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);

  public readonly color = model.required<PresetColor>();
  public readonly fps = signal(0);
  public readonly error = signal<string | null>(null);

  public engine: EngineContext | null = null;
  public scene: SceneContext | null = null;
  public camera: ArcRotateCamera | null = null;

  private sphereMaterial: StandardMaterialProps | null = null;
  private detachCameraControls: (() => void) | null = null;
  private destroyed = false;
  private lastFpsAt = 0;
  
  private readonly resizeObserver = new ResizeObserver(() => {
    if (this.engine) {
      resizeEngine(this.engine);
    }
  });
  
  private readonly applyColorEffect = effect(() => {
    const material = this.sphereMaterial;

    if (material) {
      material.diffuseColor = colorLookup[this.color()];
    }
  });

  ngOnInit(): void {
    void this.initialize();
  }

  private async initialize(): Promise<void> {
    const hasWebGpu = 'gpu' in navigator && navigator.gpu != null;

    if (!hasWebGpu) {
      this.error.set('Babylon Lite requires a browser with WebGPU support.');
      return;
    }

    const canvas = this.hostRef.nativeElement;

    try {
      const engine = await createEngine(canvas);

      if (this.destroyed) {
        disposeEngine(engine);
        return;
      }

      const scene = createSceneContext(engine);
      const camera = createArcRotateCamera(
        initialCamera.alpha,
        initialCamera.beta,
        initialCamera.radius,
        initialCamera.target,
      );
      const light = createHemisphericLight([0, 1, 0]);
      const sphere = createSphere(engine, { diameter: 2, segments: 32 });
      const ground = createGround(engine, { width: 6, height: 6 });
      const sphereMaterial = createStandardMaterial();

      this.engine = engine;
      this.scene = scene;
      this.camera = camera;
      this.sphereMaterial = sphereMaterial;

      scene.camera = camera;
      this.detachCameraControls = attachControl(camera, canvas, scene);

      light.intensity = 0.7;
      sphere.position.y = 1;
      sphere.material = sphereMaterial;
      sphereMaterial.diffuseColor = colorLookup[this.color()];

      addToScene(scene, light);
      addToScene(scene, sphere);
      addToScene(scene, ground);

      onBeforeRender(scene, (deltaMs) => {
        const now = performance.now();

        if (deltaMs > 0 && now - this.lastFpsAt >= fpsUpdateIntervalMs) {
          this.fps.set(1000 / deltaMs);
          this.lastFpsAt = now;
        }
      });

      await registerScene(scene);

      if (this.destroyed) {
        disposeScene(scene);
        disposeEngine(engine);
        return;
      }

      this.resizeObserver?.observe(canvas);
      await startEngine(engine);

      if (this.error() !== null) {
        this.error.set(null);
      }
    } catch (error) {
      console.error('Babylon Lite initialization failed.', error);
      this.error.set('Babylon Lite could not be initialized.');
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachCameraControls?.();
    this.resizeObserver?.disconnect();

    if (this.engine && this.scene) {
      stopEngine(this.engine);
      disposeScene(this.scene);
      disposeEngine(this.engine);
    }
  }

  public resetCamera(): void {
    if (!this.camera) {
      return;
    }

    this.camera.alpha = initialCamera.alpha;
    this.camera.beta = initialCamera.beta;
    this.camera.radius = initialCamera.radius;
    this.camera.target.x = initialCamera.target.x;
    this.camera.target.y = initialCamera.target.y;
    this.camera.target.z = initialCamera.target.z;
  }
}
