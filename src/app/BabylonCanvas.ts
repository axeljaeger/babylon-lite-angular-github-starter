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
  type Mesh,
  removeFromScene,
  markMaterialUboDirty
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
  private lastFpsAt = 0;

  private meshes = [] as Mesh[]
  
  private readonly resizeObserver = new ResizeObserver(() => {
    if (this.engine) {
      resizeEngine(this.engine);
    }
  });
  
  private readonly applyColorEffect = effect(() => {
    const material = this.sphereMaterial;
    const colorKey = this.color();
    if (material) {
      material.diffuseColor = colorLookup[colorKey];
      markMaterialUboDirty(material);
    }
  });

  async ngOnInit(): Promise<void> {
    await this.initialize();
  }

  private async initialize(): Promise<void> {
    const hasWebGpu = 'gpu' in navigator && navigator.gpu != null;

    if (!hasWebGpu) {
      this.error.set('Babylon Lite requires a browser with WebGPU support.');
      return;
    }

    const canvas = this.hostRef.nativeElement;

    try {
      this.engine = await createEngine(canvas);
      this.scene = createSceneContext(this.engine);
      this.camera = createArcRotateCamera(
        initialCamera.alpha,
        initialCamera.beta,
        initialCamera.radius,
        initialCamera.target,
      );
      const light = createHemisphericLight([0, 1, 0]);
      light.intensity = 0.7;
      
      const sphere = createSphere(this.engine, { diameter: 2, segments: 32 });
      sphere.position.y = 1;

      this.sphereMaterial = createStandardMaterial();
      sphere.material = this.sphereMaterial;
      this.sphereMaterial.diffuseColor = colorLookup[this.color()];

      const ground = createGround(this.engine, { width: 6, height: 6 });
      const groundMaterial = createStandardMaterial();
      ground.material = groundMaterial;

      this.scene.camera = this.camera;
      this.detachCameraControls = attachControl(this.camera, canvas, this.scene);

      this.meshes = [sphere, ground];

      for (const object of [...this.meshes, light]) {
        addToScene(this.scene, object);
      }

      onBeforeRender(this.scene, (deltaMs) => {
        const now = performance.now();

        if (deltaMs > 0 && now - this.lastFpsAt >= fpsUpdateIntervalMs) {
          this.fps.set(1000 / deltaMs);
          this.lastFpsAt = now;
        }
      });

      await registerScene(this.scene);

      this.resizeObserver?.observe(canvas);
      await startEngine(this.engine);

      if (this.error() !== null) {
        this.error.set(null);
      }
    } catch (error) {
      console.error('Babylon Lite initialization failed.', error);
      this.error.set('Babylon Lite could not be initialized.');
    }
  }

  ngOnDestroy(): void {
      for (const object of this.meshes) {
        removeFromScene(this.scene!, object);
      }
  
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
    Object.assign(this.camera, initialCamera)
  }
}
