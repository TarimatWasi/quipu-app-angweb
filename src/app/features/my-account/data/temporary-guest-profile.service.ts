import { inject, Injectable } from '@angular/core';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { OwnProfileClient } from './own-profile';

/** T3: the data and the documents of the temporary guest. */
@Injectable({ providedIn: 'root' })
export class TemporaryGuestProfileService extends OwnProfileClient {
  protected readonly base = `${inject(BFF_BASE_URL)}/bff/temporary-guest`;
}
