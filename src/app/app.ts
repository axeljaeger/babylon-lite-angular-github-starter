import { type AfterViewInit, Component, model, signal, viewChild } from '@angular/core';
import { BabylonCanvas } from './BabylonCanvas';
import { type PresetColor, Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [BabylonCanvas, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App implements AfterViewInit {
  protected readonly babylon = viewChild.required(BabylonCanvas);
  public readonly fps = signal(0);
  protected readonly color = model<PresetColor>('red');

  ngAfterViewInit(): void {
    window.setInterval(() => this.fps.set(this.babylon().engine.getFps()), 1000);
  }
}
