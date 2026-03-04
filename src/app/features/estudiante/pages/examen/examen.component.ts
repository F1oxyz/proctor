import { Component } from '@angular/core';

@Component({
    selector: 'app-examen',
    standalone: true,
    template: `
    <div class="p-8">
      <h1 class="text-2xl font-bold">Evaluación en curso</h1>
      <p class="text-gray-600 mt-2">Responde las preguntas cuidadosamente.</p>
    </div>
  `
})
export class ExamenComponent { }
