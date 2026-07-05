import { Directive, ElementRef, effect, inject, model, signal, type OnDestroy, type OnInit } from '@angular/core';
import type {
  ArcRotateCamera,
  EngineContext,
  SceneContext,
  StandardMaterialProps,
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

@Directive({
  selector: 'canvas[babylonCanvas]',
})
export class BabylonCanvas implements OnInit, OnDestroy {
  private readonly hostRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);
  private lite: typeof import('@babylonjs/lite') | null = null;

  public readonly color = model.required<PresetColor>();
  public readonly fps = signal(0);
  public readonly error = signal<string | null>(null);

  public engine: EngineContext | null = null;
  public scene: SceneContext | null = null;
  public camera: ArcRotateCamera | null = null;

  private sphereMaterial: StandardMaterialProps | null = null;
  private detachCameraControls: (() => void) | null = null;
  private destroyed = false;
  private resizeObserver: ResizeObserver | null = null;
  private readonly applyColorEffect = effect(() => {
    const material = this.sphereMaterial;

    if (material) {
      material.diffuseColor = colorLookup[this.color()];
    }
  });

  async ngOnInit(): Promise<void> {
    if (!('gpu' in navigator)) {
      this.error.set('Babylon Lite benötigt einen Browser mit WebGPU-Unterstützung.');
      return;
    }

    const canvas = this.hostRef.nativeElement;

    try {
      const lite = await import('@babylonjs/lite');
      const engine = await lite.createEngine(canvas);

      if (this.destroyed) {
        lite.disposeEngine(engine);
        return;
      }

      const scene = lite.createSceneContext(engine);
      const camera = lite.createArcRotateCamera(
        initialCamera.alpha,
        initialCamera.beta,
        initialCamera.radius,
        initialCamera.target,
      );
      const light = lite.createHemisphericLight([0, 1, 0]);
      const sphere = lite.createSphere(engine, { diameter: 2, segments: 32 });
      const ground = lite.createGround(engine, { width: 6, height: 6 });
      const sphereMaterial = lite.createStandardMaterial();

      this.lite = lite;
      this.engine = engine;
      this.scene = scene;
      this.camera = camera;
      this.sphereMaterial = sphereMaterial;
      this.resizeObserver ??= typeof ResizeObserver === 'undefined'
        ? null
        : new ResizeObserver(() => {
            if (this.engine && this.lite) {
              this.lite.resizeEngine(this.engine);
            }
          });

      scene.camera = camera;
      this.detachCameraControls = lite.attachControl(camera, canvas, scene);

      light.intensity = 0.7;
      sphere.position.y = 1;
      sphere.material = sphereMaterial;
      sphereMaterial.diffuseColor = colorLookup[this.color()];

      lite.addToScene(scene, light);
      lite.addToScene(scene, sphere);
      lite.addToScene(scene, ground);

      lite.onBeforeRender(scene, (deltaMs) => {
        if (deltaMs > 0) {
          this.fps.set(1000 / deltaMs);
        }
      });

      await lite.registerScene(scene);

      if (this.destroyed) {
        lite.disposeScene(scene);
        lite.disposeEngine(engine);
        return;
      }

      this.resizeObserver?.observe(canvas);
      await lite.startEngine(engine);
      this.error.set(null);
    } catch {
      this.error.set('Babylon Lite konnte nicht initialisiert werden.');
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachCameraControls?.();
    this.resizeObserver?.disconnect();

    if (this.engine && this.scene && this.lite) {
      this.lite.stopEngine(this.engine);
      this.lite.disposeScene(this.scene);
      this.lite.disposeEngine(this.engine);
    }
  }

  public resetCamera(): void {
    if (!this.camera) {
      return;
    }

    this.camera.alpha = initialCamera.alpha;
    this.camera.beta = initialCamera.beta;
    this.camera.radius = initialCamera.radius;
    this.camera.target = { ...initialCamera.target };
  }
}
