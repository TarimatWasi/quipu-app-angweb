import type { MockScenario } from '../mock-scenarios';
import { MockDb } from './mock-db';
import { seedAdministrators } from './seed-administrators';
import { seedCredits, seedPayments, seedRefunds, seedStays } from './seed-payments';
import { seedDocumentActions, seedDocuments } from './seed-documents';
import { seedExpenses, seedFines, seedPendingCredits } from './seed-finance';
import {
  seedCaseContracts,
  seedCaseEnvironments,
  seedCaseGuests,
  seedCasePayments,
} from './seed-contract-cases';
import { seedContracts, seedEnvironments, seedGuests } from './seed-people';

/**
 * A fresh copy of the data for a scenario. «Vacío» keeps the environments and the guests (the demo
 * accounts must still sign in) and the administrators but has no contract, stay, payment or refund.
 * The contracts in every state of A4 (seed-contract-cases) come with their guests and environments.
 */
export function seedDb(scenario: MockScenario): MockDb {
  const environments = [...seedEnvironments(), ...seedCaseEnvironments()];
  const guests = [...seedGuests(), ...seedCaseGuests()];
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
      expenses: [],
      fines: [],
    });
  }
  const refunds = seedRefunds();
  const payments = [...seedPayments(), ...seedCasePayments()];
  const credits = seedCredits(refunds);
  seedPendingCredits(payments, credits);
  return new MockDb({
    environments,
    guests,
    contracts: [...seedContracts(guests, environments), ...seedCaseContracts(guests, environments)],
    stays: seedStays(),
    payments,
    refunds,
    credits,
    administrators: seedAdministrators(),
    documents,
    documentActions: seedDocumentActions(documents),
    expenses: seedExpenses(),
    fines: seedFines(),
  });
}
