import { Component } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { CsrfStatusComponent } from '@core/http/csrf-status.component';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, CsrfStatusComponent],
  template: '<app-csrf-status /><router-outlet />',
})
export class AppComponent {}
