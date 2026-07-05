import { Directive, effect, ElementRef, inject, model, type OnDestroy, type OnInit } from '@angular/core';

import { Scene } from '@babylonjs/core/scene';
import { Engine } from '@babylonjs/core/Engines/engine';
import { HemisphericLight } from '@babylonjs/core/Lights/hemisphericLight';
import { Vector3 } from '@babylonjs/core/Maths/math.vector';
import { FreeCamera } from '@babylonjs/core/Cameras/freeCamera';
import { CreateSphere } from '@babylonjs/core/Meshes/Builders/sphereBuilder';
import { CreateGround } from '@babylonjs/core/Meshes/Builders/groundBuilder';

import '@babylonjs/core/Materials/standardMaterial';
import { StandardMaterial } from '@babylonjs/core/Materials/standardMaterial';
import { Color3 } from '@babylonjs/core/Maths/math.color';
import type { PresetColor } from './sidebar/sidebar';

// import { Inspector } from '@babylonjs/inspector';

const colorLookup: Record<PresetColor, Color3> = {
  red: Color3.Red(),
  green: Color3.Green(),
  blue: Color3.Blue()
}

@Directive({
  selector: 'canvas[babylonCanvas]'
})
export class BabylonCanvas implements OnInit, OnDestroy {
  private readonly hostRef = inject<ElementRef<HTMLCanvasElement>>(ElementRef);

  public readonly color = model.required<PresetColor>();
  private readonly _applyColor = effect(() => this.sphereMaterial.diffuseColor = colorLookup[this.color()]);

  public engine = new Engine(this.hostRef.nativeElement, true);
  public scene = new Scene(this.engine);
  public camera = new FreeCamera("camera1", new Vector3(0, 5, -10), this.scene);

  private sphere = CreateSphere("sphere", { diameter: 2, segments: 32 }, this.scene);
  private sphereMaterial = new StandardMaterial("sphereMat", this.scene);

  private resizeObserver = new ResizeObserver(() => { this.engine.resize(true); this.scene.render(); });
  
  ngOnInit() {
    this.camera.setTarget(Vector3.Zero());
    this.camera.attachControl(this.hostRef.nativeElement, true);

    const light = new HemisphericLight("light", new Vector3(0, 1, 0), this.scene);
    light.intensity = 0.7;

    this.sphere.position.y = 1;
    this.sphere.material = this.sphereMaterial;

    CreateGround("ground", { width: 6, height: 6 }, this.scene);

    this.engine.runRenderLoop(() => this.scene.render());
    this.resizeObserver.observe(this.hostRef.nativeElement);
  };

  ngOnDestroy(): void {
    this.engine?.stopRenderLoop();
    this.engine?.dispose();
    this.resizeObserver.unobserve(this.hostRef.nativeElement);
  }

  public resetCamera() {
    this.camera.setTarget(Vector3.Zero());
  }
}
