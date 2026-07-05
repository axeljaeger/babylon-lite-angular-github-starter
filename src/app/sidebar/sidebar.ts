import { DecimalPipe } from '@angular/common';
import { Component, input, model, output } from '@angular/core';
import { FormsModule } from '@angular/forms';

export type PresetColor = 'red' | 'green' | 'blue';

@Component({
  selector: 'details[sidebar]',
  templateUrl: './sidebar.html',
  styleUrl: './sidebar.css',
  imports: [ DecimalPipe, FormsModule ]
})
export class Sidebar {
  public readonly fps = input<number>(0);
  public readonly resetCamera = output();
  public readonly color = model.required<PresetColor>();
}
