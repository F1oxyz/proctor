import { Component } from '@angular/core';

@Component({
    selector: 'app-resultados',
    standalone: true,
    template: `
    <div class="p-8">
      <h1 class="text-2xl font-bold">Resultados de la Sesión</h1>
      <p class="text-gray-600 mt-2">Aquí se mostrarán los resultados de los alumnos.</p>
    </div>
  `
})
export class ResultadosComponent { }
