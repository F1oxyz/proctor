/**
 * examenes.component.ts  ← VERSIÓN FINAL (Paso 5 integrado)
 * ─────────────────────────────────────────────────────────────────
 * CAMBIOS RESPECTO AL PASO 4:
 *  - Inyecta SesionesService
 *  - onIniciarExamen() llama a sesionesService.crearSesion() de verdad
 *  - Navega a /docente/monitor/:sesionId
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  inject,
  signal,
  computed,
  OnInit,
  viewChild,
} from '@angular/core';
import { Router, RouterLink } from '@angular/router';

import { ExamenesService }  from '../../services/examenes.service';
import { GruposService }    from '../../services/grupos.service';
import { SesionesService }  from '../../services/sesiones.service'; // ← NUEVO
import {
  NavbarComponent,
} from '../../../../shared/components/navbar/navbar.component';
import {
  EmptyStateComponent,
} from '../../../../shared/components/empty-state/empty-state.component';
import {
  LoadingSpinnerComponent,
} from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { ModalIniciarExamenComponent } from './components/modal-iniciar-examen/modal-iniciar-examen.component';
import { ExamenCompleto, IniciarExamenPayload } from '../../services/examenes.service';
import { DatePipe } from '@angular/common';

@Component({
  selector: 'app-examenes',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    NavbarComponent,
    EmptyStateComponent,
    LoadingSpinnerComponent,
    ModalIniciarExamenComponent,
  ],
  providers: [ExamenesService, GruposService, SesionesService], // ← SesionesService agregado
  template: `
    <app-navbar modo="default" />

    <main class="max-w-5xl mx-auto px-4 py-8">

      <!-- Encabezado -->
      <div class="flex items-center justify-between mb-6">
        <div>
          <h1 class="text-2xl font-bold text-slate-900">Mis Exámenes</h1>
          <p class="text-sm text-slate-500 mt-0.5">Crea y gestiona tus evaluaciones.</p>
        </div>
        <a
          routerLink="/docente/examenes/nuevo"
          class="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white text-sm font-semibold rounded-xl transition-colors"
        >
          <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2.5">
            <path stroke-linecap="round" stroke-linejoin="round" d="M12 4v16m8-8H4" />
          </svg>
          Nuevo Examen
        </a>
      </div>

      <!-- Loading -->
      @if (servicio.cargando()) {
        <div class="flex justify-center py-20">
          <app-loading-spinner />
        </div>
      }

      <!-- Error -->
      @else if (servicio.error()) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {{ servicio.error() }}
        </div>
      }

      <!-- Lista vacía -->
      @else if (servicio.examenes().length === 0) {
        <app-empty-state
          icono="document"
          titulo="Sin exámenes creados"
          descripcion="Crea tu primer examen para comenzar a evaluar a tus alumnos."
        />
      }

      <!-- Tabla de exámenes -->
      @else {
        <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">
          <table class="w-full text-sm" role="table">
            <thead>
              <tr class="border-b border-slate-200 bg-slate-50">
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Título</th>
                <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Grupo</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Duración</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Creado</th>
                <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">Acciones</th>
              </tr>
            </thead>
            <tbody class="divide-y divide-slate-100">
              @for (examen of servicio.examenes(); track examen.id) {
                <tr class="hover:bg-slate-50 transition-colors">
                  <td class="px-4 py-3 font-medium text-slate-800">{{ examen.titulo }}</td>
                  <td class="px-4 py-3 text-slate-500">{{ examen.grupos?.nombre ?? '—' }}</td>
                  <td class="px-4 py-3 text-center text-slate-500">{{ examen.duracion_min }} min</td>
                  <td class="px-4 py-3 text-center text-slate-400 text-xs">
                    {{ examen.creado_en | date:'dd/MM/yy' }}
                  </td>
                  <td class="px-4 py-3">
                    <div class="flex items-center justify-center gap-1">

                      <!-- Editar -->
                      <a
                        [routerLink]="['/docente/examenes', examen.id]"
                        class="p-1.5 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        aria-label="Editar examen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </a>

                      <!-- Iniciar -->
                      <button
                        type="button"
                        (click)="abrirModalIniciar(examen)"
                        class="p-1.5 text-slate-400 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors"
                        aria-label="Iniciar examen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path stroke-linecap="round" stroke-linejoin="round" d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </button>

                      <!-- Eliminar -->
                      <button
                        type="button"
                        (click)="confirmarEliminar(examen)"
                        class="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                        aria-label="Eliminar examen"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                          <path stroke-linecap="round" stroke-linejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>

                    </div>
                  </td>
                </tr>
              }
            </tbody>
          </table>
        </div>
      }

    </main>

    <!-- Modal Iniciar Examen -->
    @if (examenParaIniciar()) {
      <app-modal-iniciar-examen
        [examen]="examenParaIniciar()!"
        [grupos]="gruposService.grupos()"
        [cargando]="iniciandoExamen()"
        (iniciar)="onIniciarExamen($event)"
        (cerrar)="cerrarModalIniciar()"
      />
    }

    <!-- Modal Confirmar Eliminar -->
    @if (examenParaEliminar()) {
      <div class="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" role="dialog">
        <div class="bg-white rounded-2xl shadow-xl w-full max-w-sm p-6">
          <h3 class="text-base font-bold text-slate-800 mb-2">¿Eliminar examen?</h3>
          <p class="text-sm text-slate-600 mb-5">
            "{{ examenParaEliminar()!.titulo }}" se eliminará permanentemente junto con todas sus preguntas.
          </p>
          <div class="flex justify-end gap-3">
            <button type="button" (click)="examenParaEliminar.set(null)"
              class="px-4 py-2 text-sm font-medium text-slate-600 hover:text-slate-800">Cancelar</button>
            <button type="button" (click)="eliminarExamen()"
              class="px-4 py-2 text-sm font-semibold text-white bg-red-500 hover:bg-red-600 rounded-lg">
              Eliminar
            </button>
          </div>
        </div>
      </div>
    }
  `,
})
export class ExamenesComponent implements OnInit {
  // ── Dependencias ────────────────────────────────────────────────
  readonly servicio       = inject(ExamenesService);
  readonly gruposService  = inject(GruposService);
  private readonly sesionesService = inject(SesionesService); // ← NUEVO
  private readonly router = inject(Router);

  // ── Estado ───────────────────────────────────────────────────────
  readonly examenParaIniciar  = signal<ExamenCompleto | null>(null);
  readonly examenParaEliminar = signal<ExamenCompleto | null>(null);
  readonly iniciandoExamen    = signal(false);

  // ── Ciclo de vida ─────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    await Promise.all([
      this.servicio.cargarExamenes(),
      this.gruposService.cargarGrupos(),
    ]);
  }

  // ── Handlers ─────────────────────────────────────────────────────

  abrirModalIniciar(examen: ExamenCompleto): void {
    this.examenParaIniciar.set(examen);
  }

  cerrarModalIniciar(): void {
    this.examenParaIniciar.set(null);
  }

  confirmarEliminar(examen: ExamenCompleto): void {
    this.examenParaEliminar.set(examen);
  }

  async eliminarExamen(): Promise<void> {
    const examen = this.examenParaEliminar();
    if (!examen) return;
    await this.servicio.eliminarExamen(examen.id);
    this.examenParaEliminar.set(null);
  }

  /**
   * Crea la sesión en Supabase y navega al monitor.
   * Reemplaza el placeholder del Paso 4.
   */
  async onIniciarExamen(payload: IniciarExamenPayload): Promise<void> {
    if (this.iniciandoExamen()) return;

    this.iniciandoExamen.set(true);

    // ── INTEGRACIÓN PASO 5: llamada real a SesionesService ──────
    const sesionId = await this.sesionesService.crearSesion(
      payload.examenId,
      payload.grupoId
    );

    this.iniciandoExamen.set(false);

    if (!sesionId) {
      // El error ya está en sesionesService.error()
      console.error('[ExamenesComponent] No se pudo crear la sesión.');
      return;
    }

    this.cerrarModalIniciar();

    // Navegar al monitor con el UUID de la sesión recién creada
    this.router.navigate(['/docente/monitor', sesionId]);
  }
}