import type { MockScenario } from '../mock-scenarios';
import { MockDb } from './mock-db';
import { seedAdministrators } from './seed-administrators';
import { seedCredits, seedPayments, seedRefunds, seedStays } from './seed-payments';
import { seedDocumentActions, seedDocuments } from './seed-documents';
import { seedContracts, seedEnvironments, seedGuests } from './seed-people';

/**
 * A fresh copy of the data for a scenario. «Vacío» keeps the environments and the guests (the demo
 * accounts must still sign in) and the administrators but has no contract, stay, payment or refund.
 */
export function seedDb(scenario: MockScenario): MockDb {
  const environments = seedEnvironments();
  const guests = seedGuests();
  const documents = seedDocuments(guests);
  if (scenario === 'empty') {
    return new MockDb({
      environments,
      guests,
      contracts: [],
      stays: [],
      payments: [],
      refunds: [],
      credits: new Map(),
      administrators: seedAdministrators(),
      documents,
      documentActions: [],
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
    administrators: seedAdministrators(),
    documents,
    documentActions: seedDocumentActions(documents),
  });
}
