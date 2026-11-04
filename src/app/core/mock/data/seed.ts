import type { MockScenario } from '../mock-scenarios';
import { MockDb } from './mock-db';
import { seedCredits, seedPayments, seedRefunds, seedStays } from './seed-payments';
import { seedContracts, seedEnvironments, seedGuests } from './seed-people';

/**
 * A fresh copy of the data for a scenario. «Vacío» keeps the environments and the guests (the demo
 * accounts must still sign in) but has no contract, stay, payment or refund.
 */
export function seedDb(scenario: MockScenario): MockDb {
  const environments = seedEnvironments();
  const guests = seedGuests();
  if (scenario === 'empty') {
    return new MockDb({
      environments,
      guests,
      contracts: [],
      stays: [],
      payments: [],
      refunds: [],
      credits: new Map(),
    });
  }
  const refunds = seedRefunds();
  return new MockDb({
    environments,
    guests,
    contracts: seedContracts(guests, environments),
    stays: seedStays(),
    payments: seedPayments(),
    refunds,
    credits: seedCredits(refunds),
  });
}
