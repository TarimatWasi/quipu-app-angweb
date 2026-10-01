import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';

// reportError surfaces a failed bootstrap through the window error event (no console, FE-ANG-EST-03).
bootstrapApplication(AppComponent, appConfig).catch((error: unknown) => {
  reportError(error);
});
