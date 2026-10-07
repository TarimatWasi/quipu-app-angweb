/**
 * Generated from the BFF contract v0.2.2 (TarimatWasi/quipu-lib-contracts), spec sha256 1a682f3019517ffeab93a1f99ffedd45db678d143e4fc08a5fd845dcf8a5dfc9.
 * Do not edit by hand: run `npm run contract:sync`.
 */

export interface paths {
    "/auth/login": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Log in (RF-08, CU-15) */
        post: operations["login"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/logout": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Log out */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/me": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Current session */
        get: operations["getCurrentUser"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/activate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Activate access with the single-use link and choose the password (RF-11, RF-12, CU-24)
         * @description The administrator hands the guest a link (RN-32) whose token is single-use and expires 30 minutes after it was generated. The guest opens it and chooses their own password; the session starts right away. It also serves an already active guest whose password was lost: the administrator generates a new access (`POST /admin/guests/{id}/access`) and the guest sets a new password with it; the previous password stays valid until the link is used.
         */
        post: operations["activateAccess"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/change-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Change password — mandatory on first login (RF-12)
         * @description `currentPassword` is optional only while the session still has the password change pending (first login with a temporary password) and required otherwise. On success the response sets a fresh `sessionToken` cookie without the pending mark. A new password equal to the current (or temporary) one is rejected.
         */
        post: operations["changePassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/forgot-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Request password recovery (RF-16) */
        post: operations["requestPasswordReset"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/reset-password": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reset password with a single-use code (RF-16) */
        post: operations["resetPassword"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/environments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List environments (RF-01) */
        get: operations["listEnvironments"];
        put?: never;
        /** Create environment (RF-01, CU-01) */
        post: operations["createEnvironment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/environments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Environment detail */
        get: operations["getEnvironment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Edit environment */
        patch: operations["updateEnvironment"];
        trace?: never;
    };
    "/admin/environments/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Soft-deactivate environment (RF-13, RN-12, CU-10) */
        post: operations["deactivateEnvironment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/environments/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Reactivate a previously deactivated environment (RN-12) */
        post: operations["reactivateEnvironment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List guests (RF-02) */
        get: operations["listGuests"];
        put?: never;
        /**
         * Register guest with the minimal data and generate their access (RF-02, RF-11, CU-02, CU-09)
         * @description The administrator registers only the document type and number and the guest type (RN-31); optionally a phone or an email to notify. The guest completes everything else in the onboarding (RF-20). The guest is created pending activation and the response carries the first access (link or temporary password, valid 30 minutes, RN-32). If an email was given, the access is also sent to it by email, best-effort: the activation link in LINK mode, the temporary password itself in TEMPORARY_PASSWORD mode. If the document is already registered nothing is created or modified: the existing guest comes back with `alreadyRegistered: true` and a 200 (RN-18). The response is never cacheable (`Cache-Control: no-store`) because it carries the access in clear.
         */
        post: operations["createGuest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Guest 360 detail (CU-06) — personal data, contract, payment history */
        get: operations["getGuestDetail"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Correct the document (only while pending activation) and manage the stay data (RN-17, RN-36). The personal and contact data belong to the guest alone and are edited through the guest's own endpoints. */
        patch: operations["updateGuest"];
        trace?: never;
    };
    "/admin/guests/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Soft-deactivate guest — loses login access (RF-13, RN-12, CU-10) */
        post: operations["deactivateGuest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reactivate a previously deactivated guest — restores login access and the state it had when deactivated (RF-13, RN-12, CU-28)
         * @description Answers the guest as it stands after reactivating: if the access it had expired meanwhile the guest comes back pending activation and the administrator offers to generate a new access.
         */
        post: operations["reactivateGuest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/access": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Generate a new access (link or temporary password) for a guest — invalidates the previous one (RF-17, CU-13)
         * @description Covers an expired, lost or undelivered access, and a guest without email. Any guest that is not inactive qualifies, active ones included (an administrator-assisted password recovery). Generating a new access revokes the previous one, but the guest's current password stays valid until the new link or temporary password is used. The response carries the access in clear and is never cacheable (`Cache-Control: no-store`).
         */
        post: operations["generateGuestAccess"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Documents the guest uploaded in the onboarding, with a short-lived signed link (RN-37, CU-27)
         * @description Only the administrator sees these files. Each `url` is a signed R2 link that expires 5 minutes after the response; ask again for a new one.
         */
        get: operations["listGuestDocuments"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** A guest's payment history, admin view (RF-10) */
        get: operations["listGuestPaymentsByAdmin"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/contracts": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List contracts with validity status (RF-09, CU-07) */
        get: operations["listContracts"];
        put?: never;
        /** Upload contract (RF-03, CU-03) */
        post: operations["createContract"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/contracts/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Contract detail */
        get: operations["getContract"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/contracts/{id}/terminate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Manually terminate contract (RN-25, CU-12) — blocked if there is outstanding debt */
        post: operations["terminateContract"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/dashboard": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Administrator home summary (HU-A04, CU-04) */
        get: operations["getAdminDashboard"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/finance": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Income vs. expenses balance for a month (RF-18, CU-08) */
        get: operations["getFinanceSummary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Payment review queue (RF-05, CU-05) */
        get: operations["listPayments"];
        put?: never;
        /** Register a direct payment (cash/manual) — admin uploads the voucher on the guest's behalf, auto-approved (RN-22, RN-23, CU-14). A voucher is always required, no exceptions (RN-22). */
        post: operations["createDirectPayment"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/payments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Approve or reject a payment (RF-05, CU-05) */
        patch: operations["resolvePayment"];
        trace?: never;
    };
    "/admin/expenses": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List monthly expenses (RF-07, CU-08) */
        get: operations["listExpenses"];
        put?: never;
        /** Register expense (RF-07) */
        post: operations["createExpense"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/expenses/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete expense — no audit restriction (RN-24) */
        delete: operations["deleteExpense"];
        options?: never;
        head?: never;
        /** Edit expense — replaces its category, amount, month and description; no audit restriction (RN-24) */
        patch: operations["updateExpense"];
        trace?: never;
    };
    "/admin/fines": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** List monthly fines (RF-19) */
        get: operations["listFines"];
        put?: never;
        /** Register fine as income against a guest (RF-19, RN-30) */
        post: operations["createFine"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/fines/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        /** Delete fine — no audit restriction (RN-24) */
        delete: operations["deleteFine"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/account-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Payment status by period — up to date/pending/overdue (RF-06, CU-16) */
        get: operations["getGuestAccountStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/contract": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own contract, regardless of status — shown read-only even when EXPIRED or TERMINATED (CU-18, RN-26). A guest never loses visibility of their own contract; only the ability to act on it changes with status (e.g. voucher upload requires ACTIVE, see /guest/payments). */
        get: operations["getOwnContract"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Own payment history (RF-10, CU-19) — own record only (RN-09) */
        get: operations["listOwnPayments"];
        put?: never;
        /** Upload monthly payment voucher (RF-04, CU-17) */
        post: operations["uploadPaymentVoucher"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Edit own personal and contact data (CU-20, RN-17) */
        patch: operations["updateOwnProfile"];
        trace?: never;
    };
    "/guest/onboarding": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Onboarding state — next step, saved data and the consent text in force (RF-20, CU-26)
         * @description Lets the guest resume where they left off. `nextStep` is the first pending step in the order PASSWORD, PERSONAL_DATA, DOCUMENTS, CONSENT (RN-33); the documents step is optional (RN-37) but is still offered once.
         */
        get: operations["getOnboarding"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/onboarding/personal-data": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Save the personal data step (RF-20, CU-25)
         * @description Requires the password step to be done (RN-33). Only while the guest is in onboarding; afterwards the data is edited through the profile endpoint.
         */
        put: operations["savePersonalData"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/onboarding/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload one optional document (RN-37, RF-15, CU-25)
         * @description One file per call; repeat for more. At most 5 files per guest, each JPG, PNG or PDF of up to 5 MB, checked by real content (SEC-07). The guest never gets the file back: only the administrator sees it. Files are neither deleted nor replaced.
         */
        post: operations["uploadOnboardingDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/onboarding/documents/done": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Mark the documents step as finished, with files or skipped (RN-37, CU-25) */
        post: operations["finishDocumentsStep"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/onboarding/consent": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Accept the personal data consent — closes the onboarding (RF-14, RN-14, CU-11)
         * @description Records the acceptance with date, time and the text version. With the password and personal data steps already done, the guest becomes ACTIVE (RN-33, RN-36). Accepting before the personal data step answers 409 `ONBOARDING_STEP_OUT_OF_ORDER`.
         */
        post: operations["acceptConsent"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/payment-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** Payment status for the stay period (CU-21) */
        get: operations["getTemporaryGuestPaymentStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/payments": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Upload one-time payment voucher (RF-04, CU-22) — a temporary guest record allows exactly one voucher ever, pending or approved (RN-03: single non-recurring payment). A second stay is a new guest record (RN-13), never a second voucher on this one. */
        post: operations["uploadTemporaryVoucher"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/profile": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Edit own personal and contact data (CU-23, RN-17) */
        patch: operations["updateOwnProfileTemporary"];
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /** @description BFF error shape — plain JSON, distinct from RFC 7807 (that is exclusive to the internal Core API, see SRS chapter "10 - APIs e Integraciones"). `code` is a stable English constant read by the frontend; `message` is the Spanish text shown to the end user. */
        Error: {
            /** @description Stable error code, e.g. VOUCHER_ALREADY_EXISTS */
            code: string;
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** @description Field name if this is a validation error */
            field?: string;
        };
        /**
         * @description DNI (national ID, 8 digits), CE (Carné de Extranjería), PASSPORT (foreign visitors without CE)
         * @enum {string}
         */
        DocumentType: "DNI" | "CE" | "PASSPORT";
        Environment: {
            /** Format: uuid */
            id: string;
            code: string;
            /** @enum {string} */
            type: "ROOM" | "CABIN";
            /** @enum {string} */
            status: "ACTIVE" | "INACTIVE";
        };
        /** @description Session data answered by login, link activation and `GET /auth/me`, in one of four shapes: the administrator, a guest that must still set its password (temporary password), a guest in onboarding with the password already set (with the step to go to) or an active guest. `name` is the guest's name; while the guest has not completed the personal data step it is the document in text (for example "DNI 12345678") so the field is always there. */
        SessionInfo: components["schemas"]["AdminSession"] | components["schemas"]["GuestPasswordPendingSession"] | components["schemas"]["GuestOnboardingSession"] | components["schemas"]["GuestActiveSession"];
        AdminSession: {
            /** @enum {string} */
            role: "ADMIN";
            name: string;
            /** @description true until the administrator changes a temporary password (RF-12) */
            mustChangePassword: boolean;
        };
        /** @description A guest that logged in with a temporary password and must choose its own first (RF-12, RN-33) */
        GuestPasswordPendingSession: {
            /** @enum {string} */
            role: "GUEST";
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            name: string;
            /** @enum {boolean} */
            mustChangePassword: true;
            /** @enum {string} */
            guestStatus: "ONBOARDING";
            /** @enum {string} */
            nextOnboardingStep: "PASSWORD";
        };
        /** @description A guest whose password is set and whose onboarding still has steps left (RN-33) */
        GuestOnboardingSession: {
            /** @enum {string} */
            role: "GUEST";
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            name: string;
            /** @enum {boolean} */
            mustChangePassword: false;
            /** @enum {string} */
            guestStatus: "ONBOARDING";
            /**
             * @description First pending step, in the order of RN-33
             * @enum {string}
             */
            nextOnboardingStep: "PERSONAL_DATA" | "DOCUMENTS" | "CONSENT";
        };
        /** @description A guest that completed the onboarding (RN-36) */
        GuestActiveSession: {
            /** @enum {string} */
            role: "GUEST";
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            name: string;
            /** @description true while a temporary password has not been changed (RF-12) */
            mustChangePassword: boolean;
            /** @enum {string} */
            guestStatus: "ACTIVE";
        };
        /** @description A guest that has just set its password through the activation link and still has onboarding steps left */
        ActivatedOnboardingSession: {
            /** @enum {string} */
            role: "GUEST";
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            name: string;
            /** @enum {boolean} */
            mustChangePassword: false;
            /** @enum {string} */
            guestStatus: "ONBOARDING";
            /** @enum {string} */
            nextOnboardingStep: "PERSONAL_DATA" | "DOCUMENTS" | "CONSENT";
        };
        /** @description An already active guest that recovered its access with a new link */
        ActivatedActiveSession: {
            /** @enum {string} */
            role: "GUEST";
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            name: string;
            /** @enum {boolean} */
            mustChangePassword: false;
            /** @enum {string} */
            guestStatus: "ACTIVE";
        };
        /**
         * @description Guest lifecycle (RN-36). Inactive is reversible (RN-12)
         * @enum {string}
         */
        GuestStatus: "PENDING_ACTIVATION" | "ONBOARDING" | "ACTIVE" | "INACTIVE";
        /**
         * @description How the administrator delivers the access: an activation link or a temporary password (RN-32)
         * @enum {string}
         */
        AccessMode: "LINK" | "TEMPORARY_PASSWORD";
        /** @description An access generated by the administrator. Valid 30 minutes and single use (RN-32). The secret is given only here, in clear, and cannot be read again, so each mode requires its own secret: `activationUrl` for LINK, `temporaryPassword` for TEMPORARY_PASSWORD. */
        AccessGrant: components["schemas"]["LinkAccessGrant"] | components["schemas"]["PasswordAccessGrant"];
        LinkAccessGrant: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            mode: "LINK";
            /** @description Single-use activation link (RN-32) */
            activationUrl: string;
            /** Format: date-time */
            expiresAt: string;
            /** @description true if the access (the link, or the temporary password) was sent to the guest's email (best-effort, RN-19) */
            emailSent: boolean;
            /** @description Spanish text ready to copy or to send by WhatsApp, with the link and the 30-minute notice */
            shareMessage: string;
        };
        PasswordAccessGrant: {
            /**
             * @description discriminator enum property added by openapi-typescript
             * @enum {string}
             */
            mode: "TEMPORARY_PASSWORD";
            /** @description Temporary password, valid 30 minutes (RN-32) */
            temporaryPassword: string;
            /** Format: date-time */
            expiresAt: string;
            /** @description true if the access (the link, or the temporary password) was sent to the guest's email (best-effort, RN-19) */
            emailSent: boolean;
            /** @description Spanish text ready to copy or to send by WhatsApp, with the password and the 30-minute notice */
            shareMessage: string;
        };
        /** @description Minimal registration by the administrator (RN-31) */
        GuestInput: {
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            /** @description Optional, to notify the guest */
            phone?: string;
            /**
             * Format: email
             * @description Optional: if present the access (the link or the temporary password, depending on accessMode) is also sent by email (RN-19)
             */
            contactEmail?: string;
            accessMode: components["schemas"]["AccessMode"];
        };
        /** @description Answer of a registration that created the guest; it always carries the first access */
        GuestCreated: {
            guest: components["schemas"]["PendingGuestSummary"];
            /** @enum {boolean} */
            alreadyRegistered: false;
            access: components["schemas"]["AccessGrant"];
        };
        /** @description A guest that is not inactive: what the duplicate-document answer (RN-18) and a successful reactivation (RN-12) return */
        NonInactiveGuestSummary: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description null until the guest completes the personal data step */
            name: string | null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            /** @enum {string} */
            status: "PENDING_ACTIVATION" | "ONBOARDING" | "ACTIVE";
            hasLoginAccess: boolean;
        };
        /** @description A guest just created by the administrator: always pending activation (RN-36) and still without a name (RN-31) */
        PendingGuestSummary: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /**
             * @description Always null: the guest completes the personal data in the onboarding (RN-31)
             * @enum {string|null}
             */
            name: null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            /** @enum {string} */
            status: "PENDING_ACTIVATION";
            hasLoginAccess: boolean;
        };
        /** @description Answer when the document was already registered; the guest comes back unmodified and no access is generated (RN-18) */
        GuestAlreadyRegistered: {
            guest: components["schemas"]["NonInactiveGuestSummary"];
            /** @enum {boolean} */
            alreadyRegistered: true;
        };
        /** @description Optional, never blocks guest registration (RN-29) */
        EmergencyContact: {
            name?: string;
            relationship?: string;
            phone?: string;
        };
        /** @description What the administrator may change: the document, only while the guest is pending activation (RN-36), and the stay data of a temporary guest. Personal and contact data are the guest's alone (RN-17). */
        GuestUpdateInput: {
            documentType?: components["schemas"]["DocumentType"];
            documentNumber?: string;
            /**
             * Format: date
             * @description Only when guest type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @description Only when guest type=TEMPORARY
             */
            stayEndDate?: string;
            /** @description Only when guest type=TEMPORARY */
            agreedAmount?: number;
        };
        /** @description Personal data step of the onboarding (RN-33) */
        PersonalDataInput: {
            name: string;
            phone: string;
            /**
             * Format: email
             * @description Optional; without it the password can only be recovered through the administrator (RF-16, RF-17)
             */
            contactEmail?: string;
            emergencyContact?: components["schemas"]["EmergencyContact"];
        };
        /** @description The guest edits their own data; every field is optional (RN-17) */
        ProfileUpdateInput: {
            name?: string;
            phone?: string;
            /** Format: email */
            contactEmail?: string;
            emergencyContact?: components["schemas"]["EmergencyContact"];
        };
        ConsentInput: {
            /**
             * @description Must be true (RN-14); anything else is answered 400 CONSENT_NOT_ACCEPTED
             * @enum {boolean}
             */
            accepted: true;
            /** @description Version of the text being accepted; must be the one in `OnboardingState.consent.version` */
            consentVersion: string;
        };
        GuestSummary: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description null until the guest completes the personal data step */
            name: string | null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            status: components["schemas"]["GuestStatus"];
            hasLoginAccess: boolean;
        };
        /**
         * @description Ordered onboarding progress of a guest (RN-33): the password is chosen, then the personal data saved, then the documents step finished or skipped, then the consent accepted (COMPLETED, which is what an ACTIVE guest always has). One value, so impossible combinations cannot be expressed.
         * @enum {string}
         */
        OnboardingProgress: "NOT_STARTED" | "PASSWORD_SET" | "PERSONAL_DATA_SAVED" | "DOCUMENTS_DONE" | "COMPLETED";
        /** @description Guest 360 detail. `status` and `onboardingProgress` go together (RN-33, RN-36): pending activation has not started, an onboarding guest is anywhere before the consent, an active guest is always COMPLETED and an inactive one keeps the progress it had. */
        GuestDetail: components["schemas"]["PendingGuestDetail"] | components["schemas"]["OnboardingGuestDetail"] | components["schemas"]["OnboardingPersonalDataSavedGuestDetail"] | components["schemas"]["ActiveGuestDetail"] | components["schemas"]["InactiveGuestDetail"];
        PendingGuestDetail: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description null until the guest completes the personal data step */
            name: string | null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            hasLoginAccess: boolean;
            phone?: string | null;
            contactEmail?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /** @description Only when type=TEMPORARY */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["Payment"][];
            /** @enum {string} */
            status: "PENDING_ACTIVATION";
            /** @enum {string} */
            onboardingProgress: "NOT_STARTED";
        };
        /** @description Onboarding guest whose personal data is not saved yet (the name and phone may be missing) */
        OnboardingGuestDetail: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description null until the guest completes the personal data step */
            name: string | null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            hasLoginAccess: boolean;
            phone?: string | null;
            contactEmail?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /** @description Only when type=TEMPORARY */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["Payment"][];
            /** @enum {string} */
            status: "ONBOARDING";
            /** @enum {string} */
            onboardingProgress: "NOT_STARTED" | "PASSWORD_SET";
        };
        /** @description Onboarding guest whose personal data is saved, so the name and phone are always there (RN-33) */
        OnboardingPersonalDataSavedGuestDetail: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            name: string;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            hasLoginAccess: boolean;
            phone: string;
            contactEmail?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /** @description Only when type=TEMPORARY */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["Payment"][];
            /** @enum {string} */
            status: "ONBOARDING";
            /** @enum {string} */
            onboardingProgress: "PERSONAL_DATA_SAVED" | "DOCUMENTS_DONE";
        };
        /** @description Active guest, so the onboarding is complete and the name and phone are always there (RN-33, RN-36) */
        ActiveGuestDetail: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            name: string;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            hasLoginAccess: boolean;
            phone: string;
            contactEmail?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /** @description Only when type=TEMPORARY */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["Payment"][];
            /** @enum {string} */
            status: "ACTIVE";
            /** @enum {string} */
            onboardingProgress: "COMPLETED";
        };
        InactiveGuestDetail: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description null until the guest completes the personal data step */
            name: string | null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            hasLoginAccess: boolean;
            phone?: string | null;
            contactEmail?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @description Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /** @description Only when type=TEMPORARY */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["Payment"][];
            /** @enum {string} */
            status: "INACTIVE";
            onboardingProgress: components["schemas"]["OnboardingProgress"];
        };
        /** @description A document as the guest sees it, without a link: only the administrator can open the file (RN-37) */
        GuestDocumentRef: {
            /** Format: uuid */
            id: string;
            originalName: string;
            /** @enum {string} */
            contentType: "image/jpeg" | "image/png" | "application/pdf";
            sizeBytes: number;
            /** Format: date-time */
            uploadedAt: string;
        };
        /** @description A document as the administrator sees it: with a short-lived signed link (RN-37) */
        GuestDocument: {
            /** Format: uuid */
            id: string;
            originalName: string;
            /** @enum {string} */
            contentType: "image/jpeg" | "image/png" | "application/pdf";
            sizeBytes: number;
            /** Format: date-time */
            uploadedAt: string;
            /** @description R2 signed URL, expires 5 minutes after the response (RN-37) */
            url: string;
            /** Format: date-time */
            urlExpiresAt: string;
        };
        /** @description Onboarding state. While the guest is in onboarding `nextStep` names the step to go to; once active there is no `nextStep` (RN-33, RN-36). */
        OnboardingState: components["schemas"]["OnboardingInProgress"] | components["schemas"]["OnboardingCompleted"];
        /** @description Onboarding still open (the password is already chosen). Before the personal data step is saved the data is not there yet; from the documents step on it is always returned. */
        OnboardingInProgress: components["schemas"]["OnboardingPersonalDataPending"] | components["schemas"]["OnboardingDocumentsPending"] | components["schemas"]["OnboardingConsentPending"];
        OnboardingPersonalDataPending: {
            /** @enum {string} */
            status: "ONBOARDING";
            /**
             * @description The password step is already done: a guest that still must change its temporary password cannot reach the onboarding operations (RF-12)
             * @enum {string}
             */
            nextStep: "PERSONAL_DATA";
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["PendingConsentState"];
        };
        /** @description Personal data saved; the optional documents step is next (the answer of saving the personal data) */
        OnboardingDocumentsPending: {
            /** @enum {string} */
            status: "ONBOARDING";
            /** @enum {string} */
            nextStep: "DOCUMENTS";
            personalData: components["schemas"]["PersonalDataInput"];
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["PendingConsentState"];
        };
        /** @description Documents step finished or skipped; only the consent is left (the answer of finishing the documents step) */
        OnboardingConsentPending: {
            /** @enum {string} */
            status: "ONBOARDING";
            /** @enum {string} */
            nextStep: "CONSENT";
            personalData: components["schemas"]["PersonalDataInput"];
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["PendingConsentState"];
        };
        OnboardingCompleted: {
            /** @enum {string} */
            status: "ACTIVE";
            personalData: components["schemas"]["PersonalDataInput"];
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["AcceptedConsentState"];
        };
        /** @description The consent in force, not yet accepted (the guest is still in onboarding) */
        PendingConsentState: {
            version: string;
            /** @description Consent text in force, in Spanish */
            text: string;
            /** @enum {boolean} */
            accepted: false;
        };
        /** @description The consent the guest accepted, which is what completes the onboarding (RN-14, RN-36) */
        AcceptedConsentState: {
            version: string;
            /** @description Consent text that was accepted, in Spanish */
            text: string;
            /** @enum {boolean} */
            accepted: true;
        };
        Contract: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            environmentId: string;
            /** Format: uuid */
            guestId: string;
            monthlyAmount: number;
            paymentDay: number;
            graceDays: number;
            /** Format: date */
            startDate: string;
            /**
             * Format: date
             * @description null means an open-ended contract (RN-07)
             */
            endDate?: string | null;
            /** @enum {string} */
            status: "ACTIVE" | "EXPIRED" | "TERMINATED";
            /** @description R2 signed URL, expires in 15 min */
            fileUrl: string;
        };
        Payment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            guestId: string;
            /** @example 2026-09 */
            period: string;
            amount: number;
            /** @description Free text per payment (RN-28) */
            paymentMethod?: string | null;
            /** @enum {string} */
            status: "PENDING" | "APPROVED" | "REJECTED";
            rejectionReason?: string | null;
            /** @description R2 signed URL — every payment has a voucher, no exceptions (RN-22, includes admin-direct payments per RN-23) */
            voucherUrl: string;
            /** Format: date-time */
            createdAt: string;
        };
        PeriodStatus: {
            /** @example 2026-09 */
            period: string;
            /** @enum {string} */
            status: "PAID" | "UNDER_REVIEW" | "UNPAID" | "OVERDUE";
        };
        ExpenseInput: {
            /** @enum {string} */
            category: "WATER" | "ELECTRICITY" | "INTERNET" | "OTHER";
            /** @description In soles, greater than 0, at most two decimals */
            amount: number;
            /**
             * @description Month the expense belongs to
             * @example 2026-09
             */
            month: string;
            /** @description Optional; blank means none */
            description?: string;
        };
        FineInput: {
            /** Format: uuid */
            guestId: string;
            amount: number;
            month: string;
            description?: string;
        };
        Fine: components["schemas"]["FineInput"] & {
            /** Format: uuid */
            id: string;
        };
        /** @description An expense as the BFF answers it; the fields of `ExpenseInput`, with the same constraints, plus its `id`. The description is left out when there is none. */
        Expense: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            category: "WATER" | "ELECTRICITY" | "INTERNET" | "OTHER";
            /** @description In soles, greater than 0, at most two decimals */
            amount: number;
            /** @example 2026-09 */
            month: string;
            description?: string;
        };
    };
    responses: {
        /** @description Invalid input data */
        ValidationFailed: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Resource does not exist */
        NotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The session is valid but its role cannot use the operation (RN-08, RN-09). The `code` is always `AUTH_FORBIDDEN` */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_FORBIDDEN";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /** @description Another environment already has that code (RF-01). The `code` is always `ENVIRONMENT_CODE_TAKEN` and `field` is always `code` */
        EnvironmentCodeTaken: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "ENVIRONMENT_CODE_TAKEN";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                    /** @enum {string} */
                    field: "code";
                };
            };
        };
        /** @description No active session */
        NoSession: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Incorrect document or password */
        InvalidCredentials: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The session must change its password first (RF-12). Any endpoint except login and change-password answers `AUTH_PASSWORD_CHANGE_REQUIRED` until it does. */
        PasswordChangeRequired: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Account disabled (RN-12) */
        AccountDisabled: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Account temporarily locked after 5 consecutive failed logins (SEG-06): the lock lasts 15 minutes, expires by itself and is lifted by a password reset (RF-16). The `code` is always `AUTH_ACCOUNT_LOCKED` */
        AccountLocked: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_ACCOUNT_LOCKED";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /** @description Rate limit exceeded (SEC-01) — retry after the window in the `Retry-After` header */
        TooManyRequests: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The guest is inactive (RN-12, RN-18). The `code` is always `GUEST_INACTIVE` and `guestId` lets the administrator reactivate it right from the notice (`POST /admin/guests/{id}/reactivate`, CU-28) */
        GuestInactive: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "GUEST_INACTIVE";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                    /** Format: uuid */
                    guestId: string;
                };
            };
        };
        /** @description A guest session that cannot use the onboarding operation. The `code` is `AUTH_PASSWORD_CHANGE_REQUIRED` while a temporary password has not been changed (RF-12) or `AUTH_FORBIDDEN` for the administrator. Never `AUTH_ONBOARDING_REQUIRED`: these are the routes an incomplete guest must reach */
        OnboardingAccessDenied: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /** @description The guest session cannot use the operation yet or at all. The `code` is `AUTH_ONBOARDING_REQUIRED` while the onboarding is incomplete (RN-33: the client redirects to the first pending step, `nextStep` of `GET /guest/onboarding`), `AUTH_PASSWORD_CHANGE_REQUIRED` while a temporary password has not been changed (RF-12) and `AUTH_FORBIDDEN` for a guest of the other type (a CONTRACT guest on `/temporary-guest/**` or the reverse, RN-09) */
        GuestAccessDenied: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /** @description `ONBOARDING_STEP_OUT_OF_ORDER` (a step was attempted before its predecessor, RN-33) or `ONBOARDING_ALREADY_COMPLETED` (the guest is already active: use the profile endpoint) */
        OnboardingConflict: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
    };
    parameters: {
        Id: string;
    };
    requestBodies: never;
    headers: never;
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    login: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    documentType: components["schemas"]["DocumentType"];
                    documentNumber: string;
                    password: string;
                };
            };
        };
        responses: {
            /** @description Session started — HttpOnly JWT cookie issued (SameSite=Lax; Secure) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionInfo"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            /** @description `AUTH_INVALID_CREDENTIALS` (incorrect document or password) or `AUTH_TEMPORARY_PASSWORD_EXPIRED` (the temporary password was correct but its 30 minutes are over, RN-32: the guest asks the administrator for a new access). The expired code is only given when the password matched, so it never reveals whether a document exists */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            403: components["responses"]["AccountDisabled"];
            423: components["responses"]["AccountLocked"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    logout: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session closed, cookie invalidated */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
        };
    };
    getCurrentUser: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Active session data, read from the account in the database (not from the token), so the client can restore the session after a reload */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["SessionInfo"];
                };
            };
            401: components["responses"]["NoSession"];
        };
    };
    activateAccess: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Single-use token from the activation link */
                    token: string;
                    /** @description At most 72 bytes in UTF-8 (bcrypt limit) */
                    newPassword: string;
                };
            };
        };
        responses: {
            /** @description Access activated — HttpOnly JWT cookie issued. Always a guest session with the password already set: the guest goes on to the onboarding (never back to the password step) or, if it was already active (administrator-assisted recovery), straight to the home */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivatedOnboardingSession"] | components["schemas"]["ActivatedActiveSession"];
                };
            };
            /** @description `AUTH_INVALID_OR_EXPIRED_CODE` (unknown, expired, revoked or already used token: one generic answer for all of them), `AUTH_WEAK_PASSWORD` (with `field: newPassword`; the token is not consumed) or `VALIDATION_ERROR` if a field is missing */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            403: components["responses"]["AccountDisabled"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    changePassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Optional when coming from the forced first-login flow */
                    currentPassword?: string;
                    /** @description At most 72 bytes in UTF-8 (bcrypt limit) */
                    newPassword: string;
                };
            };
        };
        responses: {
            /** @description Password updated; Set-Cookie replaces the session */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description `AUTH_WEAK_PASSWORD` (shorter than 8 characters or longer than 72 bytes) or `AUTH_PASSWORD_UNCHANGED` (same as the current one), both with `field: newPassword`; `VALIDATION_ERROR` if the field is missing */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
        };
    };
    requestPasswordReset: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** Format: email */
                    email: string;
                };
            };
        };
        responses: {
            /** @description Always 202, whether the email exists or not (generic response by design — never reveals account existence, RF-16). When the account exists and is active, the email carries a link with a single-use code that expires in 30 minutes (SEG-05). */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["ValidationFailed"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    resetPassword: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Single-use code from the link in the recovery email */
                    code: string;
                    /** @description At most 72 bytes in UTF-8 (bcrypt limit) */
                    newPassword: string;
                };
            };
        };
        responses: {
            /** @description Password reset; the code can no longer be used */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description `AUTH_INVALID_OR_EXPIRED_CODE` (unknown, expired or already used code, or a disabled account: one generic answer for all of them), `AUTH_WEAK_PASSWORD` (with `field: newPassword`; the code is not consumed) or `VALIDATION_ERROR` if a field is missing */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    listEnvironments: {
        parameters: {
            query?: {
                status?: "ACTIVE" | "INACTIVE" | "ALL";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Environment list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Environment"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
        };
    };
    createEnvironment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Unique, e.g. "201". Surrounding spaces are ignored; at least one character is not a space */
                    code: string;
                    /** @enum {string} */
                    type: "ROOM" | "CABIN";
                };
            };
        };
        responses: {
            /** @description Environment created, always ACTIVE */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Environment"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["EnvironmentCodeTaken"];
        };
    };
    getEnvironment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Environment detail */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Environment"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateEnvironment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    code?: string;
                    /** @enum {string} */
                    type?: "ROOM" | "CABIN";
                };
            };
        };
        responses: {
            /** @description Environment updated (status is not changed here, see deactivate and reactivate) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Environment"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["EnvironmentCodeTaken"];
        };
    };
    deactivateEnvironment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Environment deactivated, history preserved; deactivating an inactive one changes nothing */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    reactivateEnvironment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Environment reactivated, visible in active listings again; reactivating an active one changes nothing */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listGuests: {
        parameters: {
            query?: {
                type?: "CONTRACT" | "TEMPORARY";
                /** @description CURRENT is every guest except the inactive ones (pending activation, onboarding and active) */
                status?: "CURRENT" | "PENDING_ACTIVATION" | "ONBOARDING" | "ACTIVE" | "INACTIVE" | "ALL";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Guest list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestSummary"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
        };
    };
    createGuest: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["GuestInput"];
            };
        };
        responses: {
            /** @description The document was already registered: the existing guest, unmodified, with `alreadyRegistered: true` and no `access` (RN-18) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestAlreadyRegistered"];
                };
            };
            /** @description Guest created pending activation, with its first access */
            201: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestCreated"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            409: components["responses"]["GuestInactive"];
        };
    };
    getGuestDetail: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Consolidated guest view */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestDetail"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateGuest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["GuestUpdateInput"];
            };
        };
        responses: {
            /** @description Guest updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestSummary"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            /** @description `GUEST_DOCUMENT_LOCKED` (the document can only be corrected while the guest is pending activation, RN-36) or `GUEST_DOCUMENT_TAKEN` (the corrected document already belongs to another guest, RN-18), both with the `field` that caused it */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    deactivateGuest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Guest deactivated */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    reactivateGuest: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Guest reactivated, login access restored */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["NonInactiveGuestSummary"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    generateGuestAccess: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    accessMode: components["schemas"]["AccessMode"];
                };
            };
        };
        responses: {
            /** @description New access generated; the previous one is revoked */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccessGrant"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            409: components["responses"]["GuestInactive"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listGuestDocuments: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Documents of the guest (empty if none was uploaded) */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestDocument"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listGuestPaymentsByAdmin: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Payment history for the given guest */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listContracts: {
        parameters: {
            query?: {
                status?: "ACTIVE" | "EXPIRED" | "TERMINATED";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Contract list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contract"][];
                };
            };
            401: components["responses"]["NoSession"];
        };
    };
    createContract: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description PDF, ≤10MB (RF-15)
                     */
                    file: string;
                    /** Format: uuid */
                    environmentId: string;
                    /** Format: uuid */
                    guestId: string;
                    monthlyAmount: number;
                    paymentDay: number;
                    graceDays: number;
                    /** Format: date */
                    startDate: string;
                    /**
                     * Format: date
                     * @description optional; omitted means an open-ended contract (RN-07)
                     */
                    endDate?: string;
                };
            };
        };
        responses: {
            /** @description Contract created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contract"];
                };
            };
            /** @description Invalid file, end date before start date, etc. */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            /** @description Environment already has an active contract (RN-20) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    getContract: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Contract detail */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contract"];
                };
            };
            401: components["responses"]["NoSession"];
            404: components["responses"]["NotFound"];
        };
    };
    terminateContract: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Contract terminated */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            /** @description Unpaid periods pending (RN-25) — detail in the body */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    getAdminDashboard: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Dashboard summary */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        paymentsUpToDate: number;
                        paymentsPending: number;
                        paymentsOverdue: number;
                        pendingVouchers: components["schemas"]["Payment"][];
                    };
                };
            };
            401: components["responses"]["NoSession"];
        };
    };
    getFinanceSummary: {
        parameters: {
            query: {
                month: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Monthly balance */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        totalIncome: number;
                        totalExpenses: number;
                        net: number;
                    };
                };
            };
            /** @description Invalid month parameter */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
        };
    };
    listPayments: {
        parameters: {
            query?: {
                status?: "PENDING" | "APPROVED" | "REJECTED";
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Payment list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"][];
                };
            };
            401: components["responses"]["NoSession"];
        };
    };
    createDirectPayment: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB (RF-15)
                     */
                    file: string;
                    /** Format: uuid */
                    guestId: string;
                    period: string;
                    amount: number;
                };
            };
        };
        responses: {
            /** @description Payment registered, status APPROVED immediately (RN-23) */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            /** @description Invalid file (RF-15) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            /** @description An approved payment already exists for this period (RN-02) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    resolvePayment: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @enum {string} */
                    status: "APPROVED" | "REJECTED";
                    /** @description Required when status=REJECTED (RN-05) */
                    reason?: string;
                };
            };
        };
        responses: {
            /** @description Payment resolved */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            /** @description Empty reason on rejection (RN-05) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            /** @description Payment already resolved */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    listExpenses: {
        parameters: {
            query: {
                month: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Expense list of the month, oldest first */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"][];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
        };
    };
    createExpense: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExpenseInput"];
            };
        };
        responses: {
            /** @description Expense created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
        };
    };
    deleteExpense: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Expense deleted for good (RN-24) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    updateExpense: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExpenseInput"];
            };
        };
        responses: {
            /** @description Expense updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
        };
    };
    listFines: {
        parameters: {
            query: {
                month: string;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Fine list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Fine"][];
                };
            };
            401: components["responses"]["NoSession"];
        };
    };
    createFine: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["FineInput"];
            };
        };
        responses: {
            /** @description Fine created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Fine"];
                };
            };
            /** @description Invalid amount or month */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            /** @description Guest not found */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    deleteFine: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Fine deleted */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            404: components["responses"]["NotFound"];
        };
    };
    getGuestAccountStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Status per period */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PeriodStatus"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    getOwnContract: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own contract, whatever its status */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contract"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description No contract was ever associated with this guest */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
        };
    };
    listOwnPayments: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own payment history */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    uploadPaymentVoucher: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB (RF-15)
                     */
                    file: string;
                    period: string;
                    /** @description Optional free text, e.g. Yape/transfer/cash (RN-28) */
                    paymentMethod?: string;
                };
            };
        };
        responses: {
            /** @description Voucher uploaded, payment set to PENDING */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            /** @description Invalid file (RF-15) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            /** @description `VOUCHER_NO_ACTIVE_CONTRACT` (no active contract, RN-27), `AUTH_ONBOARDING_REQUIRED` (the onboarding is not complete, RN-33), `AUTH_PASSWORD_CHANGE_REQUIRED` (temporary password not changed, RF-12) or `AUTH_FORBIDDEN` (a guest of the other type, RN-09) */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        code: "VOUCHER_NO_ACTIVE_CONTRACT" | "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                    };
                };
            };
            /** @description A pending voucher already exists for this period (RN-15) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    updateOwnProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ProfileUpdateInput"];
            };
        };
        responses: {
            /** @description Profile updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestSummary"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    getOnboarding: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Current onboarding state */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OnboardingState"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
        };
    };
    savePersonalData: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["PersonalDataInput"];
            };
        };
        responses: {
            /** @description Step saved */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OnboardingDocumentsPending"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
            409: components["responses"]["OnboardingConflict"];
        };
    };
    uploadOnboardingDocument: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB (RF-15)
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Document stored */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestDocumentRef"];
                };
            };
            /** @description `DOCUMENT_INVALID_FILE` (type or size not allowed, RF-15) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
            /** @description `DOCUMENT_LIMIT_REACHED` (the guest already has 5 files), `ONBOARDING_STEP_OUT_OF_ORDER` or `ONBOARDING_ALREADY_COMPLETED` */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    finishDocumentsStep: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Step finished */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OnboardingConsentPending"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
            409: components["responses"]["OnboardingConflict"];
        };
    };
    acceptConsent: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ConsentInput"];
            };
        };
        responses: {
            /** @description Consent recorded and the guest is now ACTIVE: the onboarding is complete */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OnboardingCompleted"];
                };
            };
            /** @description `CONSENT_NOT_ACCEPTED` (`accepted` is not true) or `VALIDATION_ERROR` with `field: consentVersion` if it is not the version in force */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
            409: components["responses"]["OnboardingConflict"];
        };
    };
    getTemporaryGuestPaymentStatus: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Stay payment status */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PeriodStatus"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    uploadTemporaryVoucher: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB (RF-15)
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Voucher uploaded, payment set to PENDING */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            /** @description Invalid file (RF-15) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description A voucher already exists for this stay, pending or approved (RN-03, RN-15) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    updateOwnProfileTemporary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: {
            content: {
                "application/json": components["schemas"]["ProfileUpdateInput"];
            };
        };
        responses: {
            /** @description Profile updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestSummary"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
}
