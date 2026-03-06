import { ApplicationConfig, provideZoneChangeDetection, LOCALE_ID } from '@angular/core';
import { provideRouter, withComponentInputBinding } from '@angular/router';
import { provideHttpClient, withFetch } from '@angular/common/http';
import { registerLocaleData } from '@angular/common';
import localeEsMx from '@angular/common/locales/es-MX';

import { routes } from './app.routes';

registerLocaleData(localeEsMx);

export const appConfig: ApplicationConfig = {
  providers: [
    provideZoneChangeDetection({ eventCoalescing: true }),
    provideRouter(routes, withComponentInputBinding()),
    provideHttpClient(withFetch()),
    { provide: LOCALE_ID, useValue: 'es-MX' },
  ]
};