/**
 * Generated from the BFF contract v0.1.2 (TarimatWasi/quipu-lib-contracts), spec sha256 c7eba417dbbf3d697f47b8443536ae6e9d6fd9cc3826c2af375222a0e2430830.
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
        /** Register guest (RF-02, RF-14, CU-02) — triggers credential email if an email is provided (RF-11) */
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
        /** Edit guest — contact data and type-specific fields only; document id and consent are immutable after creation (RN-18, RN-14) */
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
        /** Reactivate a previously deactivated guest — restores login access (RN-12) */
        post: operations["reactivateGuest"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/resend-credentials": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /** Resend credentials — invalidates the previous temporary password (RF-17, CU-13) */
        post: operations["resendGuestCredentials"];
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
        /** Edit expense — no audit restriction (RN-24) */
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
        /** Edit own contact data (CU-20) */
        patch: operations["updateOwnProfile"];
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
        /** Edit own contact data (CU-23) */
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
        GuestInput: {
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            name: string;
            phone?: string;
            /** Format: email */
            contactEmail?: string;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            /** @description Must be true (RN-14) */
            dataConsent: boolean;
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
            emergencyContact?: components["schemas"]["EmergencyContact"];
        };
        /** @description Optional, never blocks guest registration (RN-29) */
        EmergencyContact: {
            name?: string;
            relationship?: string;
            phone?: string;
        };
        /** @description Editable subset of GuestInput. documentType/documentNumber (RN-18 identity key) and dataConsent (RN-14, captured once at creation) are immutable after creation — not included here. */
        GuestUpdateInput: {
            name?: string;
            phone?: string;
            /** Format: email */
            contactEmail?: string;
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
            emergencyContact?: components["schemas"]["EmergencyContact"];
        };
        GuestSummary: {
            /** Format: uuid */
            id: string;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            name: string;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            /** @enum {string} */
            status: "ACTIVE" | "INACTIVE";
            hasLoginAccess: boolean;
        };
        GuestDetail: components["schemas"]["GuestSummary"] & {
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["Payment"][];
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
            amount: number;
            month: string;
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
        Expense: components["schemas"]["ExpenseInput"] & {
            /** Format: uuid */
            id: string;
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
        /** @description Rate limit exceeded (SEC-01) — retry after the window in the `Retry-After` header */
        TooManyRequests: {
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
                    "application/json": {
                        /** @enum {string} */
                        role: "ADMIN" | "GUEST";
                        /**
                         * @description only when role is GUEST
                         * @enum {string|null}
                         */
                        guestType?: "CONTRACT" | "TEMPORARY" | null;
                        name: string;
                        /** @description true on first login with a temporary password (RF-12) */
                        mustChangePassword: boolean;
                    };
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["InvalidCredentials"];
            403: components["responses"]["AccountDisabled"];
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
            /** @description Active session data */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        role: "ADMIN" | "GUEST";
                        /**
                         * @description only when role is GUEST
                         * @enum {string|null}
                         */
                        guestType?: "CONTRACT" | "TEMPORARY" | null;
                        name: string;
                    };
                };
            };
            401: components["responses"]["NoSession"];
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
                    code: string;
                    /** @enum {string} */
                    type: "ROOM" | "CABIN";
                };
            };
        };
        responses: {
            /** @description Environment created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Environment"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            /** @description Duplicate environment code (RN-*) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
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
        requestBody?: {
            content: {
                "application/json": {
                    code?: string;
                    /** @enum {string} */
                    type?: "ROOM" | "CABIN";
                };
            };
        };
        responses: {
            /** @description Environment updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Environment"];
                };
            };
            401: components["responses"]["NoSession"];
            404: components["responses"]["NotFound"];
            /** @description Duplicate environment code (RN-*) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
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
            /** @description Environment deactivated, history preserved */
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
            /** @description Environment reactivated, visible in active listings again */
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
    listGuests: {
        parameters: {
            query?: {
                type?: "CONTRACT" | "TEMPORARY";
                status?: "ACTIVE" | "INACTIVE" | "ALL";
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
            /** @description Guest created (or linked to an existing person by document id, RN-18) */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestSummary"];
                };
            };
            /** @description Consent not accepted (RN-14) or invalid document id */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
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
            401: components["responses"]["NoSession"];
            404: components["responses"]["NotFound"];
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
    resendGuestCredentials: {
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
            /** @description Resend email queued */
            202: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            404: components["responses"]["NotFound"];
            /** @description Guest has no registered email */
            422: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
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
            /** @description Expense list */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"][];
                };
            };
            401: components["responses"]["NoSession"];
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
            /** @description Invalid amount */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
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
            /** @description Expense deleted */
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
    updateExpense: {
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
            401: components["responses"]["NoSession"];
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
            /** @description No active contract (RN-27) */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
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
                "application/json": {
                    phone?: string;
                    /** Format: email */
                    contactEmail?: string;
                };
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
                "application/json": {
                    phone?: string;
                    /** Format: email */
                    contactEmail?: string;
                };
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
        };
    };
}
