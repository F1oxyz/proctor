import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { AuthService } from '../services/auth.service';

export const authGuard: CanActivateFn = async () => {
  const auth = inject(AuthService);
  const router = inject(Router);

  // Esperar a que la sesión async de Supabase se inicialice antes de comprobar
  // Esto evita la condición de carrera al refrescar la página (Bug 2)
  await auth.aguardarInicializacion();

  if (auth.isAuthenticated()) {
    return true;
  }

  router.navigate(['/']);
  return false;
};
