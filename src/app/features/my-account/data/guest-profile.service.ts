import { inject, Injectable } from '@angular/core';
import { BFF_BASE_URL } from '@core/config/bff-base-url';
import { OwnProfileClient } from './own-profile';

/** H5: the data and the documents of the guest with a contract. */
@Injectable({ providedIn: 'root' })
export class GuestProfileService extends OwnProfileClient {
  protected readonly base = `${inject(BFF_BASE_URL)}/bff/guest`;
}
