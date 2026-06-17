import { ApplicationConfig, LOCALE_ID, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';
import localEs from '@angular/common/locales/es';

import { routes } from './app.routes';
import { registerLocaleData } from '@angular/common';

registerLocaleData(localEs);

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    { provide: LOCALE_ID, useValue: 'es'}
  ]
};
