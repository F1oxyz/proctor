/**
 * monitor-navbar.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Navbar exclusivo del panel de monitoreo en vivo.
 * Se muestra arriba del grid de pantallas.
 *
 * CONTENIDO (según PDF - página 6):
 *  Izquierda:  Logo Proctor + "Proctor View • Session #XXXX"
 *  Centro:     Código del examen + título + contadores (alumnos / tiempo)
 *  Derecha:    Indicador "● Live Monitoring" + botón ⚙ + "End Session"
 *
 * ARQUITECTURA:
 *  - Componente dumb: recibe todos los datos como inputs
 *  - Emite `finalizarSesion` al docente para que confirme
 *  - OnPush
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
} from '@angular/core';

@Component({
  selector: 'app-monitor-navbar',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <header
      class="sticky top-0 z-40 bg-white border-b border-slate-200 px-4 py-3"
      role="banner"
    >
      <div class="flex items-center justify-between gap-4">

        <!-- ── Izquierda: logo + sesión ── -->
        <div class="flex items-center gap-3 min-w-0">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center shrink-0">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <div class="min-w-0">
            <p class="text-sm font-semibold text-slate-800 truncate">Proctor</p>
            <p class="text-xs text-slate-400 truncate">
              Proctor View • Session {{ codigoAcceso() }}
            </p>
          </div>
        </div>

        <!-- ── Centro: info del examen ── -->
        <div class="flex-1 min-w-0 text-center hidden md:block">
          <div class="flex items-center justify-center gap-2 flex-wrap">
            <!-- Badge código -->
            <span class="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {{ codigoExamen() }}
            </span>
            <h1 class="text-sm font-bold text-slate-900 truncate max-w-xs">
              {{ tituloExamen() }}
            </h1>
          </div>
          <div class="flex items-center justify-center gap-4 mt-0.5 text-xs text-slate-500">
            <!-- Contador alumnos -->
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Students: <strong class="text-slate-700">{{ alumnosConectados() }}/{{ totalAlumnos() }}</strong>
            </span>
            <!-- Tiempo restante -->
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 6v6l4 2"/>
              </svg>
              Time Remaining: <strong
                class="font-mono"
                [class.text-red-600]="tiempoUrgente()"
                [class.text-slate-700]="!tiempoUrgente()"
              >{{ tiempoFormateado() }}</strong>
            </span>
          </div>
        </div>

        <!-- ── Derecha: estado + acciones ── -->
        <div class="flex items-center gap-2 shrink-0">

          <!-- Indicador Live -->
          <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
            <span class="relative flex h-2 w-2">
              <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
              <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
            </span>
            <span class="text-xs font-medium text-green-700">Live Monitoring</span>
          </div>

          <!-- Botón configuración (placeholder) -->
          <button
            type="button"
            class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Configuración del monitor"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>

          <!-- Botón End Session -->
          <button
            type="button"
            (click)="finalizarSesion.emit()"
            class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg transition-colors"
            aria-label="Finalizar sesión de examen"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
              <path stroke-linecap="round" stroke-linejoin="round" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
            End Session
          </button>

        </div>
      </div>
    </header>
  `,
})
export class MonitorNavbarComponent {
  // ── Inputs ───────────────────────────────────────────────────────
  tituloExamen     = input('—');
  codigoExamen     = input('—');
  codigoAcceso     = input('');
  alumnosConectados = input(0);
  totalAlumnos     = input(0);
  segundosRestantes = input(0);

  // ── Outputs ──────────────────────────────────────────────────────
  finalizarSesion = output<void>();

  // ── Computed ─────────────────────────────────────────────────────
  readonly tiempoFormateado = computed(() => {
    const s = Math.max(0, this.segundosRestantes());
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  });

  readonly tiempoUrgente = computed(() => this.segundosRestantes() <= 120);
}