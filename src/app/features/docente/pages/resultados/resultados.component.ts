/**
 * resultados.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Pantalla de resultados del docente estilo ThatQuiz. RF-05.
 * Ruta: /docente/resultados/:sesionId
 *
 * MUESTRA:
 *  - Nombre del examen + grupo + fecha
 *  - Resumen estadístico: total alumnos, promedio grupal, aprobados
 *  - Tabla con una fila por alumno (FilaResultadoComponent)
 *  - Columnas: Nombre | Nota% | Cumplido | Sin cumplir |
 *              Acertado | Equivocado | Tiempo | Estado
 *
 * DATOS:
 *  Carga de Supabase: sesion → examenes → sesion_alumnos + alumnos
 *
 * ARQUITECTURA:
 *  - No provee ExamenesService (datos propios de sesión/resultados)
 *  - Carga directa a Supabase via SupabaseService
 *  - NavbarComponent en modo 'default'
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
} from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';

import { SupabaseService } from '../../../../core/services/supabase.service';
import { NavbarComponent } from '../../../../shared/components/navbar/navbar.component';
import { LoadingSpinnerComponent } from '../../../../shared/components/loading-spinner/loading-spinner.component';
import { EmptyStateComponent } from '../../../../shared/components/empty-state/empty-state.component';
import { FilaResultadoComponent } from './components/fila-resultado/fila-resultado.component';
import { SesionAlumnoConDatos } from '../../../../shared/models/index';

/** Datos de la sesión para mostrar en el encabezado */
interface SesionInfo {
  examen_titulo: string;
  grupo_nombre: string;
  iniciada_en: string | null;
  duracion_min: number;
  codigo_acceso: string;
}

@Component({
  selector: 'app-resultados',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [
    RouterLink,
    DatePipe,
    NavbarComponent,
    LoadingSpinnerComponent,
    EmptyStateComponent,
    FilaResultadoComponent,
  ],
  template: `
    <!-- Navbar modo default -->
    <app-navbar modo="default" />

    <main class="max-w-6xl mx-auto px-4 py-8">

      <!-- ── Breadcrumb ── -->
      <nav class="flex items-center gap-2 text-sm text-slate-500 mb-6">
        <a routerLink="/docente/examenes" class="hover:text-slate-700 transition-colors">
          Exámenes
        </a>
        <span>›</span>
        <span class="text-slate-700 font-medium">Resultados</span>
      </nav>

      <!-- ── Loading ── -->
      @if (cargando()) {
        <div class="flex items-center justify-center py-20">
          <app-loading-spinner />
        </div>
      }

      <!-- ── Error ── -->
      @else if (error()) {
        <div class="p-4 bg-red-50 border border-red-200 rounded-xl text-sm text-red-700">
          {{ error() }}
        </div>
      }

      @else {

        <!-- ── Encabezado de resultados ── -->
        <div class="mb-6">
          <h1 class="text-2xl font-bold text-slate-900">
            {{ sesionInfo()?.examen_titulo ?? 'Resultados del Examen' }}
          </h1>
          <div class="flex flex-wrap items-center gap-4 mt-2 text-sm text-slate-500">

            <!-- Grupo -->
            <span class="flex items-center gap-1">
              <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                <path stroke-linecap="round" stroke-linejoin="round" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0" />
              </svg>
              {{ sesionInfo()?.grupo_nombre }}
            </span>

            <!-- Fecha -->
            @if (sesionInfo()?.iniciada_en) {
              <span class="flex items-center gap-1">
                <svg xmlns="http://www.w3.org/2000/svg" class="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
                  <path stroke-linecap="round" stroke-linejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                {{ sesionInfo()!.iniciada_en | date: 'dd/MM/yyyy HH:mm' }}
              </span>
            }

            <!-- Código -->
            <span class="flex items-center gap-1 font-mono text-xs bg-slate-100 px-2 py-0.5 rounded">
              {{ sesionInfo()?.codigo_acceso }}
            </span>

          </div>
        </div>

        <!-- ── Tarjetas de resumen estadístico ── -->
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">

          <!-- Total alumnos -->
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Total Alumnos
            </p>
            <p class="text-2xl font-bold text-slate-900">{{ filas().length }}</p>
          </div>

          <!-- Enviaron -->
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Enviaron
            </p>
            <p class="text-2xl font-bold text-slate-900">{{ totalEnviaron() }}</p>
          </div>

          <!-- Promedio grupal -->
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Promedio Grupal
            </p>
            <p class="text-2xl font-bold"
              [class.text-green-600]="promedioGrupal() >= 60"
              [class.text-red-600]="promedioGrupal() < 60"
            >
              {{ promedioGrupal() }}%
            </p>
          </div>

          <!-- Aprobados -->
          <div class="bg-white border border-slate-200 rounded-xl p-4">
            <p class="text-xs font-medium text-slate-500 uppercase tracking-wider mb-1">
              Aprobados (≥60%)
            </p>
            <p class="text-2xl font-bold text-green-600">{{ totalAprobados() }}</p>
          </div>

        </div>

        <!-- ── Tabla de resultados ── -->
        @if (filas().length === 0) {
          <app-empty-state
            icono="default"
            titulo="Sin resultados aún"
            descripcion="Ningún alumno ha enviado el examen todavía."
          />
        } @else {
          <div class="bg-white border border-slate-200 rounded-xl overflow-hidden">

            <div class="overflow-x-auto">
              <table
                class="w-full text-sm"
                role="table"
                aria-label="Resultados de alumnos"
              >
                <thead>
                  <tr class="border-b border-slate-200 bg-slate-50">
                    <th class="text-left px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Nombre
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Nota
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Cumplido
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Sin cumplir
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Acertado
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Equivocado
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Tiempo
                    </th>
                    <th class="text-center px-4 py-3 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                      Estado
                    </th>
                  </tr>
                </thead>

                <tbody class="divide-y divide-slate-100">
                  @for (fila of filas(); track fila.id) {
                    <tr
                      app-fila-resultado
                      [fila]="fila"
                      class="hover:bg-slate-50 transition-colors"
                    ></tr>
                  }
                </tbody>

              </table>
            </div>

          </div>
        }

      }

    </main>
  `,
})
export class ResultadosComponent implements OnInit {
  // ── Dependencias ────────────────────────────────────────────────
  private readonly supabase = inject(SupabaseService);
  private readonly route    = inject(ActivatedRoute);

  // ── Estado ───────────────────────────────────────────────────────

  /** Info de la sesión para el encabezado */
  readonly sesionInfo = signal<SesionInfo | null>(null);

  /** Filas de la tabla (un registro por alumno) */
  readonly filas = signal<SesionAlumnoConDatos[]>([]);

  /** Total de preguntas del examen (para calcular sin_cumplir) */
  readonly totalPreguntas = signal(0);

  readonly cargando = signal(false);
  readonly error    = signal<string | null>(null);

  // ── Computed ─────────────────────────────────────────────────────

  /** Cantidad de alumnos que enviaron el examen */
  readonly totalEnviaron = computed(
    () => this.filas().filter((f) => f.estado === 'enviado').length
  );

  /** Promedio de porcentaje de los alumnos que enviaron */
  readonly promedioGrupal = computed(() => {
    const enviados = this.filas().filter(
      (f) => f.estado === 'enviado' && f.porcentaje != null
    );
    if (enviados.length === 0) return 0;
    const suma = enviados.reduce((acc, f) => acc + (f.porcentaje ?? 0), 0);
    return Math.round(suma / enviados.length);
  });

  /** Alumnos con porcentaje >= 60 */
  readonly totalAprobados = computed(
    () => this.filas().filter((f) => (f.porcentaje ?? 0) >= 60).length
  );

  // ── Ciclo de vida ─────────────────────────────────────────────

  async ngOnInit(): Promise<void> {
    const sesionId = this.route.snapshot.paramMap.get('sesionId');
    if (!sesionId) {
      this.error.set('No se especificó una sesión.');
      return;
    }
    await this.cargarResultados(sesionId);
  }

  // ── Carga de datos ────────────────────────────────────────────

  /**
   * Carga todos los datos necesarios para la tabla:
   * 1. Info de la sesión (examen, grupo, fechas)
   * 2. Registros de sesion_alumnos con el nombre del alumno
   *
   * @param sesionId UUID de la sesión
   */
  private async cargarResultados(sesionId: string): Promise<void> {
    this.cargando.set(true);
    this.error.set(null);

    // ── Cargar info de la sesión ────────────────────────────────
    const { data: sesionData, error: sesionError } = await this.supabase.client
      .from('sesiones')
      .select(`
        id,
        codigo_acceso,
        iniciada_en,
        examenes (
          titulo,
          duracion_min,
          grupos ( nombre ),
          preguntas ( id )
        )
      `)
      .eq('id', sesionId)
      .single();

    if (sesionError || !sesionData) {
      this.error.set('No se encontró la sesión especificada.');
      this.cargando.set(false);
      return;
    }

    const examen = (sesionData as any).examenes;

    this.sesionInfo.set({
      examen_titulo:  examen?.titulo ?? '—',
      grupo_nombre:   examen?.grupos?.nombre ?? '—',
      iniciada_en:    sesionData.iniciada_en,
      duracion_min:   examen?.duracion_min ?? 0,
      codigo_acceso:  sesionData.codigo_acceso,
    });

    // Guardar total de preguntas para calcular "sin cumplir" en la fila
    this.totalPreguntas.set((examen?.preguntas ?? []).length);

    // ── Cargar registros de sesion_alumnos + nombre del alumno ──
    const { data: alumnosData, error: alumnosError } = await this.supabase.client
      .from('sesion_alumnos')
      .select(`
        id,
        alumno_id,
        estado,
        iniciado_en,
        enviado_en,
        tiempo_usado_min,
        porcentaje,
        total_correctas,
        total_incorrectas,
        alumnos ( nombre_completo )
      `)
      .eq('sesion_id', sesionId)
      .order('alumnos(nombre_completo)', { ascending: true });

    if (alumnosError) {
      this.error.set('No se pudieron cargar los resultados de los alumnos.');
      this.cargando.set(false);
      return;
    }

    // Aplanar el join para exponer alumno_nombre directamente
    const filasEnriquecidas: SesionAlumnoConDatos[] = (alumnosData ?? []).map(
      (sa: any) => ({
        ...sa,
        alumno_nombre:   sa.alumnos?.nombre_completo ?? '—',
        total_preguntas: this.totalPreguntas(), // para calcular sin_cumplir en fila
      })
    );

    this.filas.set(filasEnriquecidas);
    this.cargando.set(false);
  }
}