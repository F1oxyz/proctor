/**
 * monitor.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Panel principal de monitoreo en vivo. RF-04.
 * Ruta: /docente/monitor/:sesionId  (protegida por authGuard)
 *
 * RESPONSABILIDADES:
 *  - Cargar la sesión y arrancar Supabase Realtime (SesionesService)
 *  - Inicializar PeerJS como receptor de streams (PeerService)
 *  - Mostrar el grid de AlumnoTileComponent (4 columnas en desktop)
 *  - Leyenda de estados en el footer (Active/Idle/Flagged/Offline)
 *  - Temporizador regresivo del examen
 *  - Botón "End Session" → confirmar → finalizar → navegar a resultados
 *  - Modal de pantalla completa al expandir un tile
 *
 * DISEÑO (según PDF - página 6):
 *  - Header fijo (MonitorNavbarComponent)
 *  - Grid 4 columnas con las cards de alumnos
 *  - Footer con leyenda de estados + "Last synced: Just now"
 *
 * INTEGRACIÓN:
 *  - SesionesService provee la lista reactiva via Supabase Realtime
 *  - PeerService provee los streams WebRTC en tiempo real
 *  - Cruza ambas fuentes por alumno_id para mostrar stream en el tile correcto
 *
 * ARQUITECTURA:
 *  - Provee SesionesService (se destruye al salir de la ruta)
 *  - PeerService viene de core (singleton en root)
 *  - OnPush
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
import { ActivatedRoute, Router, RouterLink } from '@angular/router';

import { SesionesService }       from '../../services/sesiones.service';
import { PeerService }           from '../../../../core/services/peer.service';
import { MonitorNavbarComponent } from './components/monitor-navbar/monitor-navbar.component';
import { AlumnoTileComponent }   from './components/alumno-tile/alumno-tile.component';
import { SesionAlumnoConDatos }  from '../../../../shared/models/index';

@Component({
  selector: 'app-monitor',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    MonitorNavbarComponent,
    AlumnoTileComponent,
  ],
  providers: [SesionesService],
  template: `
    <div class="min-h-screen bg-slate-100 flex flex-col">

      <!-- ── Navbar del monitor ── -->
      <app-monitor-navbar
        [tituloExamen]="sesiones.sesionActiva()?.examen_titulo ?? ''"
        [codigoExamen]="sesiones.sesionActiva()?.grupo_nombre ?? ''"
        [codigoAcceso]="sesiones.sesionActiva()?.codigo_acceso ?? ''"
        [alumnosConectados]="alumnosConectados()"
        [totalAlumnos]="sesiones.alumnosEnSesion().length"
        [segundosRestantes]="segundosRestantes()"
        (finalizarSesion)="confirmarFinalizacion()"
      />

      <!-- ── Contenido principal ── -->
      <main class="flex-1 px-4 py-6 max-w-screen-2xl mx-auto w-full">

        <!-- ── Loading inicial ── -->
        @if (sesiones.cargando() && sesiones.alumnosEnSesion().length === 0) {
          <div class="flex flex-col items-center justify-center py-24 gap-3">
            <svg class="w-8 h-8 animate-spin text-blue-600" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            <p class="text-sm text-slate-500">Conectando al monitor...</p>
          </div>
        }

        <!-- ── Estado de PeerJS ── -->
        @if (peer.inicializando()) {
          <div class="mb-4 flex items-center gap-2 p-3 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-700">
            <svg class="w-4 h-4 animate-spin shrink-0" fill="none" viewBox="0 0 24 24">
              <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
              <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
            </svg>
            Inicializando transmisión WebRTC...
          </div>
        }

        @if (peer.error()) {
          <div class="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
            {{ peer.error() }} — Los alumnos podrán conectarse pero no se verán sus pantallas.
          </div>
        }

        <!-- ── Grid de tiles ── -->
        @if (sesiones.alumnosEnSesion().length > 0) {
          <div class="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-4 gap-4">
            @for (alumno of sesiones.alumnosEnSesion(); track alumno.alumno_id) {
              <app-alumno-tile
                [alumno]="alumno"
                [stream]="streamDeAlumno(alumno.alumno_id)"
                (expandir)="abrirPantallaCompleta($event)"
                (enviarRecordatorio)="enviarRecordatorio($event)"
              />
            }
          </div>
        }

        <!-- Estado vacío: ningún alumno se ha unido aún -->
        @else if (!sesiones.cargando()) {
          <div class="flex flex-col items-center justify-center py-24 gap-4">
            <div class="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-sm border border-slate-200">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-8 h-8 text-slate-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="1.5">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
            </div>
            <p class="text-sm font-medium text-slate-600">Esperando que los alumnos se conecten...</p>
            <p class="text-xs text-slate-400">
              Código de acceso:
              <span class="font-mono font-bold text-slate-700 text-sm bg-slate-100 px-2 py-0.5 rounded ml-1">
                {{ sesiones.sesionActiva()?.codigo_acceso }}
              </span>
            </p>
          </div>
        }

      </main>

      <!-- ── Footer: leyenda + última sincronización ── -->
      <footer class="px-4 py-3 bg-white border-t border-slate-200">
        <div class="max-w-screen-2xl mx-auto flex items-center justify-between flex-wrap gap-2">

          <!-- Leyenda de estados -->
          <div class="flex items-center gap-4 flex-wrap text-xs text-slate-500">
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-green-500 inline-block"></span>
              Active ({{ conteoEstado('activo') }})
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-amber-400 inline-block"></span>
              Idle ({{ conteoEstado('idle') }})
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-red-500 inline-block"></span>
              Flagged ({{ conteoEstado('flagged') }})
            </span>
            <span class="flex items-center gap-1.5">
              <span class="w-2 h-2 rounded-full bg-slate-400 inline-block"></span>
              Offline ({{ conteoEstado('offline') }})
            </span>
          </div>

          <!-- Última sincronización -->
          <span class="text-xs text-slate-400 flex items-center gap-1">
            Last synced: Just now
            <button
              type="button"
              (click)="sincronizarManual()"
              class="ml-1 text-blue-500 hover:text-blue-600 transition-colors"
              aria-label="Sincronizar ahora"
            >
              <svg xmlns="http://www.w3.org/2000/svg" class="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
            </button>
          </span>

        </div>
      </footer>

    </div>

    <!-- ── Modal confirmación End Session ── -->
    @if (mostrarConfirmacion()) {
      <div
        class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4"
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-titulo"
      >
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 id="modal-titulo" class="text-base font-bold text-slate-800 mb-2">
            ¿Finalizar la sesión?
          </h3>
          <p class="text-sm text-slate-600 mb-1">
            {{ alumnosActivos() }} alumno(s) aún están respondiendo.
          </p>
          <p class="text-sm text-amber-600 mb-5">
            Una vez finalizada, los alumnos no podrán seguir respondiendo y serán redirigidos a sus resultados.
          </p>
          <div class="flex justify-end gap-3">
            <button
              type="button"
              (click)="mostrarConfirmacion.set(false)"
              class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800 transition-colors"
            >
              Cancelar
            </button>
            <button
              type="button"
              (click)="finalizarSesion()"
              [disabled]="finalizando()"
              class="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 disabled:bg-slate-300 rounded-lg transition-colors flex items-center gap-2"
            >
              @if (finalizando()) {
                <svg class="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                  <circle class="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" stroke-width="4"/>
                  <path class="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"/>
                </svg>
              }
              Sí, finalizar
            </button>
          </div>
        </div>
      </div>
    }

    <!-- ── Modal pantalla completa de alumno ── -->
    @if (alumnoExpandido()) {
      <div
        class="fixed inset-0 bg-black/90 flex flex-col z-50"
        role="dialog"
        aria-modal="true"
        (click)="cerrarPantallaCompleta()"
      >
        <!-- Header del modal -->
        <div
          class="flex items-center justify-between px-6 py-4 bg-black/50"
          (click)="$event.stopPropagation()"
        >
          <div>
            <p class="text-white font-semibold">{{ alumnoExpandido()!.alumno_nombre }}</p>
            <p class="text-slate-400 text-xs">Vista expandida</p>
          </div>
          <button
            type="button"
            (click)="cerrarPantallaCompleta()"
            class="p-2 text-white hover:text-slate-300 transition-colors"
            aria-label="Cerrar vista expandida"
          >
            <svg xmlns="http://www.w3.org/2000/svg" class="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
              <path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <!-- Video a pantalla completa -->
        <div class="flex-1 flex items-center justify-center p-4">
          @if (streamDeAlumno(alumnoExpandido()!.alumno_id)) {
            <video
              #videoExpandido
              class="max-w-full max-h-full rounded-lg"
              autoplay
              muted
              playsinline
            ></video>
          } @else {
            <p class="text-slate-400 text-sm">Sin stream disponible</p>
          }
        </div>
      </div>
    }
  `,
})
export class MonitorComponent implements OnInit, OnDestroy {
  // ── Dependencias ────────────────────────────────────────────────
  readonly sesiones = inject(SesionesService);
  readonly peer     = inject(PeerService);
  private readonly route  = inject(ActivatedRoute);
  private readonly router = inject(Router);

  // ── Estado ───────────────────────────────────────────────────────

  /** Segundos restantes del examen para el navbar */
  readonly segundosRestantes = signal(0);
  private intervaloTimer: ReturnType<typeof setInterval> | null = null;

  /** Modal de confirmación de finalizar */
  readonly mostrarConfirmacion = signal(false);

  /** true mientras se procesa la finalización */
  readonly finalizando = signal(false);

  /** Alumno cuya pantalla se está viendo en modo fullscreen */
  readonly alumnoExpandido = signal<SesionAlumnoConDatos | null>(null);

  // ── Computed ─────────────────────────────────────────────────────

  /** Alumnos con stream activo (online) */
  readonly alumnosConectados = computed(
    () => this.peer.streamsPorAlumno().size
  );

  /** Alumnos que aún están 'en_progreso' (no han enviado ni son offline) */
  readonly alumnosActivos = computed(
    () => this.sesiones.alumnosEnSesion()
      .filter((a) => a.estado === 'en_progreso').length
  );

  /** Cuenta de cada estado para la leyenda del footer */
  conteoEstado(estado: 'activo' | 'idle' | 'flagged' | 'offline'): number {
    return this.sesiones.alumnosEnSesion().filter((a) => {
      const tieneStream = this.peer.streamsPorAlumno().has(a.alumno_id);
      switch (estado) {
        case 'activo':  return tieneStream && a.estado === 'en_progreso';
        case 'offline': return !tieneStream && a.estado !== 'enviado';
        case 'idle':    return false; // detección de idle requiere más lógica (extensión futura)
        case 'flagged': return false; // detección de múltiples monitores (extensión futura)
        default:        return false;
      }
    }).length;
  }

  // ── Ciclo de vida ─────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const sesionId = this.route.snapshot.paramMap.get('sesionId');
    if (!sesionId) {
      this.router.navigate(['/docente/examenes']);
      return;
    }

    // 1. Cargar datos de la sesión
    const ok = await this.sesiones.cargarSesion(sesionId);
    if (!ok) {
      this.router.navigate(['/docente/examenes']);
      return;
    }

    // 2. Inicializar PeerJS como receptor
    await this.peer.inicializarComoReceptor(sesionId);

    // 3. Arrancar Realtime de alumnos
    await this.sesiones.iniciarMonitoreo(sesionId);

    // 4. Iniciar temporizador
    const duracionSeg = (this.sesiones.sesionActiva()?.duracion_min ?? 30) * 60;
    this.segundosRestantes.set(duracionSeg);
    this.iniciarTemporizador();
  }

  ngOnDestroy(): void {
    // Limpiar temporizador y PeerJS al salir del monitor
    if (this.intervaloTimer) clearInterval(this.intervaloTimer);
    this.peer.destruir();
    this.sesiones.destruir();
  }

  // ── Temporizador ──────────────────────────────────────────────

  private iniciarTemporizador(): void {
    this.intervaloTimer = setInterval(() => {
      this.segundosRestantes.update((s) => Math.max(0, s - 1));
    }, 1000);
  }

  // ── Handlers ─────────────────────────────────────────────────────

  /** Devuelve el MediaStream de un alumno dado su alumno_id */
  streamDeAlumno(alumnoId: string): MediaStream | null {
    return this.peer.streamsPorAlumno().get(alumnoId)?.stream ?? null;
  }

  /** Muestra el modal de confirmación de finalizar sesión */
  confirmarFinalizacion(): void {
    this.mostrarConfirmacion.set(true);
  }

  /** Finaliza la sesión y navega a los resultados */
  async finalizarSesion(): Promise<void> {
    const sesionId = this.sesiones.sesionActiva()?.id;
    if (!sesionId || this.finalizando()) return;

    this.finalizando.set(true);

    const ok = await this.sesiones.finalizarSesion(sesionId);

    this.finalizando.set(false);
    this.mostrarConfirmacion.set(false);

    if (ok) {
      // Detener temporizador antes de navegar
      if (this.intervaloTimer) clearInterval(this.intervaloTimer);
      this.router.navigate(['/docente/resultados', sesionId]);
    }
  }

  /** Abre la vista de pantalla completa de un alumno */
  abrirPantallaCompleta(alumno: SesionAlumnoConDatos): void {
    this.alumnoExpandido.set(alumno);
  }

  /** Cierra la vista de pantalla completa */
  cerrarPantallaCompleta(): void {
    this.alumnoExpandido.set(null);
  }

  /**
   * Recarga manualmente la lista de alumnos.
   * Útil si el Realtime falla temporalmente.
   */
  sincronizarManual(): void {
    const sesionId = this.sesiones.sesionActiva()?.id;
    if (sesionId) this.sesiones.iniciarMonitoreo(sesionId);
  }

  /**
   * Envía un recordatorio visual al alumno (extensión futura).
   * Por ahora loggea; en producción podría usar Supabase Realtime
   * para enviar una notificación al alumno.
   */
  enviarRecordatorio(alumno: SesionAlumnoConDatos): void {
    console.log('[Monitor] Enviar recordatorio a:', alumno.alumno_nombre);
    // TODO: implementar via Supabase broadcast channel
  }
}