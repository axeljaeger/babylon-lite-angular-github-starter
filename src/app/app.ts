import { Component, model, viewChild } from '@angular/core';
import { BabylonCanvas } from './BabylonCanvas';
import { type PresetColor, Sidebar } from './sidebar/sidebar';

@Component({
  selector: 'app-root',
  imports: [BabylonCanvas, Sidebar],
  templateUrl: './app.html',
  styleUrl: './app.css',
})
export class App {
  protected readonly babylon = viewChild.required(BabylonCanvas);
  protected readonly color = model<PresetColor>('red');
}
