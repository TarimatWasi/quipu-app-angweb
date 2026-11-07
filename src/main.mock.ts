// Entry point of the `mock` build only (angular.json, QP-ANGWEB-ENV-01): the app of src/main.ts
// with the BFF simulated in the browser. Production never starts from here.
import { bootstrapApplication } from '@angular/platform-browser';
import { appConfig } from './app/app.config';
import { AppComponent } from './app/app.component';
import { withMockBff } from '@core/mock/mock-providers';

try {
  await bootstrapApplication(AppComponent, withMockBff(appConfig));
} catch (error: unknown) {
  reportError(error);
}
