import { Directive, ElementRef, effect, inject, model, signal, type OnDestroy, type OnInit } from '@angular/core';
import {
  addToScene,
  attachControl,
  createArcRotateCamera,
  createEngine,
  createGround,
  createHemisphericLight,
  createSceneContext,
  createSphere,
  createStandardMaterial,
  disposeEngine,
  disposeScene,
  onBeforeRender,
  registerScene,
  resizeEngine,
  startEngine,
  stopEngine,
  type ArcRotateCamera,
  type EngineContext,
  type SceneContext,
  type StandardMaterialProps,
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

  public readonly color = model.required<PresetColor>();
  public readonly fps = signal(0);
  public readonly error = signal<string | null>(null);

  public engine: EngineContext | null = null;
  public scene: SceneContext | null = null;
  public camera: ArcRotateCamera | null = null;

  private sphereMaterial: StandardMaterialProps | null = null;
  private detachCameraControls: (() => void) | null = null;
  private destroyed = false;
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

  async ngOnInit(): Promise<void> {
    if (!('gpu' in navigator)) {
      this.error.set('Babylon Lite benötigt einen Browser mit WebGPU-Unterstützung.');
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
        if (deltaMs > 0) {
          this.fps.set(1000 / deltaMs);
        }
      });

      await registerScene(scene);

      if (this.destroyed) {
        disposeScene(scene);
        disposeEngine(engine);
        return;
      }

      this.resizeObserver.observe(canvas);
      await startEngine(engine);
      this.error.set(null);
    } catch {
      this.error.set('Babylon Lite konnte nicht initialisiert werden.');
    }
  }

  ngOnDestroy(): void {
    this.destroyed = true;
    this.detachCameraControls?.();
    this.resizeObserver.disconnect();

    if (this.engine) {
      stopEngine(this.engine);
      disposeScene(this.scene!);
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
    this.camera.target = { ...initialCamera.target };
  }
}
