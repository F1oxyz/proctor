import { Component, ChangeDetectionStrategy } from '@angular/core';
import { CardDocenteComponent } from './card-docente/card-docente.component';
import { CardEstudianteComponent } from './card-estudiante/card-estudiante.component';

@Component({
  selector: 'app-login',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [CardDocenteComponent, CardEstudianteComponent],
  template: `
    <div class="min-h-screen bg-gray-50 flex flex-col">

      <!-- Header mínimo -->
      <header class="px-8 py-5 border-b border-gray-100 bg-white">
        <div class="flex items-center gap-2">
          <div class="w-7 h-7 bg-blue-600 rounded-md flex items-center justify-center">
            <svg class="w-4 h-4 text-white" fill="none" stroke="currentColor" stroke-width="2" viewBox="0 0 24 24">
              <path stroke-linecap="round" stroke-linejoin="round"
                d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414A1 1 0 0119 9.414V19a2 2 0 01-2 2z" />
            </svg>
          </div>
          <span class="text-slate-800 font-semibold text-base tracking-tight">Proctor</span>
        </div>
      </header>

      <!-- Contenido centrado -->
      <main class="flex-1 flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-4xl">

          <!-- Título superior -->
          <div class="text-center mb-10">
            <h1 class="text-2xl font-semibold text-slate-800">Sistema de Evaluación</h1>
            <p class="text-sm text-slate-500 mt-2">Selecciona tu rol para continuar</p>
          </div>

          <!-- Cards en grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <app-card-estudiante />
            <app-card-docente />
          </div>

        </div>
      </main>

      <!-- Footer -->
      <footer class="py-4 text-center text-xs text-slate-400 border-t border-gray-100">
        © 2024 Universidad · Sistema de Gestión Académica. Todos los derechos reservados.
      </footer>

    </div>
  `
})
export class LoginComponent {}