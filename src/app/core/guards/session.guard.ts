import { inject } from '@angular/core';
import { CanActivateFn, Router, ActivatedRouteSnapshot } from '@angular/router';

export const sessionGuard: CanActivateFn = (route: ActivatedRouteSnapshot) => {
  const router = inject(Router);

  // Verificar que el alumno haya pasado por la sala de espera
  // (el servicio ExamenActivoService guarda el alumno en signal)
  // Por ahora lo validamos con sessionStorage como fallback ligero
  const codigo = route.parent?.params['codigo'];
  const alumnoId = sessionStorage.getItem(`proctor_alumno_${codigo}`);

  if (alumnoId) {
    return true;
  }

  // Regresar a la sala de espera con el mismo código
  router.navigate(['/examen', codigo]);
  return false;
};