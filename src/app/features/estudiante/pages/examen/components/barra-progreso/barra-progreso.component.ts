/**
 * barra-progreso.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Muestra el progreso del examen: "QUESTION X OF N" con barra visual.
 *
 * ARQUITECTURA:
 *  - Componente dumb: solo recibe inputs y muestra UI
 *  - OnPush para rendimiento
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  computed,
} from '@angular/core';

@Component({
  selector: 'app-barra-progreso',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-2">

      <!-- Etiqueta "QUESTION X OF N" -->
      <div class="flex items-center justify-between">
        <span class="text-xs font-semibold text-slate-500 uppercase tracking-widest">
          Pregunta {{ preguntaActual() }} de {{ totalPreguntas() }}
        </span>
        <span class="text-xs text-slate-400">
          {{ porcentaje() }}%
        </span>
      </div>

      <!-- Barra de progreso -->
      <div
        class="w-full h-1.5 bg-slate-200 rounded-full overflow-hidden"
        role="progressbar"
        [attr.aria-valuenow]="preguntaActual()"
        [attr.aria-valuemin]="1"
        [attr.aria-valuemax]="totalPreguntas()"
        [attr.aria-label]="'Pregunta ' + preguntaActual() + ' de ' + totalPreguntas()"
      >
        <div
          class="h-full bg-blue-600 rounded-full transition-all duration-300"
          [style.width]="porcentaje() + '%'"
        ></div>
      </div>

    </div>
  `,
})
export class BarraProgresoComponent {
  // ── Inputs ───────────────────────────────────────────────────────

  /** Número de pregunta actual (1-based) */
  preguntaActual = input.required<number>();

  /** Total de preguntas del examen */
  totalPreguntas = input.required<number>();

  // ── Computed ─────────────────────────────────────────────────────

  /** Porcentaje de avance para el ancho de la barra */
  readonly porcentaje = computed(() => {
    const total = this.totalPreguntas();
    if (total === 0) return 0;
    return Math.round(((this.preguntaActual() - 1) / total) * 100);
  });
}