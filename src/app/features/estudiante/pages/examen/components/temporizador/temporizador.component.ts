/**
 * temporizador.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Muestra la cuenta regresiva del tiempo del examen.
 * Se torna rojo cuando quedan menos de 2 minutos.
 *
 * ARQUITECTURA:
 *  - Componente dumb: recibe `segundosRestantes` como input
 *  - Emite `tiempoAgotado` cuando llega a 0
 *  - No maneja el intervalo (eso lo hace ExamenComponent)
 *  - OnPush: solo re-renderiza cuando cambia el input
 * ─────────────────────────────────────────────────────────────────
 */

import {
  Component,
  ChangeDetectionStrategy,
  input,
  output,
  computed,
  effect,
} from '@angular/core';

@Component({
  selector: 'app-temporizador',
  changeDetection: ChangeDetectionStrategy.OnPush,
  template: `
    <div
      class="flex items-center gap-1.5 px-3 py-1.5 rounded-lg font-mono text-sm font-bold transition-colors"
      [class.bg-red-100]="urgente()"
      [class.text-red-600]="urgente()"
      [class.bg-slate-100]="!urgente()"
      [class.text-slate-700]="!urgente()"
      role="timer"
      [attr.aria-label]="'Tiempo restante: ' + tiempoFormateado()"
    >
      <!-- Icono reloj (parpadea cuando es urgente) -->
      <svg
        xmlns="http://www.w3.org/2000/svg"
        class="w-4 h-4 shrink-0"
        [class.animate-pulse]="urgente()"
        fill="none"
        viewBox="0 0 24 24"
        stroke="currentColor"
        stroke-width="2"
      >
        <circle cx="12" cy="12" r="10"/>
        <path stroke-linecap="round" d="M12 6v6l4 2"/>
      </svg>

      {{ tiempoFormateado() }}
    </div>
  `,
})
export class TemporizadorComponent {
  // ── Inputs ───────────────────────────────────────────────────────

  /** Segundos restantes del examen (viene del ExamenComponent) */
  segundosRestantes = input.required<number>();

  // ── Outputs ──────────────────────────────────────────────────────

  /** Emite cuando el contador llega exactamente a 0 */
  tiempoAgotado = output<void>();

  // ── Computed ─────────────────────────────────────────────────────

  /** Formatea segundos a "mm:ss" para mostrar en pantalla */
  readonly tiempoFormateado = computed(() => {
    const s = Math.max(0, this.segundosRestantes());
    const min = Math.floor(s / 60).toString().padStart(2, '0');
    const sec = (s % 60).toString().padStart(2, '0');
    return `${min}:${sec}`;
  });

  /**
   * true cuando quedan menos de 2 minutos (120 segundos).
   * Cambia el color a rojo para alertar al alumno.
   */
  readonly urgente = computed(() => this.segundosRestantes() <= 120);

  constructor() {
    // Emitir el evento cuando el tiempo llega a 0
    effect(() => {
      if (this.segundosRestantes() <= 0) {
        this.tiempoAgotado.emit();
      }
    });
  }
}