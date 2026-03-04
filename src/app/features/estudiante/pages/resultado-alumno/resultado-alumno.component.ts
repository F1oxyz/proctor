import { Component } from '@angular/core';

@Component({
    selector: 'app-resultado-alumno',
    standalone: true,
    template: `
    <div class="p-8 text-center">
      <h1 class="text-2xl font-bold">Resultado de tu Examen</h1>
      <p class="text-gray-600 mt-2">Has finalizado la evaluación. Revisa tus resultados.</p>
    </div>
  `
})
export class ResultadoAlumnoComponent { }
