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
          <div class="w-7 h-7 rounded-md flex items-center justify-center">
            <svg  xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#0065e0"><path d="M240-40H120q-33 0-56.5-23.5T40-120v-120h80v120h120v80Zm480 0v-80h120v-120h80v120q0 33-23.5 56.5T840-40H720ZM480-220q-120 0-217.5-71T120-480q45-118 142.5-189T480-740q120 0 217.5 71T840-480q-45 118-142.5 189T480-220Zm0-80q88 0 161-48t112-132q-39-84-112-132t-161-48q-88 0-161 48T207-480q39 84 112 132t161 48Zm0-40q58 0 99-41t41-99q0-58-41-99t-99-41q-58 0-99 41t-41 99q0 58 41 99t99 41Zm0-80q-25 0-42.5-17.5T420-480q0-25 17.5-42.5T480-540q25 0 42.5 17.5T540-480q0 25-17.5 42.5T480-420ZM40-720v-120q0-33 23.5-56.5T120-920h120v80H120v120H40Zm800 0v-120H720v-80h120q33 0 56.5 23.5T920-840v120h-80ZM480-480Z"/></svg>
          </div>
          <span class="text-slate-800 font-semibold text-lg tracking-tight">Proctor</span>
        </div>
      </header>

      <!-- Contenido centrado -->
      <main class="flex-1 flex items-center justify-center px-4 py-12">
        <div class="w-full max-w-4xl">

          <!-- Título superior -->
          <div class="text-center mb-10">
            <h1 class="text-4xl font-bold text-slate-800">Sistema de Evaluación</h1>
            <p class="text-sm text-slate-500 mt-2">Selecciona tu rol para continuar</p>
          </div>

          <!-- Cards en grid -->
          <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
            <app-card-estudiante />
            <app-card-docente />
          </div>

        </div>
      </main>

    </div>
  `
})
export class LoginComponent {}