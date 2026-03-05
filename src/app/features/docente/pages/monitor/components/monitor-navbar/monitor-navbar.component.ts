/**
 * monitor-navbar.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Navbar exclusivo del panel de monitoreo en vivo.
 *
 * CAMBIOS:
 *  - Bug 7: añadido input examenIniciado + output iniciarExamen
 *           Muestra botón "Iniciar Examen" cuando el examen no ha iniciado
 *  - Bug 10: totalAlumnos refleja alumnos del grupo (no solo los conectados)
 *  - Bug 11: menú de configuración con opciones de layout de columnas
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  signal,
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
            <span class="text-xs font-mono font-semibold bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
              {{ codigoExamen() }}
            </span>
            <h1 class="text-sm font-bold text-slate-900 truncate max-w-xs">
              {{ tituloExamen() }}
            </h1>
          </div>
          <div class="flex items-center justify-center gap-4 mt-0.5 text-xs text-slate-500">
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
              </svg>
              Students: <strong class="text-slate-700">{{ alumnosConectados() }}/{{ totalAlumnos() }}</strong>
            </span>
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <circle cx="12" cy="12" r="10"/><path stroke-linecap="round" d="M12 6v6l4 2"/>
              </svg>
              @if (examenIniciado()) {
                Time Remaining: <strong
                  class="font-mono"
                  [class.text-red-600]="tiempoUrgente()"
                  [class.text-slate-700]="!tiempoUrgente()"
                >{{ tiempoFormateado() }}</strong>
              } @else {
                <strong class="text-amber-600">Examen en espera</strong>
              }
            </span>
          </div>
        </div>

        <!-- ── Derecha: estado + acciones ── -->
        <div class="flex items-center gap-2 shrink-0">

          <!-- Indicador Live / Esperando -->
          @if (examenIniciado()) {
            <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-green-50 border border-green-200 rounded-full">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-green-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-green-500"></span>
              </span>
              <span class="text-xs font-medium text-green-700">Live Monitoring</span>
            </div>
          } @else {
            <div class="hidden sm:flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 border border-amber-200 rounded-full">
              <span class="relative flex h-2 w-2">
                <span class="animate-ping absolute inline-flex h-full w-full rounded-full bg-amber-400 opacity-75"></span>
                <span class="relative inline-flex rounded-full h-2 w-2 bg-amber-500"></span>
              </span>
              <span class="text-xs font-medium text-amber-700">En espera</span>
            </div>
          }

          <!-- Botón Configuración (Bug 11) -->
          <div class="relative">
            <button
              type="button"
              (click)="mostrarMenuConfig.set(!mostrarMenuConfig())"
              class="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-lg transition-colors"
              aria-label="Configuración del monitor"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </button>

            @if (mostrarMenuConfig()) {
              <!-- Overlay para cerrar al hacer clic afuera -->
              <div
                class="fixed inset-0 z-40"
                (click)="mostrarMenuConfig.set(false)"
              ></div>

              <!-- Dropdown de configuración -->
              <div class="absolute right-0 top-full mt-1 w-52 bg-white border border-slate-200 rounded-xl shadow-lg z-50 py-1 overflow-hidden">
                <p class="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                  Layout de pantallas
                </p>
                <button
                  type="button"
                  (click)="cambioColumnas.emit(2); mostrarMenuConfig.set(false)"
                  class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M4 6h16M4 12h16M4 18h16" />
                  </svg>
                  2 columnas (grande)
                </button>
                <button
                  type="button"
                  (click)="cambioColumnas.emit(3); mostrarMenuConfig.set(false)"
                  class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/>
                  </svg>
                  3 columnas
                </button>
                <button
                  type="button"
                  (click)="cambioColumnas.emit(4); mostrarMenuConfig.set(false)"
                  class="w-full flex items-center gap-3 px-3 py-2 text-sm text-slate-700 hover:bg-slate-50 transition-colors"
                >
                  <svg class="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24" stroke-width="2">
                    <rect x="3" y="3" width="5" height="5" rx="1"/><rect x="10" y="3" width="5" height="5" rx="1"/>
                    <rect x="17" y="3" width="5" height="5" rx="1"/><rect x="3" y="10" width="5" height="5" rx="1"/>
                  </svg>
                  4 columnas (por defecto)
                </button>

                <div class="border-t border-slate-100 mt-1 pt-1">
                  <p class="px-3 py-1.5 text-xs font-semibold text-slate-400 uppercase tracking-wide">
                    Código de acceso
                  </p>
                  <div class="px-3 py-2">
                    <span class="font-mono text-sm font-bold text-slate-700 bg-slate-100 px-2 py-1 rounded tracking-widest">
                      {{ codigoAcceso() }}
                    </span>
                  </div>
                </div>
              </div>
            }
          </div>

          <!-- Bug 7: Botón "Iniciar Examen" cuando está en espera -->
          @if (!examenIniciado()) {
            <button
              type="button"
              (click)="iniciarExamen.emit()"
              class="flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-green-600 hover:bg-green-700 rounded-lg transition-colors"
              aria-label="Iniciar examen para todos los alumnos"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              Iniciar Examen
            </button>
          }

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
  tituloExamen      = input('—');
  codigoExamen      = input('—');
  codigoAcceso      = input('');
  alumnosConectados = input(0);
  totalAlumnos      = input(0);
  segundosRestantes = input(0);
  examenIniciado    = input(false);  // Bug 7

  // ── Outputs ──────────────────────────────────────────────────────
  finalizarSesion = output<void>();
  iniciarExamen   = output<void>();          // Bug 7
  cambioColumnas  = output<2 | 3 | 4>();    // Bug 11

  // ── Estado local ─────────────────────────────────────────────────
  readonly mostrarMenuConfig = signal(false);  // Bug 11

  // ── Computed ─────────────────────────────────────────────────────
  readonly tiempoFormateado = computed(() => {
    const s = Math.max(0, this.segundosRestantes());
    const m = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${m}:${sec}`;
  });

  readonly tiempoUrgente = computed(() => this.segundosRestantes() <= 120);
}
