/**
 * sala-espera.component.ts  ← VERSIÓN FINAL (Paso 5 integrado)
 * ─────────────────────────────────────────────────────────────────
 * CAMBIOS RESPECTO AL PASO 6:
 *  - onPantallaCompartida() ahora llama a PeerService.conectarAlDocente()
 *  - iniciarExamen() pasa el peerId al ExamenActivoService
 *  - Se inyecta PeerService desde core
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
  // ExamenActivoService viene del ExamenShellComponent (padre de ruta)
  // NO se declara providers aquí — se destruiría al navegar a /evaluacion
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
        <div class="flex items-center gap-3">
          <button type="button" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-md" aria-label="Notificaciones">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
            </svg>
          </button>
          <button type="button" class="p-1.5 text-slate-400 hover:text-slate-600 rounded-md" aria-label="Configuración">
            <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
              <path stroke-linecap="round" stroke-linejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
            </svg>
          </button>
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

        @else if (servicio.error() && !sesionCargada()) {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 p-8 max-w-sm w-full text-center">
            <div class="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center mx-auto mb-4">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-7 h-7 text-red-500" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
              </svg>
            </div>
            <h2 class="text-base font-bold text-slate-800 mb-2">Código inválido</h2>
            <p class="text-sm text-slate-500">{{ servicio.error() }}</p>
          </div>
        }

        @else if (sesionCargada()) {
          <div class="bg-white rounded-2xl shadow-sm border border-slate-200 w-full max-w-md p-8">

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

            <div class="flex gap-3 p-3 bg-blue-50 border border-blue-100 rounded-lg mb-5">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5 text-blue-500 shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p class="text-xs text-blue-700 leading-relaxed">
                <strong>Instrucciones:</strong> Por favor selecciona tu nombre de la lista
                oficial y comparte tu pantalla completa para habilitar el botón de inicio.
              </p>
            </div>

            <!-- Dropdown de nombre -->
            <div class="mb-5">
              <label for="select-alumno" class="block text-sm font-medium text-slate-700 mb-1.5">
                Seleccionar Estudiante
              </label>
              <div class="relative">
                <select
                  id="select-alumno"
                  [(ngModel)]="alumnoIdSeleccionado"
                  class="w-full px-3 py-3 text-sm text-slate-800 border border-slate-300 rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 appearance-none"
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

            <!-- Compartir pantalla -->
            @if (alumnoIdSeleccionado) {
              <div class="mb-5">
                <app-screen-share-prompt
                  [nombreAlumno]="nombreAlumnoSeleccionado()"
                  [compartiendo]="pantallaCompartida()"
                  (pantallaCompartida)="onPantallaCompartida($event)"
                  (pantallaCancelada)="onPantallaCancelada()"
                />
              </div>
            } @else {
              <div class="mb-5">
                <button type="button" disabled
                  class="w-full flex items-center justify-center gap-3 px-5 py-3.5 text-sm font-semibold text-slate-400 bg-slate-100 rounded-xl cursor-not-allowed">
                  <svg xmlns="http://www.w3.org/2000/svg" class="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                    <path stroke-linecap="round" stroke-linejoin="round" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                  </svg>
                  Compartir Pantalla para Iniciar
                </button>
                <p class="text-center text-xs text-slate-400 mt-2">
                  Este paso es obligatorio para verificar la integridad del examen.
                </p>
              </div>
            }

            <!-- Botón Comenzar -->
            <button
              type="button"
              (click)="comenzarExamen()"
              [disabled]="!puedeComenzar() || iniciando()"
              class="w-full flex items-center justify-center gap-2 px-5 py-3 text-sm font-semibold text-white rounded-xl transition-colors mb-4"
              [class.bg-blue-600]="puedeComenzar() && !iniciando()"
              [class.hover:bg-blue-700]="puedeComenzar() && !iniciando()"
              [class.bg-slate-300]="!puedeComenzar() || iniciando()"
              [class.cursor-not-allowed]="!puedeComenzar() || iniciando()"
            >
              @if (iniciando()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
                Iniciando...
              } @else {
                Comenzar Examen
              }
            </button>

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
  readonly servicio  = inject(ExamenActivoService);
  private readonly peerService = inject(PeerService);   // ← NUEVO en Paso 5
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ── Estado ───────────────────────────────────────────────────────
  alumnoIdSeleccionado = '';
  readonly pantallaCompartida = signal(false);
  private streamPantalla: MediaStream | null = null;
  readonly iniciando = signal(false);
  readonly sesionCargada = signal(false);

  // ── Computed ─────────────────────────────────────────────────────
  readonly nombreAlumnoSeleccionado = computed(() =>
    this.servicio.listaAlumnos().find((a) => a.id === this.alumnoIdSeleccionado)
      ?.nombre_completo ?? ''
  );

  readonly puedeComenzar = computed(
    () => !!this.alumnoIdSeleccionado && this.pantallaCompartida()
  );

  // ── Ciclo de vida ─────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const codigo = this.route.snapshot.paramMap.get('codigo') ?? '';
    if (!codigo) { this.router.navigate(['/']); return; }

    const ok = await this.servicio.cargarSesionPorCodigo(codigo);
    this.sesionCargada.set(ok);
  }

  ngOnDestroy(): void {
    if (this.streamPantalla && !this.pantallaCompartida()) {
      this.streamPantalla.getTracks().forEach((t) => t.stop());
    }
  }

  // ── Handlers ─────────────────────────────────────────────────────

  /**
   * Recibe el MediaStream → conecta al docente via PeerJS.
   * El peerId del alumno se guardará en sesion_alumnos al iniciarExamen().
   */
  async onPantallaCompartida(stream: MediaStream): Promise<void> {
    this.streamPantalla = stream;
    this.pantallaCompartida.set(true);

    // ── INTEGRACIÓN PASO 5 ──────────────────────────────────────
    const sesion   = this.servicio.sesion();
    const alumnoId = this.alumnoIdSeleccionado;

    if (sesion && alumnoId) {
      // Conectar al docente sin bloquear el flujo del alumno.
      // El peerId devuelto se usará en iniciarExamen().
      this.peerService.conectarAlDocente(stream, alumnoId, sesion.id)
        .then((peerId) => {
          if (peerId) {
            console.log(`[SalaEspera] PeerJS conectado. PeerId: ${peerId}`);
          }
        })
        .catch((err) => {
          // Fallo de WebRTC no bloquea el examen
          console.warn('[SalaEspera] PeerJS error (no crítico):', err);
        });
    }
  }

  onPantallaCancelada(): void {
    this.streamPantalla = null;
    this.pantallaCompartida.set(false);
  }

  async comenzarExamen(): Promise<void> {
    if (!this.puedeComenzar() || this.iniciando()) return;

    const alumno = this.servicio.listaAlumnos().find(
      (a) => a.id === this.alumnoIdSeleccionado
    );
    if (!alumno) return;

    this.iniciando.set(true);

    // Pasar el peerId de PeerJS al servicio para guardarlo en sesion_alumnos
    const peerId = this.peerService.miPeerId() ?? '';
    const ok = await this.servicio.iniciarExamen(alumno, peerId);

    this.iniciando.set(false);

    if (ok) {
      const codigo = this.route.snapshot.paramMap.get('codigo');
      // Marcar en sessionStorage para que el sessionGuard permita /evaluacion
      sessionStorage.setItem(`proctor_alumno_${codigo}`, alumno.id);
      this.router.navigate(['/examen', codigo, 'evaluacion']);
    }
  }
}