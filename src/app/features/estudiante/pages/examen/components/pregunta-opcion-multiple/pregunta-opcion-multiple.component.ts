/**
 * pregunta-opcion-multiple.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Renderiza una pregunta de opción múltiple con sus 4 opciones.
 *
 * DISEÑO (según PDF - página 8):
 *  - Texto de pregunta en negritas grandes
 *  - 4 opciones como botones seleccionables (radio estilo card)
 *  - La opción seleccionada se resalta con borde azul
 *  - Navegación Anterior / Siguiente en el footer
 *
 * ARQUITECTURA:
 *  - Componente dumb: recibe datos, emite selección
 *  - No sabe si la respuesta es correcta (eso solo se calcula al enviar)
 *  - OnPush
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
} from '@angular/core';
import { PreguntaActiva, OpcionActiva } from '../../../../services/examen-activo.service';

@Component({
  selector: 'app-pregunta-opcion-multiple',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div class="space-y-4">

      <!-- Texto de la pregunta -->
      <h2 class="text-lg font-bold text-slate-900 leading-snug">
        {{ pregunta().texto }}
      </h2>

      <!-- Opciones de respuesta -->
      <div class="space-y-3" role="radiogroup" [attr.aria-label]="pregunta().texto">
        @for (opcion of pregunta().opciones; track opcion.id) {
          <button
            type="button"
            (click)="seleccionar(opcion)"
            class="w-full flex items-center gap-4 px-4 py-3.5 rounded-xl border-2 text-left transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-1"
            [class.border-blue-500]="opcionSeleccionadaId() === opcion.id"
            [class.bg-blue-50]="opcionSeleccionadaId() === opcion.id"
            [class.border-slate-200]="opcionSeleccionadaId() !== opcion.id"
            [class.bg-white]="opcionSeleccionadaId() !== opcion.id"
            [class.hover:border-slate-300]="opcionSeleccionadaId() !== opcion.id"
            [attr.role]="'radio'"
            [attr.aria-checked]="opcionSeleccionadaId() === opcion.id"
            [attr.aria-label]="opcion.texto"
          >
            <!-- Indicador radio circular -->
            <div
              class="w-5 h-5 rounded-full border-2 flex items-center justify-center shrink-0 transition-colors"
              [class.border-blue-600]="opcionSeleccionadaId() === opcion.id"
              [class.bg-blue-600]="opcionSeleccionadaId() === opcion.id"
              [class.border-slate-300]="opcionSeleccionadaId() !== opcion.id"
            >
              @if (opcionSeleccionadaId() === opcion.id) {
                <div class="w-2 h-2 rounded-full bg-white"></div>
              }
            </div>

            <!-- Texto de la opción -->
            <span
              class="text-sm leading-relaxed"
              [class.font-medium]="opcionSeleccionadaId() === opcion.id"
              [class.text-blue-700]="opcionSeleccionadaId() === opcion.id"
              [class.text-slate-700]="opcionSeleccionadaId() !== opcion.id"
            >
              {{ opcion.texto }}
            </span>

          </button>
        }
      </div>

    </div>
  `,
})
export class PreguntaOpcionMultipleComponent {
  // ── Inputs ───────────────────────────────────────────────────────

  /** Datos de la pregunta actual */
  pregunta = input.required<PreguntaActiva>();

  /** ID de la opción que el alumno ya seleccionó (null si no ha elegido) */
  opcionSeleccionadaId = input<string | null>(null);

  // ── Outputs ──────────────────────────────────────────────────────

  /** Emite la opción elegida cuando el alumno la presiona */
  opcionElegida = output<OpcionActiva>();

  // ── Métodos ─────────────────────────────────────────────────────

  /**
   * Emite la opción seleccionada hacia ExamenComponent.
   * ExamenComponent llama a ExamenActivoService.guardarRespuesta().
   */
  seleccionar(opcion: OpcionActiva): void {
    this.opcionElegida.emit(opcion);
  }
}