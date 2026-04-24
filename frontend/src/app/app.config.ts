import { APP_INITIALIZER, ApplicationConfig, provideBrowserGlobalErrorListeners } from '@angular/core';
import { provideRouter } from '@angular/router';

import { routes } from './app.routes';
import { provideClientHydration, withEventReplay } from '@angular/platform-browser';
import { provideStore } from '@ngrx/store';
import { blogReducer } from './store/blog.reducer';
import { provideEffects } from '@ngrx/effects';
import { BlogEffects } from './store/blog.effects';

export const appConfig: ApplicationConfig = {
  providers: [
    provideBrowserGlobalErrorListeners(),
    provideRouter(routes),
    provideStore({
      blogs:blogReducer
    }),
    provideEffects([BlogEffects]),
  ],
};
