/**
 * examen-shell.component.ts
 * ─────────────────────────────────────────────────────────────────
 * Componente envoltorio (shell) para todas las rutas del alumno
 * bajo /examen/:codigo/*.
 *
 * PROPÓSITO:
 *  Proveer ExamenActivoService a nivel de la ruta padre, de modo que
 *  SalaEsperaComponent, ExamenComponent y ResultadoAlumnoComponent
 *  compartan la MISMA instancia del servicio durante todo el flujo.
 *
 *  Sin este shell, SalaEsperaComponent proveería el servicio y lo
 *  destruiría al navegar a /evaluacion, perdiendo todo el estado.
 *
 * ARQUITECTURA:
 *  - Renderiza <router-outlet> para los hijos
 *  - providers: [ExamenActivoService] → instancia vive mientras la
 *    ruta /examen/:codigo/* esté activa
 *  - OnPush
 * ─────────────────────────────────────────────────────────────────
 */

import { Component, ChangeDetectionStrategy } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { ExamenActivoService } from '../services/examen-activo.service';

@Component({
  selector: 'app-examen-shell',
  changeDetection: ChangeDetectionStrategy.OnPush,
  imports: [RouterOutlet],
  providers: [ExamenActivoService],
  template: `<router-outlet />`,
})
export class ExamenShellComponent {}
