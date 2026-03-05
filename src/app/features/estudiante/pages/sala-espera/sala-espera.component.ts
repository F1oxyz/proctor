/**
 * sala-espera.component.ts
 * ─────────────────────────────────────────────────────────────────
 * BUGS CORREGIDOS:
 *  - Bug 1: Flujo de 2 pasos: "Unirse a la sala" → "Comenzar Examen"
 *           El alumno se registra con 'unido' primero (visible en monitor),
 *           luego inicia con 'en_progreso' cuando el profesor activa el examen.
 *  - Bug 3 (anterior): alumnoIdSeleccionado como signal
 *  - Bug 7 (anterior): espera hasta que profesor inicie
 *  - Bug 3 (anterior): botón Regresar en error
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  OnDestroy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { FormsModule } from '@angular/forms';

import { ExamenActivoService, AlumnoActivo } from '../../services/examen-activo.service';
import { PeerService } from '../../../../core/services/peer.service';
import { ScreenSharePromptComponent } from './components/screen-share-prompt/screen-share-prompt.component';

@Component({
  selector: 'app-sala-espera',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [FormsModule, ScreenSharePromptComponent],
  template: `
    <div class="min-h-screen bg-gray-100 flex flex-col">

      <!-- ── Mini navbar ── -->
      <header class="flex items-center justify-between px-6 py-4 bg-white border-b border-slate-200">
        <div class="flex items-center gap-2">
          <div class="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          </div>
          <span class="text-sm font-semibold text-slate-800">Proctor</span>
        </div>
      </header>

      <!-- ── Contenido centrado ── -->
      <main class="flex-1 flex items-center justify-center px-4 py-8">

        @if (servicio.cargando() && !sesionCargada()) {
          <div class="flex flex-col items-center gap-3">
            <svg class="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p class="text-sm text-slate-500">Cargando examen...</p>
          </div>
        }

        <!-- ── Error / Código inválido ── -->
        @else if (servicio.error() && !sesionCargada()) {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
            <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-base font-bold text-slate-800 mb-2">Código inválido</h2>
            <p class="text-sm text-slate-500 mb-5">{{ servicio.error() }}</p>
            <button
              type="button"
              (click)="router.navigate(['/'])"
              class="w-full px-4 py-2.5 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-xl transition-colors"
            >
              Regresar al inicio
            </button>
          </div>
        }

        @else if (sesionCargada()) {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8">

            <!-- Encabezado -->
            <div class="flex flex-col items-center mb-6">
              <div class="w-14 h-14 bg-blue-50 rounded-full flex items-center justify-center mb-4">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-blue-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <h1 class="text-xl font-bold text-slate-800">Sala de Espera</h1>
              <p class="text-sm text-slate-500 mt-1 text-center">
                {{ servicio.sesion()?.examen_titulo }}
              </p>
            </div>

            <!-- Banner de estado de la sesión -->
            @if (yaUnido()) {
              <!-- Ya unido: mostrar estado -->
              @if (sesionEsperando()) {
                <div class="flex gap-3 p-3 bg-amber-50 border border-amber-200 rounded-lg mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5 animate-pulse" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-amber-700 leading-relaxed">
                    <strong>✓ Estás en la sala.</strong> El examen comenzará cuando el profesor lo inicie desde su panel.
                  </p>
                </div>
              } @else {
                <div class="flex gap-3 p-3 bg-green-50 border border-green-200 rounded-lg mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-green-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-green-700 leading-relaxed">
                    <strong>¡El examen ha iniciado!</strong> Cuando estés listo, haz clic en "Comenzar Examen".
                  </p>
                </div>
              }
            } @else {
              <!-- No unido aún -->
              @if (sesionEsperando()) {
                <div class="flex gap-3 p-3 bg-amber-50 border border-amber-100 rounded-lg mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-amber-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-amber-700 leading-relaxed">
                    Selecciona tu nombre y comparte tu pantalla para unirte a la sala de espera.
                  </p>
                </div>
              } @else {
                <div class="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-5">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p class="text-xs text-blue-700 leading-relaxed">
                    <strong>¡Examen iniciado!</strong> Selecciona tu nombre y comparte tu pantalla para comenzar.
                  </p>
                </div>
              }
            }

            <!-- Dropdown de nombre (deshabilitado si ya se unió) -->
            <div class="mb-5">
              <label for="select-alumno" class="block text-sm font-medium text-slate-700 mb-1.5">
                Seleccionar Estudiante
              </label>
              <div class="relative">
                <select
                  id="select-alumno"
                  [ngModel]="alumnoIdSeleccionado()"
                  (ngModelChange)="alumnoIdSeleccionado.set($event)"
                  [disabled]="yaUnido()"
                  class="w-full px-3 py-3 text-sm text-slate-800 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none disabled:bg-slate-50 disabled:text-slate-500"
                >
                  <option value="">Elige tu nombre de la lista...</option>
                  @for (alumno of servicio.listaAlumnos(); track alumno.id) {
                    <option [value]="alumno.id">{{ alumno.nombre_completo }}</option>
                  }
                </select>
                <svg xmlns="http://www.w3.org/2000/svg" class="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 pointer-events-none" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </div>

            <!-- Compartir pantalla (solo si seleccionó nombre y no se ha unido aún) -->
            @if (alumnoIdSeleccionado() && !yaUnido()) {
              <div class="mb-5">
                <app-screen-share-prompt
                  [nombreAlumno]="nombreAlumnoSeleccionado()"
                  [compartiendo]="pantallaCompartida()"
                  (pantallaCompartida)="onPantallaCompartida($event)"
                  (pantallaCancelada)="onPantallaCancelada()"
                />
              </div>
            }

            @if (!alumnoIdSeleccionado() && !yaUnido()) {
              <div class="mb-5">
                <button type="button" disabled
                  class="w-full flex items-center justify-center gap-3 px-5 py-3.5 text-sm font-semibold text-slate-400 bg-slate-100 rounded-xl cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Compartir Pantalla
                </button>
                <p class="text-center text-xs text-slate-400 mt-2">
                  Primero selecciona tu nombre de la lista.
                </p>
              </div>
            }

            <!-- ── Botón de acción principal ── -->

            @if (!yaUnido()) {
              <!-- PASO 1: Unirse a la sala -->
              <button
                type="button"
                (click)="unirseASala()"
                [disabled]="!puedeUnirse() || uniendose()"
                class="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl transition-colors mb-4"
                [class.bg-blue-600]="puedeUnirse() && !uniendose()"
                [class.hover:bg-blue-700]="puedeUnirse() && !uniendose()"
                [class.bg-slate-300]="!puedeUnirse() || uniendose()"
                [class.cursor-not-allowed]="!puedeUnirse() || uniendose()"
              >
                @if (uniendose()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Uniéndose...
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M11 16l-4-4m0 0l4-4m-4 4h14m-5 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h7a3 3 0 013 3v1" />
                  </svg>
                  Unirse a la sala
                }
              </button>
            } @else if (sesionEsperando()) {
              <!-- PASO 2a: Esperando al profesor -->
              <button
                type="button"
                disabled
                class="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-slate-500 bg-slate-100 rounded-xl cursor-not-allowed mb-4"
              >
                <svg class="w-4 h-4 animate-pulse" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                Esperando al profesor...
              </button>
            } @else {
              <!-- PASO 2b: Examen activo → Comenzar -->
              <button
                type="button"
                (click)="comenzarExamen()"
                [disabled]="iniciando()"
                class="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white bg-green-600 hover:bg-green-700 disabled:bg-slate-300 disabled:cursor-not-allowed rounded-xl transition-colors mb-4"
              >
                @if (iniciando()) {
                  <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                    <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                    <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                  </svg>
                  Iniciando...
                } @else {
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  Comenzar Examen
                }
              </button>
            }

            <div class="flex items-center justify-between text-xs text-slate-400">
              <span class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
                Conexión Segura
              </span>
              <span>ID de Sesión: {{ servicio.sesion()?.codigo_acceso }}</span>
            </div>

          </div>
        }

      </main>
    </div>
  `,
})
export class SalaEsperaComponent implements OnInit, OnDestroy {
  // ── Dependencias ────────────────────────────────────────────────
  readonly servicio    = inject(ExamenActivoService);
  private readonly peerService = inject(PeerService);
  private readonly route  = inject(ActivatedRoute);
  readonly router = inject(Router);

  // ── Estado ───────────────────────────────────────────────────────

  readonly alumnoIdSeleccionado = signal('');
  readonly pantallaCompartida   = signal(false);
  private streamPantalla: MediaStream | null = null;

  /** Bug 1: true cuando el alumno ya insertó sesion_alumnos con 'unido' */
  readonly yaUnido    = signal(false);
  readonly uniendose  = signal(false);
  readonly iniciando  = signal(false);
  readonly sesionCargada = signal(false);

  // ── Computed ─────────────────────────────────────────────────────

  readonly nombreAlumnoSeleccionado = computed(() =>
    this.servicio.listaAlumnos().find((a) => a.id === this.alumnoIdSeleccionado())
      ?.nombre_completo ?? ''
  );

  /** true cuando la sesión está en 'esperando' */
  readonly sesionEsperando = computed(
    () => this.servicio.sesion()?.estado === 'esperando'
  );

  /** Bug 1: puede unirse si seleccionó nombre + compartió pantalla + no está unido */
  readonly puedeUnirse = computed(
    () => !!this.alumnoIdSeleccionado() && this.pantallaCompartida() && !this.yaUnido()
  );

  // ── Ciclo de vida ─────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const codigo = this.route.snapshot.paramMap.get('codigo') ?? '';
    if (!codigo) { this.router.navigate(['/']); return; }

    const ok = await this.servicio.cargarSesionPorCodigo(codigo);
    this.sesionCargada.set(ok);
  }

  ngOnDestroy(): void {
    if (this.streamPantalla) {
      this.streamPantalla.getTracks().forEach((t) => t.stop());
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────

  async onPantallaCompartida(stream: MediaStream): Promise<void> {
    this.streamPantalla = stream;
    this.pantallaCompartida.set(true);

    // Conectar PeerJS al docente (para que vea la pantalla)
    const sesion   = this.servicio.sesion();
    const alumnoId = this.alumnoIdSeleccionado();

    if (sesion && alumnoId) {
      this.peerService.conectarAlDocente(stream, alumnoId, sesion.id)
        .then((peerId) => {
          if (peerId) console.log(`[SalaEspera] PeerJS conectado: ${peerId}`);
        })
        .catch((err) => console.warn('[SalaEspera] PeerJS error (no crítico):', err));
    }
  }

  onPantallaCancelada(): void {
    this.streamPantalla = null;
    this.pantallaCompartida.set(false);
  }

  /**
   * Bug 1: Paso 1 — unirse a la sala con estado 'unido'.
   * El monitor del profesor lo verá inmediatamente.
   */
  async unirseASala(): Promise<void> {
    if (!this.puedeUnirse() || this.uniendose()) return;

    const alumno = this.servicio.listaAlumnos().find(
      (a) => a.id === this.alumnoIdSeleccionado()
    );
    if (!alumno) return;

    this.uniendose.set(true);

    const peerId = this.peerService.miPeerId() ?? '';
    const ok = await this.servicio.unirseASala(alumno, peerId);

    this.uniendose.set(false);

    if (ok) {
      this.yaUnido.set(true);
    }
  }

  /**
   * Bug 1: Paso 2 — comenzar el examen (actualiza de 'unido' a 'en_progreso').
   * Solo disponible cuando la sesión está 'activa'.
   */
  async comenzarExamen(): Promise<void> {
    if (this.sesionEsperando() || this.iniciando()) return;

    const alumno = this.servicio.listaAlumnos().find(
      (a) => a.id === this.alumnoIdSeleccionado()
    );
    if (!alumno) return;

    this.iniciando.set(true);

    const peerId = this.peerService.miPeerId() ?? '';
    const ok = await this.servicio.iniciarExamen(alumno, peerId);

    this.iniciando.set(false);

    if (ok) {
      const codigo = this.route.snapshot.paramMap.get('codigo');
      sessionStorage.setItem(`proctor_alumno_${codigo}`, alumno.id);
      this.router.navigate(['/examen', codigo, 'evaluacion']);
    }
  }
}
