/**
 * Generated from the BFF contract f2f99ed9b7671eb346ce85aa2d3cd636b5e98003 (TarimatWasi/quipu-lib-contracts), spec sha256 2614f8505eed54a499daa8f565d61c932912c51653d4404549a94eb5d98324d9.
 * Do not edit by hand: run `npm run contract:sync`.
 */

export interface paths {
    "/admin/changes/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Stream admin resource invalidations (TAR-370)
         * @description ADR-SSE-01 (TAR-369/TAR-370). UTF-8 SSE byte stream, not a JSON document/array. A blank line terminates a frame. Named events carry JSON data; the media-type x-sse-events map selects its component schema. The first event is ready after subscription registration. Always synchronize visible authorized resources after ready/reconnection, even when epoch/version did not change. Preserve dirty drafts/files; mark edited forms stale instead of rebuilding them. Keep invalidations received during a GET for a subsequent grouped reload. Restart lists from the first page, preserving filters/month. ALL affects mounted, authorized resources only; no background GET fanout or toast per event. No durable delivery, replay, id field or Last-Event-ID recovery. Version gaps do not prove lost changes or order HTTP responses. Server-selected recipients only: no user/session/resource selectors. Resource ids are masked for the receiving session, never the actor. Cookies, role, session/account security version, edge gate and origin are checked before opening. This safe GET does not require CSRF. Idle heartbeats are comments every 20 seconds, with no database query or version increment. Initially four streams per account, 64 globally; one connection per visible browser tab shared by mounted resources. Each frame is at most 8192 UTF-8 bytes; excessive keys/bytes collapse to ALL rather than truncating a frame. Lifetime is min(access-token expiry, opening + 15 minutes). Logout, revocation and security-version changes close affected streams. closing is best-effort; disconnects may happen without it. On access-token-expired or session-updated, close the old EventSource and check/renew through the shared HttpClient refresh path before reopening. session-updated preserves the current sid after password change; other sessions are revoked. session-revoked ends the session. max-duration/server-shutdown may retry. EventSource bypasses HttpClient interceptors and cannot inspect status/headers: close it on error before controlled recovery. A successful /auth/me probe does not prove permission to open this stream. After five consecutive attempts without ready, stop automatic attempts and require an explicit user retry; reset that budget only after ready, not merely the HTTP open event. Network/5xx preserves the session, with capped exponential backoff/jitter (1 to 30 seconds); definitive auth/refresh rejection ends it. A 403 must not create a refresh loop. Respect Retry-After when observable; otherwise wait at least 30 seconds if connection-limit rejection cannot be distinguished. Close when hidden/logout and synchronize on return. Once HTTP 200 is committed, no new status or JSON error replaces the stream: close it, optionally with closing. Existing GETs remain the source of truth. No inbox, polling, bus or scheduler is introduced. Administrators only receive keys they are authorized to query. Producers cover payments/contracts and, with TAR-376, guest/access, profile/document, stay, environment, expense and fine mutations after commit. Passage of time does not independently emit invalidations. Deploy compatible consumers before enabling new resource keys.
         */
        get: operations["streamAdminChanges"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/changes/stream": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Stream guest resource invalidations (TAR-370)
         * @description ADR-SSE-01 (TAR-369/TAR-370). UTF-8 SSE byte stream, not a JSON document/array. A blank line terminates a frame. Named events carry JSON data; the media-type x-sse-events map selects its component schema. The first event is ready after subscription registration. Always synchronize visible authorized resources after ready/reconnection, even when epoch/version did not change. Preserve dirty drafts/files; mark edited forms stale instead of rebuilding them. Keep invalidations received during a GET for a subsequent grouped reload. Restart lists from the first page, preserving filters/month. ALL affects mounted, authorized resources only; no background GET fanout or toast per event. No durable delivery, replay, id field or Last-Event-ID recovery. Version gaps do not prove lost changes or order HTTP responses. Server-selected recipients only: no user/session/resource selectors. Resource ids are masked for the receiving session, never the actor. Cookies, role, session/account security version, edge gate and origin are checked before opening. This safe GET does not require CSRF. Idle heartbeats are comments every 20 seconds, with no database query or version increment. Initially four streams per account, 64 globally; one connection per visible browser tab shared by mounted resources. Each frame is at most 8192 UTF-8 bytes; excessive keys/bytes collapse to ALL rather than truncating a frame. Lifetime is min(access-token expiry, opening + 15 minutes). Logout, revocation and security-version changes close affected streams. closing is best-effort; disconnects may happen without it. On access-token-expired or session-updated, close the old EventSource and check/renew through the shared HttpClient refresh path before reopening. session-updated preserves the current sid after password change; other sessions are revoked. session-revoked ends the session. max-duration/server-shutdown may retry. EventSource bypasses HttpClient interceptors and cannot inspect status/headers: close it on error before controlled recovery. A successful /auth/me probe does not prove permission to open this stream. After five consecutive attempts without ready, stop automatic attempts and require an explicit user retry; reset that budget only after ready, not merely the HTTP open event. Network/5xx preserves the session, with capped exponential backoff/jitter (1 to 30 seconds); definitive auth/refresh rejection ends it. A 403 must not create a refresh loop. Respect Retry-After when observable; otherwise wait at least 30 seconds if connection-limit rejection cannot be distinguished. Close when hidden/logout and synchronize on return. Once HTTP 200 is committed, no new status or JSON error replaces the stream: close it, optionally with closing. Existing GETs remain the source of truth. No inbox, polling, bus or scheduler is introduced. Both CONTRACT and TEMPORARY guests use this endpoint. guest.stay is the temporary guest payment-status resource; guest.payment:<id> uses the own detail route for either guest type. A session required to change its temporary password cannot open the stream. guest.profile invalidates the own profile and document metadata for either guest type; it never carries files, signed URLs or personal data. Deploy compatible consumers before enabling this key (TAR-376).
         */
        get: operations["streamGuestChanges"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/csrf": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Prepare the browser CSRF cookie (TAR-300)
         * @description Makes a CSRF token available in the XSRF-TOKEN cookie without requiring a session. An expired or malformed JWT cookie is ignored on this route. Reuses an existing token; repeated GET requests do not rotate it. The cookie is readable by Angular (HttpOnly=false), Secure in deployed environments, SameSite=Lax, Path=/, and host-only (no Domain). The same-origin proxy preserves Set-Cookie and never caches this response. After logout obtain a new token before another unsafe request. No token value is returned in the response body or logged.
         */
        get: operations["getCsrfToken"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
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
        /**
         * Log out
         * @description Closes this session on the server (TAR-228): its refresh token stops working and its access token is refused from then on, even before its 15 minutes end. The session is found by the refresh token, so logout also works once the access token has expired. Other sessions of the account stay open.
         */
        post: operations["logout"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/auth/refresh": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Renew the session with the refresh token (TAR-228)
         * @description Needs only the `refreshToken` cookie and the CSRF pair, not a live access token. On success it rotates the refresh token and issues a new access token for the same session: ids masked in this session stay valid. Within 30 seconds of a rotation the previous refresh token answers 204 without Set-Cookie, so concurrent tabs keep the cookies another tab just received. Rate limited per client.
         */
        post: operations["refreshSession"];
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
         * @description `currentPassword` is optional only while the session still has the password change pending (first login with a temporary password) and required otherwise (A0.6, any administrator or guest from the account menu). On success the response sets fresh `sessionToken` and `refreshToken` cookies without the pending mark for this same session, and every other session of the account is closed, refresh tokens included (decided 2026-11-01, TAR-228). A new password equal to the current (or temporary) one is rejected. Rate limited per session user.
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
        /**
         * List environments (RF-01), with their occupancy (RN-20, TAR-237)
         * @description Each environment says who occupies it today (a contract in force or a stay of a temporary guest), who comes next (a contract or a stay that starts later: A2 shows «Libre hasta …») and, when it is free, since when. With `freeFrom` and `freeTo` the list keeps only the environments free for the whole range, to choose one for a stay (A3.5) or a contract (A4.1); `freeTo` absent means open-ended (a contract without end date).
         */
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
    "/admin/environments/{id}/account-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Payment status by period of the environment's current contract, admin view (RF-06, D-66)
         * @description Every period of the environment's current contract (status `ACTIVE`, RN-07), classified as in `getGuestAccountStatus` (paid, pending review, unpaid or overdue by payment day plus grace days, RN-10), in the same order. An environment without a current contract (none, expired or terminated) answers an empty list. Works for active and inactive environments.
         */
        get: operations["getEnvironmentAccountStatus"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/administrators": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * List the administrators, active and inactive (RF-22, TAR-127)
         * @description Every ADMIN account, active and inactive, ordered by `createdAt` (oldest first). Not paginated: the configurable maximum of administrators (5) counts only the active ones, so the list can hold more accounts than that maximum when some are inactive, but it stays small. The document number comes masked and `self` marks the account of the session. Never cacheable (`Cache-Control: no-store`).
         */
        get: operations["listAdministrators"];
        put?: never;
        /**
         * An administrator creates another administrator (RF-22, CU-30)
         * @description Creates an active ADMIN account with an unusable random password and emails the new administrator a single-use link that expires in 30 minutes to set their own password (the same flow as the first administrator, RF-16, SEG-05). No password, code or link is ever returned. The creator re-authenticates with `currentPassword`. Administrators are equals, without hierarchy (SRS 03). At most 5 active administrators may exist (configurable); inactive administrators do not count toward that maximum. Every other active administrator is notified by email. If the email cannot be sent the account still exists, `emailSent` is false and the new administrator can use "forgot password" later. Administrators are listed with `listAdministrators` and deactivated or reactivated with `deactivateAdministrator` and `reactivateAdministrator` (TAR-127).
         */
        post: operations["createAdministrator"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/administrators/{id}/deactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Deactivate an administrator (RF-22, TAR-127)
         * @description Deactivates another ADMIN account, effective immediately: its session stops being valid from its next request on and it cannot log in until it is reactivated. Its history is kept. The caller re-authenticates with `currentPassword`, checked before anything else. An administrator cannot deactivate their own account (`ADMIN_SELF_DEACTIVATION`) and the last active administrator cannot be deactivated (`LAST_ACTIVE_ADMIN`): the system always keeps at least one active ADMIN. Deactivating an inactive administrator is idempotent: 204 and nothing changes. When the account changes, every other active administrator is notified by email (best-effort). Its own rate limit: 3 requests per minute per session user.
         */
        post: operations["deactivateAdministrator"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/administrators/{id}/reactivate": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Reactivate a previously deactivated administrator (RF-22, TAR-127)
         * @description Reactivates an inactive ADMIN account, effective immediately: it can log in again. The caller re-authenticates with `currentPassword`, checked before anything else. Reactivating an active administrator is idempotent: 204 and nothing changes. Inactive administrators do not count toward the configurable maximum of administrators (5); reactivating one when that maximum of active administrators is already reached answers 409 `ADMIN_LIMIT_REACHED` and nothing changes. When the account changes, every other active administrator is notified by email (best-effort). Its own rate limit: 3 requests per minute per session user.
         */
        post: operations["reactivateAdministrator"];
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
        /** Correct the document (only while pending activation, RN-36). The stays are managed through `/admin/guests/{id}/stays` (RN-17). The personal and contact data belong to the guest alone and are edited through the guest's own endpoints. */
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
    "/admin/guests/{id}/stays": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Stay history of a temporary guest, newest first (RN-13, CU-06, CU-31)
         * @description Every visit keeps its dates and agreed amount; a new stay is a new row of the same guest, never a new guest (RN-13, RN-18).
         */
        get: operations["listGuestStays"];
        put?: never;
        /**
         * Register a stay of a temporary guest (RN-13, RN-17, CU-31)
         * @description Only for an active temporary guest. The dates may not overlap another stay of the same guest; a stay in the future may be registered while the previous one is still running.
         */
        post: operations["createGuestStay"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/stays/{stayId}": {
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
        /** Correct the environment, the dates or the agreed amount of a stay (RN-17, CU-31, TAR-237) */
        patch: operations["updateGuestStay"];
        trace?: never;
    };
    "/admin/guests/{id}/account-email": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Set or change the one email of a guest, the one password recovery writes to (RF-16, TAR-349)
         * @description The guest has one email, the one of its account, which `requestPasswordReset` writes to (TAR-349). The administrator sets it when the guest has none or changes it, without a verification code. Pending password-reset codes of the account stop working, and if the account had another email a notice is sent to it, best-effort. The guest must not be inactive.
         */
        put: operations["setGuestAccountEmail"];
        post?: never;
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
         * @description Only the administrator sees these files. Each `url` is a signed R2 link that expires 15 minutes after the response; ask again for a new one. A document is never deleted or replaced, except on an ARCO request of the holder or an upload error (RN-37), only by an administrator and with evidence (`deleteGuestDocument`, `replaceGuestDocument`, `listGuestDocumentActions`).
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
    "/admin/guests/{id}/documents/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Replace a document of the guest on an ARCO request or an upload error, with evidence (RN-37)
         * @description Only for an ARCO request of the holder or an upload error (RN-37). The fields `reason`, `requestedAt`, `requestChannel` and `note` follow the rules of `DocumentActionRequest`; an empty multipart field (`requestedAt=""`, `requestChannel=""`, `note=""` or whitespace only) counts as absent. A file over 5 MB is a 400 `DOCUMENT_INVALID_FILE`, never a 413. Order and atomicity: (1) the new object is uploaded to the storage; if that fails the answer is 503 `FILE_STORAGE_UNAVAILABLE` and nothing changes. (2) In a single transaction the document row is swapped for the new one (new `id`) and the evidence entry (`REPLACE`) is inserted; if the transaction fails the new object is deleted and nothing changes. (3) After the commit the old object is deleted, with a persistent retry; no row references it any more, so no new signed URL is issued for it. A signed URL already handed out for the old object (`listGuestDocuments`) may keep opening it until it expires (at most 15 minutes) or until the old object is deleted, whichever comes first. Concurrency: of two actions on the same `documentId` (replace or delete) only one wins; the row is taken by `(guest_id, id)` with a row lock or a conditional delete, and the loser gets 404 `RESOURCE_NOT_FOUND`. Never cacheable (`Cache-Control: no-store`). Rate limited per session user, checked before the file is read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
        put: operations["replaceGuestDocument"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/documents/{documentId}/deletion": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Delete a document of the guest on an ARCO request or an upload error, with evidence (RN-37)
         * @description Only for an ARCO request of the holder or an upload error (RN-37). A `POST` with a JSON body instead of a `DELETE` with a body, because proxies and rewrites may drop the body of a `DELETE`. It deletes personal data irreversibly and a `POST` can be sent cross-site without a preflight, so it is under the same `Origin`/`Sec-Fetch-Site` check as the multipart routes (ADR-006, 403), and it only accepts `Content-Type: application/json` (anything else is a 415). Order and atomicity: (1) the object is deleted from the storage; if that fails the answer is 503 `FILE_STORAGE_UNAVAILABLE`, nothing is deleted and no evidence is written. An object that is already missing counts as deleted, so a retry never gets stuck in 503. (2) If it succeeds, in a single transaction the document row is deleted and the evidence entry (`DELETE`) is inserted; if that transaction fails the answer is 500 and the row stays, so the administrator repeats the action and it completes (idempotent: step 1 finds the object missing and goes on to step 2). Concurrency: of two actions on the same `documentId` (delete or replace) only one wins; the row is taken by `(guest_id, id)` with a row lock or a conditional delete. A deletion of a document that is already deleted (another deletion won at the same time, or the document was deleted before) is answered 204 as well: the document is gone, and the evidence keeps only the first deletion (who asked, when and why); the repeated one writes nothing. A deletion that loses to a replacement gets 404 `RESOURCE_NOT_FOUND`, as does a document that never belonged to that guest. Never cacheable (`Cache-Control: no-store`).
         */
        post: operations["deleteGuestDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/document-actions": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Evidence of the deletions and replacements of the guest's documents, newest first (RN-37)
         * @description Who deleted or replaced which document, when and why. Never carries the file name, the storage key or the content.
         */
        get: operations["listGuestDocumentActions"];
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
        /** A guest's payment history, admin view (RF-10) — newest first, without the voucher URL (ask `getPayment` for it) */
        get: operations["listGuestPaymentsByAdmin"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/account-status": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * A guest's payment status by period, admin view (RF-06) — the same classification the guest sees in `getGuestAccountStatus`
         * @description Every period of the guest's contracts, current or past, classified as in `getGuestAccountStatus` (paid, pending review, unpaid or overdue by payment day plus grace days, RN-10), in the same order. A guest without contracts, such as a temporary guest, answers an empty list. Works for active and inactive guests.
         */
        get: operations["getGuestAccountStatusByAdmin"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/guests/{id}/payable-periods": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * What the guest can pay or has pending, for a direct payment (A5.1, CU-14, CU-28, RN-27, RN-38)
         * @description For a guest with a contract, every period its contracts charge up to the current month (RN-27) that is not paid; for a temporary guest, every stay without an approved payment. Each one says its state, what is due after the credit applied (RN-38) and, when a payment already exists (pending or rejected), its id: that one is completed in `correctPaymentByAdmin`, not with a new direct payment. Works for active and inactive guests (CU-28). Oldest first.
         */
        get: operations["listPayablePeriods"];
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
        /**
         * List contracts with validity status (RF-09, CU-07)
         * @description Newest first. The list carries no `fileUrl` (a signed URL per row would sign N files); ask `getContract` for the file of one contract. `status` is derived from the dates at the time of the request (America/Lima), so EXPIRED needs no job (RN-07). With `expiringSoon=true` only the ACTIVE contracts with 30 days or fewer to their end date come, ordered by end date, soonest first: A4 «Lo que toca ahora» (how many, whose and when) and its «Por vencer» filter take them from here, so the notice is right whatever page the list is on (D-27).
         */
        get: operations["listContracts"];
        put?: never;
        /**
         * Upload contract (RF-03, CU-03)
         * @description Rate limited per session user, checked before the file is read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
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
        /**
         * Manually terminate contract (RN-25, CU-12) — the debt does not block it, and the guest keeps owing the periods until they are paid
         * @description Idempotent — a contract that is already terminated or expired answers 204 and stays as it is
         */
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
        /**
         * Administrator home summary (HU-A04, CU-04)
         * @description One state per active contract (its period of the current month, America/Lima, RN-10) and per temporary guest whose stay covers today: `PAID` counts as up to date, `UNDER_REVIEW` as under review, `UNPAID` not yet overdue as pending and `OVERDUE` as overdue (RN-06). The vouchers awaiting review come oldest first, at most 20, as rows of the review queue (A5): who the guest is and its environment, without the amount; `pendingVouchersTotal` gives how many there are. `charges` are the rows of «Cobros del mes» (one per active contract and per stay in force today) and the other blocks feed «Lo que toca ahora» and «También pendiente» (A1, decided 2026-11-01): overdue charges, payments rejected and not yet corrected, refunds to register (RN-38, RN-39), contracts expiring in 30 days or less (RN-07) and guests that have not activated their account (RN-32).
         */
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
        /**
         * Income vs. expenses balance for a month (RF-18, CU-08)
         * @description Income is the sum of the approved payments attributed to the month, by their verified amounts (RN-16), plus the fines of the month (RF-19), minus the refunds dated in the month (RN-39, TAR-240); expenses are the expenses of the month (RF-07); `net` is income minus expenses. Each part carries how many movements it adds up, for the A6 breakdown. A contract payment belongs to its period; a stay payment belongs to the month the stay starts (D-68). Pending, rejected or cancelled payments do not count. Guests and environments count whether active or inactive. A month without movements answers zeros. Amounts in soles with two decimals.
         */
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
        /**
         * Payment review queue (RF-05, CU-05) — oldest first, so the review is first in, first out
         * @description Each row carries the guest, the environment (or the temporary mark), the period or the stay dates, the last submission date and a summary of the proofs (how many vouchers, whether there is cash), and no amount: the administrator compares the declared amounts with the proofs in `getPayment` before resolving (RN-16, A5). The queue is ordered by `submittedAt`, the last time the payment was sent: a rejected payment that the guest corrects and sends again enters the queue with its new date (TAR-239).
         */
        get: operations["listPayments"];
        put?: never;
        /**
         * Register a direct payment received by the administration (RN-23, CU-14, A5.1) — one or more proofs, vouchers or cash without a voucher (RN-22), approved at once with the amounts given as verified
         * @description Only for a period or a stay that has no payment yet (TAR-239): one that is pending or rejected is completed in `correctPaymentByAdmin` (A5.2). The proofs must cover what is due (the monthly amount or the agreed amount, minus the credit applied, RN-38); a short payment is not registered (400 `VALIDATION_ERROR` with `field: proofs`). What is left over becomes credit for the next period, or a refund to register in Finanzas when it is the last period of a contract or a stay (RN-38, RN-39). Every proof is recorded as added by the administration. A guest that is not active can only pay periods it owes (CU-28, RN-27, RN-35). Rate limited per session user, checked before the files are read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
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
        /**
         * Payment detail with its proofs to review (A5.2, RN-16, RN-22)
         * @description Carries what is being paid (guest, environment, period or stay dates, the amount due after the credit applied, and whether it is the last period, which decides between credit and refund for what is left over, RN-38) and every proof with its declared and verified amounts and who added it. Each voucher's URL is signed when this is requested, expires in 15 minutes and forces the download; a cash proof has no file.
         */
        get: operations["getPayment"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /**
         * Approve or reject a pending or rejected payment, with the verified amount of each proof (RF-05, CU-05, RN-16)
         * @description Resolves a PENDING payment, or a REJECTED one that the administrator corrected (`correctPaymentByAdmin`) and decides on at once, without sending it back to the queue (decided 2026-10-31, TAR-239). To approve, send the verified amount of every proof: what is approved is their sum, which must cover what is due (the monthly amount or the agreed amount minus the credit applied); a short payment is rejected with a reason (RN-16). What is left over becomes credit or a refund to register (RN-38, RN-39). Rejecting keeps the proofs: the guest or the administrator adds or corrects them and the payment is sent again (RN-05). The reviewer is recorded and shown in the administrator's views (TAR-230).
         */
        patch: operations["resolvePayment"];
        trace?: never;
    };
    "/admin/payments/{id}/proofs": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        /**
         * Add or correct the proofs of a pending or rejected payment (A5.2, RN-05, RN-15, RN-22)
         * @description Replaces the payment's set of proofs: every proof listed with its `id` is kept (its amount or method can change, and a new file replaces its voucher), every proof without `id` is added by the administration (a voucher of reference or cash), and every existing proof not listed is removed. The status does not change: a rejected payment stays REJECTED until `resolvePayment` approves or rejects it again (decided 2026-10-31, TAR-239). An approved payment cannot be corrected. Rate limited per session user, checked before the files are read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
        put: operations["correctPaymentByAdmin"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
        /**
         * List monthly fines (RF-19)
         * @description Fines of the month, of any guest, active or inactive. The list is a plain array with no pagination: a month has few fines (RF-19).
         */
        get: operations["listFines"];
        put?: never;
        /**
         * Register fine as income against a guest (RF-19, RN-30)
         * @description A fine is direct income of its month (RN-30): it takes no voucher and no approval, and it counts in the monthly balance as soon as it is created. It accepts any existing guest, active or inactive (a fine can be charged after the guest left). A fine is not edited: to change it, delete it and create it again (RN-24).
         */
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
        /**
         * Delete fine — no audit restriction (RN-24)
         * @description Deletes the fine for good (RN-24): it leaves the monthly balance at once. There is no edit operation; to correct a fine, delete it and create it again (RF-19, RN-30).
         */
        delete: operations["deleteFine"];
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/refunds": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Refunds of a month (RF-24, A6 «Devoluciones»)
         * @description The refunds Quipu made to guests whose date falls in the month: each one counts in the month of its date and is subtracted from that month's income (RN-39, RF-18). Newest first.
         */
        get: operations["listRefunds"];
        put?: never;
        /**
         * Register a refund of Quipu to a guest (RF-24, RN-39, A6.5)
         * @description Returns part or all of a guest's pending credit (RN-38): a partial refund is allowed and the rest stays pending. The amount cannot exceed the pending credit, also when two refunds are registered at the same time (the second one answers 400 with `field: amount`). In the MVP a refund is not edited nor deleted (decided 2026-10-29). Who and when are recorded; no personal data goes to the logs.
         */
        post: operations["createRefund"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/admin/credits": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Guests with credit to refund (RN-38, A6 and A1 notices)
         * @description Credit that has no period left to be used in: the contract ended or is in its last period, or it came from a stay of a temporary guest. Oldest first, so A6.5 offers the oldest one. Not paginated: there are few at a time.
         */
        get: operations["listPendingCredits"];
        put?: never;
        post?: never;
        delete?: never;
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
    "/guest/credit": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Own credit — what is left over to use or to be refunded (RN-38, RN-39, H1)
         * @description The credit the guest has now and whether Quipu will refund it (no period left where to use it: the contract ended or this is its last period), plus the last refund made. The guest cannot ask for a refund while a period remains where to use the credit (decided 2026-11-01). H1 reads it instead of the payment history.
         */
        get: operations["getOwnCredit"];
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
        /**
         * Own contracts, regardless of status — shown read-only even when EXPIRED or TERMINATED (CU-18, RN-26). A guest never loses visibility of their own contract; only the ability to act on it changes with status (e.g. voucher upload requires ACTIVE, see /guest/payments).
         * @description `current` is the contract in force today, or the one that starts first if none is running yet (RN-07), or the latest one if all ended. `next` is a renewal already loaded that starts after `current` ends (RN-20); H2 shows it below as «Tu próximo contrato» (decided 2026-10-31, TAR-237).
         */
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
        /**
         * Own payment history (RF-10, CU-19, H4) — own record only (RN-09), newest first, without voucher URLs
         * @description Each payment with its proofs (kind, method, declared and verified amount, who added it), what happened to it (sent, rejected with its reason, approved), what was left over and the credit it used (RN-38); the refunds Quipu made to the guest come as items of their own, by date (RN-39, label Devuelto). `creditBalance` is the credit the guest has right now. Who reviewed a payment is not shown to the guest (TAR-230).
         */
        get: operations["listOwnPayments"];
        put?: never;
        /**
         * Send the payment of a month with one or more proofs (RF-04, CU-17, H3, RN-22)
         * @description A payment gathers from 1 to 5 proofs: vouchers (a file each) and cash without a voucher (RN-22). It is created PENDING. Rate limited per session user, checked before the files are read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
        post: operations["uploadPaymentVoucher"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/payments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /** One own payment with its proofs (H3 read-only «Tu pago» and correction, RN-15) — without voucher URLs */
        get: operations["getOwnPayment"];
        /**
         * Correct a rejected payment and send it again (H3 «Enviar de nuevo», RN-05)
         * @description Replaces the payment's set of proofs as `correctPaymentByAdmin` does (listed with `id`: kept, with its amount, method or file changed; without `id`: added; not listed: removed) and sends it again: the payment goes back to PENDING with a new `submittedAt`. Only a REJECTED payment can be corrected; a pending one is read-only (RN-15). Rate limited per session user, checked before the files are read.
         */
        put: operations["correctOwnPayment"];
        post?: never;
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
        /**
         * Own personal and contact data, the email and the uploaded documents (H5, RN-17)
         * @description What H5 «Mis datos» shows before editing: the document, the name and contact data the guest keeps (RN-17), its one email, where the password recovery link goes, with the new one waiting for its code if any (TAR-349), and the documents uploaded during the onboarding or later (RN-37, `uploadOwnDocument`), without links: each one opens with `getOwnDocument` (TAR-241). Never cacheable.
         */
        get: operations["getOwnProfile"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Edit own personal and contact data (CU-20, RN-17) */
        patch: operations["updateOwnProfile"];
        trace?: never;
    };
    "/guest/email-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a code to a new email of the guest (TAR-349)
         * @description For an active contract guest (H5); a guest still onboarding uses `requestOnboardingEmailVerification`. The code (6 digits) goes to the new email and lives 10 minutes; the current email stays until the code is confirmed. A new request replaces the pending one and its code, and waits 60 seconds since the last code was sent. Never cacheable.
         */
        post: operations["requestOwnEmailVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/email-verification/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm the code and make the pending email the guest's email (TAR-349)
         * @description With the right code the pending email becomes the one email of the guest (the account email, where the password recovery goes): a pending password-reset code stops working, the sessions stay open, and the previous email, if any, receives a notice, best-effort. 5 wrong codes end the pending request.
         */
        post: operations["confirmOwnEmailVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload one more own document from «Mis datos» after the onboarding (RN-37, TAR-242)
         * @description Same rules as the onboarding upload (`uploadOnboardingDocument`): one file per call, JPG, PNG or PDF of up to 5 MB checked by real content (SEC-07, RF-15), and at most 5 files per guest counting the ones of the onboarding (RN-37). Only for a guest whose onboarding is complete (RN-33); before that the guest uses the onboarding step. The guest can neither delete nor replace a file: an administrator does it on an ARCO request or an upload error, with evidence (`deleteGuestDocument`, `replaceGuestDocument`). Under the `Origin`/`Sec-Fetch-Site` check of the multipart routes (ADR-006). Rate limited per session user, checked before the file is read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
        post: operations["uploadOwnDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/documents/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Open one own document with a short-lived signed link (RN-37, TAR-241)
         * @description For «Ver documento» in «Mis datos». The document is looked up by `(guest_id of the session, documentId)`: a document of another guest, a deleted one or one that never existed answer the same 404 `RESOURCE_NOT_FOUND`, so the response never reveals whether another guest's document exists. `url` is a signed R2 link that expires 15 minutes after the response and is never stored; ask again for a new one. Never cacheable.
         */
        get: operations["getOwnDocument"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
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
         * @description Requires the password step to be done (RN-33). Only while the guest is in onboarding; afterwards the data is edited through the profile endpoint. The email is not part of this step: it changes only by verifying the new one (`requestOnboardingEmailVerification`, TAR-349).
         */
        put: operations["savePersonalData"];
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/onboarding/email-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a code to a new email of the guest (TAR-349)
         * @description During the onboarding (O1), for a guest of either type. The code (6 digits) goes to the new email and lives 10 minutes; the current email stays until the code is confirmed. A new request replaces the pending one and its code, and waits 60 seconds since the last code was sent. Never cacheable.
         */
        post: operations["requestOnboardingEmailVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/guest/onboarding/email-verification/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm the code and make the pending email the guest's email (TAR-349)
         * @description With the right code the pending email becomes the one email of the guest (the account email, where the password recovery goes): a pending password-reset code stops working, the sessions stay open, and the previous email, if any, receives a notice, best-effort. 5 wrong codes end the pending request.
         */
        post: operations["confirmOnboardingEmailVerification"];
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
         * @description One file per call; repeat for more. At most 5 files per guest, each JPG, PNG or PDF of up to 5 MB, checked by real content (SEC-07). The guest opens their own files later from «Mis datos» with a short-lived signed link (`getOwnDocument`, TAR-241), never another guest's. The guest can neither delete nor replace a file. The only exception is an ARCO request of the holder or an upload error (RN-37): an administrator deletes or replaces the file (`POST /admin/guests/{id}/documents/{documentId}/deletion` and `PUT /admin/guests/{id}/documents/{documentId}`), and each action leaves an evidence entry with who and when (`GET /admin/guests/{id}/document-actions`). Rate limited per session user, checked before the file is read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
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
        /**
         * Payment status of the stay in force (CU-21)
         * @description The stay in force today, otherwise the next one, otherwise the last one (the same rule as the stay fields of the guest detail).
         */
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
        /**
         * Send the single payment of a stay with one or more proofs (RF-04, CU-22, T2) — a stay has one payment (RN-03), which gathers from 1 to 5 proofs, vouchers or cash (RN-22). The guest keeps its record across visits and each visit is a stay (RN-13, RN-18, `POST /admin/guests/{id}/stays`). The guest does not choose the stay: the payment belongs to the stay in force today, otherwise to the next one that has no payment.
         * @description Rate limited per session user, checked before the files are read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
        post: operations["uploadTemporaryVoucher"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/payments/{id}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * The payment of a stay with its proofs (T2 read-only «Tu pago» and correction, RN-15) — without voucher URLs
         * @description The id comes from `paymentId` in `getTemporaryGuestPaymentStatus`; the temporary guest has no history (H4) yet.
         */
        get: operations["getOwnPaymentTemporary"];
        /**
         * Correct the rejected payment of a stay and send it again (T2 «Enviar de nuevo», RN-05)
         * @description Same rules as `correctOwnPayment`.
         */
        put: operations["correctOwnPaymentTemporary"];
        post?: never;
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
        /**
         * Own personal and contact data, the email and the uploaded documents (T3, RN-17)
         * @description What T3 «Mis datos» shows before editing: the document, the name and contact data the guest keeps (RN-17), its one email, where the password recovery link goes, with the new one waiting for its code if any (TAR-349), and the documents uploaded during the onboarding or later (RN-37, `uploadTemporaryOwnDocument`), without links: each one opens with `getTemporaryOwnDocument` (TAR-241). Never cacheable.
         */
        get: operations["getOwnProfileTemporary"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        /** Edit own personal and contact data (CU-23, RN-17) */
        patch: operations["updateOwnProfileTemporary"];
        trace?: never;
    };
    "/temporary-guest/email-verification": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Send a code to a new email of the guest (TAR-349)
         * @description For an active temporary guest (T3); a guest still onboarding uses `requestOnboardingEmailVerification`. The code (6 digits) goes to the new email and lives 10 minutes; the current email stays until the code is confirmed. A new request replaces the pending one and its code, and waits 60 seconds since the last code was sent. Never cacheable.
         */
        post: operations["requestOwnTemporaryEmailVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/email-verification/confirm": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Confirm the code and make the pending email the guest's email (TAR-349)
         * @description With the right code the pending email becomes the one email of the guest (the account email, where the password recovery goes): a pending password-reset code stops working, the sessions stay open, and the previous email, if any, receives a notice, best-effort. 5 wrong codes end the pending request.
         */
        post: operations["confirmOwnTemporaryEmailVerification"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/documents": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        get?: never;
        put?: never;
        /**
         * Upload one more own document from «Mis datos» after the onboarding (RN-37, TAR-242)
         * @description Same rules as the onboarding upload (`uploadOnboardingDocument`): one file per call, JPG, PNG or PDF of up to 5 MB checked by real content (SEC-07, RF-15), and at most 5 files per guest counting the ones of the onboarding (RN-37). Only for a guest whose onboarding is complete (RN-33); before that the guest uses the onboarding step. The guest can neither delete nor replace a file: an administrator does it on an ARCO request or an upload error, with evidence (`deleteGuestDocument`, `replaceGuestDocument`). Under the `Origin`/`Sec-Fetch-Site` check of the multipart routes (ADR-006). Rate limited per session user, checked before the file is read: over the limit the answer is 429 `RATE_LIMITED` with a `Retry-After` header.
         */
        post: operations["uploadTemporaryOwnDocument"];
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
    "/temporary-guest/documents/{documentId}": {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        /**
         * Open one own document with a short-lived signed link (RN-37, TAR-241)
         * @description For «Ver documento» in «Mis datos». The document is looked up by `(guest_id of the session, documentId)`: a document of another guest, a deleted one or one that never existed answer the same 404 `RESOURCE_NOT_FOUND`, so the response never reveals whether another guest's document exists. `url` is a signed R2 link that expires 15 minutes after the response and is never stored; ask again for a new one. Never cacheable.
         */
        get: operations["getTemporaryOwnDocument"];
        put?: never;
        post?: never;
        delete?: never;
        options?: never;
        head?: never;
        patch?: never;
        trace?: never;
    };
}
export type webhooks = Record<string, never>;
export interface components {
    schemas: {
        /**
         * Format: uuid
         * @description Random process epoch; changes on restart or before safe-counter exhaustion. Not a session id, database version or durable cursor.
         */
        ChangeEpoch: string;
        /** @description JavaScript-safe process-wide publication counter. Each recipient sees a monotonic subsequence within an epoch; gaps are allowed. Never order HTTP responses or infer lost events from it. No disconnected-user map or replay is required. */
        ChangeVersion: number;
        /**
         * @example {
         *       "epoch": "f18a40da-6ddf-4ab4-a75b-f4ad8de2d615",
         *       "version": 0
         *     }
         */
        ChangeReady: {
            epoch: components["schemas"]["ChangeEpoch"];
            version: components["schemas"]["ChangeVersion"];
        };
        /** @description ADR-SSE-01 administrative groups. admin.guest:<id> groups visible guest detail, history, account-status, payable-periods and stays. admin.contracts groups contract lists/details. admin.environments includes availability filtered by freeFrom/freeTo. admin.environment:<id> groups detail/account-status, the latter only if mounted (no current frontend consumer). No entity data in keys; permission still applies. */
        AdminChangeKey: ("admin.dashboard" | "admin.payments.queue" | "admin.guests" | "admin.contracts" | "admin.environments" | "admin.finance" | "admin.credits" | "admin.refunds") | string;
        /**
         * @example {
         *       "epoch": "f18a40da-6ddf-4ab4-a75b-f4ad8de2d615",
         *       "version": 2,
         *       "invalidate": [
         *         "admin.dashboard",
         *         "admin.payments.queue"
         *       ]
         *     }
         */
        AdminChange: {
            epoch: components["schemas"]["ChangeEpoch"];
            version: components["schemas"]["ChangeVersion"];
            /** @description Distinct resource keys or literal ALL, never an array containing ALL. Over 64 keys or 8192 UTF-8 frame bytes collapses to ALL. Reload mounted authorized resources only; preserve dirty forms/files. */
            invalidate: "ALL" | components["schemas"]["AdminChangeKey"][];
        };
        /** @description ADR-SSE-01 own groups. guest.home groups account-status and credit; guest.payments is paginated history; guest.contract is /guest/contract (singular); guest.stay is /temporary-guest/payment-status. guest.payment:<id> is the own payment detail for either guest type. guest.profile is /guest/profile or /temporary-guest/profile according to the authenticated guest type, including document metadata. Preserve dirty contact fields and selected files; signal stale data and reload only on explicit choice. It does not imply a notification or file transfer. */
        GuestChangeKey: ("guest.home" | "guest.payments" | "guest.contract" | "guest.stay" | "guest.profile") | string;
        /**
         * @example {
         *       "epoch": "f18a40da-6ddf-4ab4-a75b-f4ad8de2d615",
         *       "version": 2,
         *       "invalidate": [
         *         "guest.home",
         *         "guest.payments"
         *       ]
         *     }
         */
        GuestChange: {
            epoch: components["schemas"]["ChangeEpoch"];
            version: components["schemas"]["ChangeVersion"];
            /** @description Distinct resource keys or literal ALL, never an array containing ALL. Over 64 keys or 8192 UTF-8 frame bytes collapses to ALL. Reload mounted authorized resources only; preserve dirty forms/files. */
            invalidate: "ALL" | components["schemas"]["GuestChangeKey"][];
        };
        /**
         * @example {
         *       "reason": "access-token-expired"
         *     }
         */
        ChangeClosing: {
            /**
             * @description Expiry/session-updated requires session check/renewal before reopening; revoked ends the session. Other reasons may retry with backoff. Absence of closing does not identify a disconnect's cause.
             * @enum {string}
             */
            reason: "access-token-expired" | "session-updated" | "session-revoked" | "max-duration" | "server-shutdown";
        };
        /**
         * @example {
         *       "code": "AUTH_CSRF_INVALID",
         *       "message": "No se pudo validar la solicitud. Actualiza la página e inténtalo nuevamente."
         *     }
         */
        CsrfError: {
            /** @enum {string} */
            code: "AUTH_CSRF_INVALID";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        PagedEnvironments: {
            content: components["schemas"]["Environment"][];
            nextCursor: components["schemas"]["NextCursor"];
            /** @description Active environments free today and with nothing coming, across all pages (the A2 notice) */
            freeCount: number;
        };
        PagedGuests: {
            content: components["schemas"]["GuestSummary"][];
            nextCursor: components["schemas"]["NextCursor"];
            /** @description Guests pending activation across all pages, whatever the filters (the A3 notice «Lo que toca ahora», RN-33) */
            pendingActivationCount: number;
            /** @description Guests in onboarding across all pages, whatever the filters (the A3 notice, RN-36) */
            onboardingCount: number;
        };
        PagedExpenses: {
            content: components["schemas"]["Expense"][];
            nextCursor: components["schemas"]["NextCursor"];
            /** @description Expenses of the month, for «Mostrando X de Y» (A6, TAR-240) */
            totalCount: number;
        };
        /** @description Value for `after` to get the next page; `null` when this is the last one */
        NextCursor: string | null;
        /** @description BFF error shape — plain JSON, distinct from RFC 7807 (that is exclusive to the internal Core API, see SRS chapter "10 - APIs e Integraciones"). `code` is a stable English constant read by the frontend; `message` is the Spanish text shown to the end user. */
        Error: {
            /** @description Stable error code, e.g. VOUCHER_ALREADY_EXISTS */
            code: string;
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** @description Field name if this is a validation error */
            field?: string;
        };
        /** @description Optimistic-locking conflict (BE-SPR-DAT-13). The `code` is always `CONCURRENT_MODIFICATION` */
        ConcurrentModificationError: {
            /** @enum {string} */
            code: "CONCURRENT_MODIFICATION";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The environment is inactive and takes no new contract (RF-01). The `code` is always `ENVIRONMENT_INACTIVE` */
        EnvironmentInactiveError: {
            /** @enum {string} */
            code: "ENVIRONMENT_INACTIVE";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The environment is occupied in those dates by a contract in force or a stay, now or later (RN-12, RN-20, TAR-237). `occupant` says by whom, for the dialog and its link. The `code` is always `ENVIRONMENT_OCCUPIED` */
        EnvironmentOccupiedError: {
            /** @enum {string} */
            code: "ENVIRONMENT_OCCUPIED";
            occupant?: components["schemas"]["Occupant"];
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The guest is inactive (RN-12, RN-18). The `guestId` lets the administrator reactivate it */
        GuestInactiveError: {
            /** @enum {string} */
            code: "GUEST_INACTIVE";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** Format: uuid */
            guestId: string;
        };
        /** @description A step was attempted out of order, or the onboarding is already complete (RN-33) */
        OnboardingConflictError: {
            /** @enum {string} */
            code: "ONBOARDING_STEP_OUT_OF_ORDER" | "ONBOARDING_ALREADY_COMPLETED";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The guest is not active, so it cannot take a new contract or payment (RN-35) */
        GuestNotActiveError: {
            /** @enum {string} */
            code: "GUEST_NOT_ACTIVE";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** Format: uuid */
            guestId: string;
        };
        /** @description The document already belongs to another guest or to an administrator account (RN-18, D-34e) */
        GuestDocumentTakenError: {
            /** @enum {string} */
            code: "GUEST_DOCUMENT_TAKEN";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            field: string;
        };
        /** @description The email is already the email of another account, administrator or guest; a guest has one email, the one of its account (TAR-349) */
        AccountEmailTakenError: {
            /** @enum {string} */
            code: "ACCOUNT_EMAIL_TAKEN";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** @enum {string} */
            field: "email";
        };
        /** @description A refused email verification (TAR-349); `field` is the input to mark */
        EmailVerificationError: {
            /** @enum {string} */
            code: "EMAIL_UNCHANGED" | "EMAIL_VERIFICATION_INVALID" | "EMAIL_VERIFICATION_EXPIRED";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** @enum {string} */
            field: "email" | "code";
        };
        /** @description Another code was asked for before 60 seconds since the last one (TAR-349) */
        EmailVerificationCooldownError: {
            /** @enum {string} */
            code: "EMAIL_VERIFICATION_COOLDOWN";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** @enum {string} */
            field: "email";
            /** @description The same value as Retry-After, readable without exposing the header across origins */
            retryAfterSeconds: number;
        };
        /** @description The new email of the guest; a code is sent there (TAR-349) */
        EmailVerificationInput: {
            /** Format: email */
            email: string;
        };
        /** @description The six digits sent to the new email (TAR-349) */
        EmailVerificationConfirmation: {
            code: string;
        };
        /** @description The guest has a contract in force, so it cannot be deactivated (RN-12). Debt does not block it */
        GuestHasActiveContractError: {
            /** @enum {string} */
            code: "GUEST_HAS_ACTIVE_CONTRACT";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /**
             * Format: uuid
             * @description The contract in force, so the UI can link to it
             */
            contractId: string;
        };
        /** @description The guest owes periods (RN-25), so it cannot take a new contract or be reactivated until they are paid (RN-35) */
        GuestHasPendingDebtError: {
            /** @enum {string} */
            code: "GUEST_HAS_PENDING_DEBT";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
            /** @description The periods owed, oldest first, so the UI can list them and offer the direct payment (RN-23) */
            periods: string[];
            /** @description Everything owed with its amount, oldest first, including the unpaid stays of a temporary guest (TAR-237) */
            debts?: {
                period: string | null;
                /** Format: uuid */
                stayId: string | null;
                /** Format: date */
                stayStartDate: string | null;
                /** Format: date */
                stayEndDate: string | null;
                amountDue: number;
            }[];
        };
        /** @description One visit of a temporary guest (RN-13); the stay of a guest is never edited into a new one, a new visit is a new row. It occupies its environment during its dates like a contract (RN-20, TAR-237); stays registered before carry no environment */
        Stay: {
            /** Format: uuid */
            id: string;
            /**
             * Format: uuid
             * @description null for a stay registered before TAR-237 («Sin ambiente»)
             */
            environmentId: string | null;
            environmentCode: string | null;
            /** Format: date */
            startDate: string;
            /**
             * Format: date
             * @description On or after startDate
             */
            endDate: string;
            /** @description In soles, greater than 0, at most two decimals */
            agreedAmount: number;
            /**
             * @description As in StayPaymentStatus: OVERDUE once the exit date passed without an approved payment (A3.2)
             * @enum {string}
             */
            paymentStatus: "PAID" | "UNDER_REVIEW" | "UNPAID" | "OVERDUE";
            /**
             * Format: uuid
             * @description Its payment, if any
             */
            paymentId: string | null;
            /**
             * Format: int64
             * @description Optimistic-locking version (BE-SPR-DAT-13): A3.5 sends it back when correcting the stay; it grows with every change of the stay
             */
            readonly version: number;
        };
        StayInput: {
            /**
             * Format: uuid
             * @description An active environment free for the whole stay (RN-20, TAR-237); see listEnvironments with freeFrom and freeTo
             */
            environmentId: string;
            /** Format: date */
            startDate: string;
            /**
             * Format: date
             * @description On or after startDate
             */
            endDate: string;
            /** @description In soles, greater than 0, at most two decimals */
            agreedAmount: number;
        };
        /** @description The `version` loaded and at least one field; the resulting dates must stay valid and may not overlap another stay of the guest */
        StayUpdateInput: {
            /**
             * Format: int64
             * @description The `version` the client loaded. When the record changed since, the answer is 409 CONCURRENT_MODIFICATION and nothing is saved (BE-SPR-DAT-13)
             */
            version: number;
            /**
             * Format: uuid
             * @description Moves the stay to another free environment (RN-20)
             */
            environmentId?: string;
            /** Format: date */
            startDate?: string;
            /** Format: date */
            endDate?: string;
            /** @description Can be corrected even when the stay has a payment: the review compares with the new amount (decided 2026-10-30) */
            agreedAmount?: number;
        };
        PagedStays: {
            content: components["schemas"]["Stay"][];
            nextCursor: components["schemas"]["NextCursor"];
        };
        /** @description The dates cross another stay of the same guest. The `code` is always `STAY_OVERLAP` */
        StayOverlapError: {
            /** @enum {string} */
            code: "STAY_OVERLAP";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description Only temporary guests have stays (RN-13). The `code` is always `GUEST_NOT_TEMPORARY` */
        GuestNotTemporaryError: {
            /** @enum {string} */
            code: "GUEST_NOT_TEMPORARY";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
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
            /** @description Who occupies it today; null when free (derived from contracts and stays, RN-20) */
            occupant: components["schemas"]["Occupant"] | (never | null);
            /** @description A contract or a stay that starts after today; with occupant null, A2 shows «Libre hasta <startDate>» */
            nextOccupant: components["schemas"]["Occupant"] | (never | null);
            /**
             * Format: date
             * @description When it became free (end of the last contract or stay, or the creation of the environment); null when occupied
             */
            freeSince: string | null;
            /**
             * Format: date-time
             * @description When it was deactivated; null when active
             */
            deactivatedAt?: string | null;
            /**
             * Format: int64
             * @description Optimistic-locking version (BE-SPR-DAT-13): A2.4 sends it back in the PATCH; it grows with every change of the environment
             */
            readonly version: number;
        };
        /** @description A contract or a stay that occupies an environment (RN-20, TAR-237) */
        Occupant: {
            /** @enum {string} */
            kind: "CONTRACT" | "STAY";
            /** Format: uuid */
            guestId: string;
            guestName: string | null;
            /**
             * Format: uuid
             * @description Set when kind=CONTRACT («Ver contrato vigente»)
             */
            contractId: string | null;
            /**
             * Format: uuid
             * @description Set when kind=STAY («Ver huésped»)
             */
            stayId: string | null;
            /** Format: date */
            startDate: string;
            /**
             * Format: date
             * @description null for a contract without end date
             */
            endDate: string | null;
        };
        /** @description The environment a guest occupies, with its validity (A3 column Ambiente) */
        EnvironmentRef: {
            code: string;
            /** @enum {string} */
            type: "ROOM" | "CABIN";
            /** @enum {string} */
            kind: "CONTRACT" | "STAY";
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string | null;
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
        /** @description Data of the new administrator plus the re-authentication of the creator (RF-22, D-34c) */
        AdministratorInput: {
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /**
             * Format: email
             * @description Account email of the new administrator, where the access link goes
             */
            email: string;
            /** @description Password of the administrator who creates the account */
            currentPassword: string;
        };
        AdministratorCreated: {
            /** Format: uuid */
            id: string;
            /** @description true if the access link was sent to the new administrator (best-effort) */
            emailSent: boolean;
        };
        /** @description An administrator in the list (TAR-127) */
        AdministratorSummary: {
            /** Format: uuid */
            id: string;
            /** @description Full name the administrator wrote when activating the account (A0.5); null while it has not activated it («Sin activar» in A7) */
            name: string | null;
            documentType: components["schemas"]["DocumentType"];
            /**
             * @description Masked: only the last 3 characters are shown, every other one is replaced by `*`
             * @example *****678
             */
            documentNumber: string;
            /**
             * Format: email
             * @description Account email of the administrator
             */
            email: string;
            /** @enum {string} */
            status: "ACTIVE" | "INACTIVE";
            /** Format: date-time */
            createdAt: string;
            /** @description true for the account of the session */
            self: boolean;
        };
        /** @description Re-authentication of the administrator who deactivates or reactivates another one (TAR-127) */
        AdministratorReauthentication: {
            /** @description Password of the administrator who makes the change */
            currentPassword: string;
        };
        /** @description The deactivation is refused so that the system keeps at least one active administrator (TAR-127) */
        AdministratorDeactivationConflictError: {
            /** @enum {string} */
            code: "ADMIN_SELF_DEACTIVATION" | "LAST_ACTIVE_ADMIN";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description Minimal registration by the administrator (RN-31) */
        GuestInput: {
            documentType: components["schemas"]["DocumentType"];
            /** @description A DNI is exactly 8 digits; a CE or a passport, letters, digits or hyphen. A DNI with another shape is 400 VALIDATION_ERROR with field documentNumber (TAR-237) */
            documentNumber: string;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            /** @description Optional, to notify the guest: digits, spaces and hyphens, with an optional + prefix */
            phone?: string;
            /**
             * Format: email
             * @description Optional: the one email of the guest, the email of its account (D-77, TAR-349). If present the access (the link or the temporary password, depending on accessMode) is also sent there (RN-19)
             */
            email?: string;
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
        /** @description Optional, never blocks guest registration (RN-29). The limits are those of its columns; a longer value or a field it does not define is 400 VALIDATION_ERROR with `field` = `emergencyContact.<name>`. */
        EmergencyContact: {
            name?: string;
            relationship?: string;
            phone?: string;
        };
        /** @description What the administrator may change: the document, only while the guest is pending activation (RN-36). The stays of a temporary guest are managed through `/admin/guests/{id}/stays` (RN-13, RN-17). Personal and contact data are the guest's alone (RN-17). Always with the `version` loaded and at least one field to change. */
        GuestUpdateInput: {
            /**
             * Format: int64
             * @description The `version` the client loaded. When the record changed since, the answer is 409 CONCURRENT_MODIFICATION and nothing is saved (BE-SPR-DAT-13)
             */
            version: number;
            documentType?: components["schemas"]["DocumentType"];
            documentNumber?: string;
        };
        /** @description Personal data step of the onboarding (RN-33). The email is not here; it changes only by verifying it (TAR-349) */
        PersonalDataInput: {
            name: string;
            phone: string;
            emergencyContact?: components["schemas"]["EmergencyContact"];
        };
        /** @description The personal data as the onboarding shows them. Before the step is saved `name` and `phone` are empty and `email` is the one of the account, if any (TAR-349) */
        PersonalData: {
            name: string;
            phone: string;
            /**
             * Format: email
             * @description The one email of the guest, the email of its account; left out when it has none
             */
            email?: string;
            emergencyContact?: components["schemas"]["EmergencyContact"];
        };
        /** @description The guest's own data for «Mis datos» (H5, T3) */
        OwnProfile: {
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            name: string;
            phone: string | null;
            /**
             * Format: email
             * @description The one email of the guest, the email of its account: where the password recovery goes (RF-16). It changes by verifying the new one (TAR-349). Null when it has none
             */
            email: string | null;
            /**
             * Format: email
             * @description The new email waiting for its code, while the code can still be confirmed (TAR-349); null otherwise
             */
            pendingEmail: string | null;
            /** @description The fields of EmergencyContact, inline: an allOf with that schema would reject null (OAS 3.0.3). Null when the guest saved none (RN-29) */
            emergencyContact: {
                name?: string;
                relationship?: string;
                phone?: string;
            } | null;
            documents: components["schemas"]["GuestDocumentRef"][];
            /** @description How many documents a guest may have (5, RN-37) */
            documentsLimit: number;
        };
        /** @description The guest edits their own data; every field is optional and an absent field keeps its value (RN-17). The document, the contract, the stays and the email are not editable here: the email changes by verifying it (TAR-349). */
        ProfileUpdateInput: {
            name?: string;
            phone?: string;
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
            /** @description Environment it occupies (contract in force or stay, including a coming one), or the last one for an inactive guest; null without any (A3, TAR-237). Only in the administrator's lists */
            environment?: components["schemas"]["EnvironmentRef"] | (never | null);
            /**
             * Format: date-time
             * @description Only for a guest pending activation: when the unused access expires; in the past, A3 says «Acceso vencido» so the administrator regenerates it (A3.4). null otherwise. Only in the administrator's lists
             */
            accessExpiresAt?: string | null;
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
            /**
             * Format: int64
             * @description Optimistic-locking version (BE-SPR-DAT-13): A3.5 sends it back when correcting the document, the only edit of a pending guest (RN-36); it grows with every change of the guest
             */
            readonly version: number;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description null until the guest completes the personal data step */
            name: string | null;
            /** @enum {string} */
            type: "CONTRACT" | "TEMPORARY";
            hasLoginAccess: boolean;
            phone?: string | null;
            /** @description The one email of the guest, the email of its account: where the password recovery goes (RF-16). The guest changes it by verifying the new one (TAR-349); the administration sets it with PUT …/account-email without a code (A3.9) */
            email?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /**
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["PaymentSummary"][];
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
            /** @description The one email of the guest, the email of its account: where the password recovery goes (RF-16). The guest changes it by verifying the new one (TAR-349); the administration sets it with PUT …/account-email without a code (A3.9) */
            email?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /**
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["PaymentSummary"][];
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
            /** @description The one email of the guest, the email of its account: where the password recovery goes (RF-16). The guest changes it by verifying the new one (TAR-349); the administration sets it with PUT …/account-email without a code (A3.9) */
            email?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /**
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["PaymentSummary"][];
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
            /** @description The one email of the guest, the email of its account: where the password recovery goes (RF-16). The guest changes it by verifying the new one (TAR-349); the administration sets it with PUT …/account-email without a code (A3.9) */
            email?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /**
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["PaymentSummary"][];
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
            /** @description The one email of the guest, the email of its account: where the password recovery goes (RF-16). The guest changes it by verifying the new one (TAR-349); the administration sets it with PUT …/account-email without a code (A3.9) */
            email?: string | null;
            emergencyContact?: components["schemas"]["EmergencyContact"];
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayStartDate?: string;
            /**
             * Format: date
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            stayEndDate?: string;
            /**
             * @deprecated
             * @description Deprecated, read-only: taken from the stay in course today, else the next one, else the latest; read the stays at /admin/guests/{id}/stays. Only when type=TEMPORARY
             */
            agreedAmount?: number;
            documentCount: number;
            /**
             * Format: date-time
             * @description Expiry of the current unused access, if there is one
             */
            accessExpiresAt?: string | null;
            contract?: components["schemas"]["Contract"];
            paymentHistory: components["schemas"]["PaymentSummary"][];
            /** @enum {string} */
            status: "INACTIVE";
            onboardingProgress: components["schemas"]["OnboardingProgress"];
            /**
             * Format: date-time
             * @description When it was deactivated (A3.2 «inactivo desde …», TAR-237)
             */
            deactivatedAt?: string | null;
        };
        /** @description A document in a list, without a link; the guest opens their own with `getOwnDocument` and the administrator with `listGuestDocuments` (RN-37) */
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
        /** @description A document with a short-lived signed link: the administrator gets it for any guest (`listGuestDocuments`) and the guest only for their own (`getOwnDocument`, TAR-241) (RN-37) */
        GuestDocument: {
            /** Format: uuid */
            id: string;
            originalName: string;
            /** @enum {string} */
            contentType: "image/jpeg" | "image/png" | "application/pdf";
            sizeBytes: number;
            /** Format: date-time */
            uploadedAt: string;
            /** @description R2 signed URL, expires 15 minutes after the response (RN-37) */
            url: string;
            /** Format: date-time */
            urlExpiresAt: string;
        };
        /**
         * @description Why an administrator deleted or replaced a document: an ARCO request of the holder or an upload error (RN-37)
         * @enum {string}
         */
        DocumentActionReason: "ARCO_REQUEST" | "UPLOAD_ERROR";
        /**
         * @description Channel through which the holder made the ARCO request
         * @enum {string}
         */
        DocumentRequestChannel: "WHATSAPP" | "EMAIL" | "IN_PERSON" | "OTHER";
        /**
         * Format: date
         * @description Date the holder made the ARCO request, on or before today (America/Lima). Required with `ARCO_REQUEST`; not allowed with `UPLOAD_ERROR`
         */
        DocumentRequestedAt: string;
        /** @description Only a reference (ticket or channel); no personal data of the holder. It is never logged. Empty or whitespace only counts as absent (stored as null) */
        DocumentActionNote: string;
        /** @description Why a document is deleted or replaced (RN-37). OpenAPI 3.0 cannot express the conditions, so they are listed here; each one broken is a 400 `VALIDATION_ERROR` with its `field`. With `ARCO_REQUEST`, `requestedAt` and `requestChannel` are both required. With `UPLOAD_ERROR`, neither may be sent. `requestedAt` is on or before today (America/Lima). An empty or whitespace-only `note` counts as null. */
        DocumentActionRequest: {
            reason: components["schemas"]["DocumentActionReason"];
            requestedAt?: components["schemas"]["DocumentRequestedAt"];
            requestChannel?: components["schemas"]["DocumentRequestChannel"];
            note?: components["schemas"]["DocumentActionNote"];
        };
        /** @description Evidence of one deletion or replacement of a guest document (RN-37). Never carries the file name, the storage key or the content. */
        GuestDocumentAction: {
            /** Format: uuid */
            id: string;
            /** @enum {string} */
            action: "DELETE" | "REPLACE";
            /**
             * Format: uuid
             * @description The document deleted or replaced
             */
            documentId: string;
            /**
             * Format: uuid
             * @description The new document of a REPLACE; null for a DELETE
             */
            replacementDocumentId: string | null;
            reason: components["schemas"]["DocumentActionReason"];
            /**
             * Format: date
             * @description Date the holder made the request; null for UPLOAD_ERROR
             */
            requestedAt: string | null;
            /**
             * @description null for UPLOAD_ERROR
             * @enum {string|null}
             */
            requestChannel: "WHATSAPP" | "EMAIL" | "IN_PERSON" | "OTHER" | null;
            /** @description Only a reference (ticket or channel); null when absent or blank */
            note: string | null;
            /**
             * @description Type of the deleted or replaced file
             * @enum {string}
             */
            contentType: "image/jpeg" | "image/png" | "application/pdf";
            /** @description Size of the deleted or replaced file */
            sizeBytes: number;
            /**
             * Format: uuid
             * @description The administrator who performed the action
             */
            actorId: string;
            /** @description Name of that administrator (A3.8, TAR-237) */
            actorName?: string;
            /** Format: date-time */
            performedAt: string;
        };
        PagedGuestDocumentActions: {
            content: components["schemas"]["GuestDocumentAction"][];
            nextCursor: components["schemas"]["NextCursor"];
        };
        /** @description Onboarding state. While the guest is in onboarding `nextStep` names the step to go to; once active there is no `nextStep` (RN-33, RN-36). */
        OnboardingState: components["schemas"]["OnboardingInProgress"] | components["schemas"]["OnboardingCompleted"];
        /** @description Onboarding still open (the password is already chosen). The personal data are always returned: before the step is saved `name` and `phone` are empty and `email` is the one of the account (TAR-349). */
        OnboardingInProgress: components["schemas"]["OnboardingPersonalDataPending"] | components["schemas"]["OnboardingDocumentsPending"] | components["schemas"]["OnboardingConsentPending"];
        OnboardingPersonalDataPending: {
            /** @enum {string} */
            status: "ONBOARDING";
            /**
             * @description The password step is already done: a guest that still must change its temporary password cannot reach the onboarding operations (RF-12)
             * @enum {string}
             */
            nextStep: "PERSONAL_DATA";
            personalData: components["schemas"]["PersonalData"];
            /**
             * Format: email
             * @description The new email waiting for its code, while the code can still be confirmed (TAR-349); left out when there is none
             */
            pendingEmail?: string;
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["PendingConsentState"];
        };
        /** @description Personal data saved; the optional documents step is next (the answer of saving the personal data) */
        OnboardingDocumentsPending: {
            /** @enum {string} */
            status: "ONBOARDING";
            /** @enum {string} */
            nextStep: "DOCUMENTS";
            personalData: components["schemas"]["PersonalData"];
            /**
             * Format: email
             * @description The new email waiting for its code, while the code can still be confirmed (TAR-349); left out when there is none
             */
            pendingEmail?: string;
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["PendingConsentState"];
        };
        /** @description Documents step finished or skipped; only the consent is left (the answer of finishing the documents step) */
        OnboardingConsentPending: {
            /** @enum {string} */
            status: "ONBOARDING";
            /** @enum {string} */
            nextStep: "CONSENT";
            personalData: components["schemas"]["PersonalData"];
            /**
             * Format: email
             * @description The new email waiting for its code, while the code can still be confirmed (TAR-349); left out when there is none
             */
            pendingEmail?: string;
            documents: components["schemas"]["GuestDocumentRef"][];
            consent: components["schemas"]["PendingConsentState"];
        };
        OnboardingCompleted: {
            /** @enum {string} */
            status: "ACTIVE";
            personalData: components["schemas"]["PersonalData"];
            /**
             * Format: email
             * @description The new email waiting for its code, while the code can still be confirmed (TAR-349); left out when there is none
             */
            pendingEmail?: string;
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
            /** @description null while the guest has not given a name (TAR-237) */
            guestName: string | null;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description «201»; with environmentType, «Habitación 201» (A4, A3.2, H2) */
            environmentCode: string;
            /** @enum {string} */
            environmentType: "ROOM" | "CABIN";
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
            /** @description ACTIVE with 30 days or fewer to the end date (RF-09, D-27); false when open-ended (H2 «Próximo a vencer», TAR-237) */
            expiringSoon: boolean;
            /**
             * Format: date
             * @description When it was terminated (RN-21); null unless TERMINATED
             */
            terminatedAt: string | null;
            /** @description The PDF of the contract (A4.2, H2) */
            file: {
                name: string;
                sizeBytes: number;
                /** Format: date-time */
                uploadedAt: string;
            };
            /** @description R2 signed URL, expires in 15 min; signed when the contract is requested, never stored. null when the storage could not sign it: the rest of the contract still comes, and «Ver contrato» shows the storage notice (TAR-237) */
            fileUrl: string | null;
        };
        /** @description A contract in a list, without the signed file URL */
        ContractSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            environmentId: string;
            /** Format: uuid */
            guestId: string;
            /** @description null while the guest has not given a name (TAR-237) */
            guestName: string | null;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @description «201»; with environmentType, «Habitación 201» (A4, A3.2, H2) */
            environmentCode: string;
            /** @enum {string} */
            environmentType: "ROOM" | "CABIN";
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
            /** @description ACTIVE with 30 days or fewer to the end date (RF-09, D-27); false when open-ended */
            expiringSoon: boolean;
            /**
             * Format: date
             * @description When it was terminated (RN-21); null unless TERMINATED
             */
            terminatedAt: string | null;
        };
        PagedContracts: {
            content: components["schemas"]["ContractSummary"][];
            nextCursor: components["schemas"]["NextCursor"];
        };
        /** @description Only a guest of type CONTRACT takes a contract (RN-13). The `code` is always `GUEST_NOT_CONTRACT` */
        GuestNotContractError: {
            /** @enum {string} */
            code: "GUEST_NOT_CONTRACT";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The file storage could not store or sign the file. The `code` is always `FILE_STORAGE_UNAVAILABLE` */
        FileStorageUnavailableError: {
            /** @enum {string} */
            code: "FILE_STORAGE_UNAVAILABLE";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /**
         * @description VOUCHER: an image or PDF (RF-15). CASH: an amount in cash without a voucher (RN-22)
         * @enum {string}
         */
        ProofKind: "VOUCHER" | "CASH";
        /** @description One proof of a payment being sent (RN-22). A VOUCHER points to its file with `fileIndex`, the position of the file in the `files` part (0-based); a CASH proof has no file */
        ProofInput: {
            kind: components["schemas"]["ProofKind"];
            /** @description Declared amount of this proof, in soles (RN-16) */
            amount: number;
            /** @description Optional free text, e.g. Yape or transfer (RN-28); a CASH proof is recorded as cash */
            method?: string;
            /** @description Required for VOUCHER, absent for CASH */
            fileIndex?: number;
        };
        /** @description One proof in a correction. With `id`, an existing proof of the payment that is kept (its amount or method can change, and `fileIndex` replaces its file); without `id`, a new proof */
        ProofEdit: {
            /** Format: uuid */
            id?: string;
            kind: components["schemas"]["ProofKind"];
            amount: number;
            method?: string;
            /** @description Required for a new VOUCHER; optional for a kept one (replaces its file) */
            fileIndex?: number;
        };
        /** @description Multipart body of `uploadPaymentVoucher`: the month, the proofs as a JSON part and their files */
        GuestPaymentUpload: {
            /**
             * @description A month of the contract, up to the current month
             * @example 2026-09
             */
            period: string;
            proofs: components["schemas"]["ProofInput"][];
            /** @description JPG/PNG/PDF, ≤5MB each, checked by content (RF-15); one per VOUCHER proof */
            files?: string[];
        };
        /** @description Multipart body of `uploadTemporaryVoucher`: the proofs as a JSON part and their files */
        StayPaymentUpload: {
            proofs: components["schemas"]["ProofInput"][];
            /** @description JPG/PNG/PDF, ≤5MB each, checked by content (RF-15); one per VOUCHER proof */
            files?: string[];
        };
        /** @description Multipart body of `createDirectPayment`. Send exactly one of `period` (a guest with a contract) or `stayId` (a temporary guest, whose single payment belongs to a stay, RN-03) */
        DirectPaymentUpload: {
            /** Format: uuid */
            guestId: string;
            /** @example 2026-09 */
            period?: string;
            /** Format: uuid */
            stayId?: string;
            /**
             * Format: date
             * @description When the money was received; optional, by default the day of the registration; not in the future. It does not change the month the payment counts in (RF-18)
             */
            receivedOn?: string;
            proofs: components["schemas"]["ProofInput"][];
            /** @description JPG/PNG/PDF, ≤5MB each, checked by content (RF-15); one per VOUCHER proof */
            files?: string[];
        };
        /** @description Multipart body of a correction: the whole new set of proofs as a JSON part and the new files */
        ProofsCorrection: {
            proofs: components["schemas"]["ProofEdit"][];
            /** @description JPG/PNG/PDF, ≤5MB each, checked by content (RF-15) */
            files?: string[];
        };
        /** @description The file of a voucher, without its URL */
        ProofFileInfo: {
            /** @description Sanitized file name */
            name: string;
            /** @enum {string} */
            contentType: "image/jpeg" | "image/png" | "application/pdf";
            sizeBytes: number;
        };
        /** @description A proof of a payment as its own guest sees it (no voucher URL) */
        GuestProof: {
            /** Format: uuid */
            id: string;
            kind: components["schemas"]["ProofKind"];
            method?: string | null;
            /** @description What was declared for this proof, in soles */
            declaredAmount: number;
            /** @description What the administrator verified (RN-16); null until the payment is approved */
            verifiedAmount: number | null;
            /**
             * @description Who added the proof (RN-22)
             * @enum {string}
             */
            uploadedBy: "GUEST" | "ADMIN";
            /** Format: date-time */
            addedAt: string;
            /**
             * Format: date
             * @description When the administration received the money (direct payments only)
             */
            receivedOn?: string | null;
            /** @description null for CASH */
            file?: components["schemas"]["ProofFileInfo"] | (never | null);
        };
        /** @description A proof of a payment in the administrator's detail, with its signed voucher URL */
        AdminProof: {
            /** Format: uuid */
            id: string;
            kind: components["schemas"]["ProofKind"];
            method?: string | null;
            declaredAmount: number;
            verifiedAmount: number | null;
            /** @enum {string} */
            uploadedBy: "GUEST" | "ADMIN";
            /** Format: date-time */
            addedAt: string;
            /** Format: date */
            receivedOn?: string | null;
            /** @description null for CASH */
            file?: components["schemas"]["ProofFileInfo"] | (never | null);
            /** @description R2 signed URL, expires in 15 min, forces the download; null for CASH */
            fileUrl: string | null;
        };
        /** @description One decision on a payment (payment_reviews) */
        PaymentReview: {
            /** @enum {string} */
            decision: "APPROVED" | "REJECTED";
            reason?: string | null;
            /** Format: date-time */
            at: string;
        };
        /** @description The administrator who resolved a payment (TAR-230); only in the administrator's views */
        ReviewerRef: {
            /** Format: uuid */
            id: string;
            name: string;
        };
        /** @description What was left over when the payment was approved (RN-38, RN-39) */
        PaymentSurplus: {
            amount: number;
            /**
             * @description CREDIT: discounted from the next period. REFUND_PENDING / REFUNDED: last period of a contract or a stay, returned by Quipu
             * @enum {string}
             */
            outcome: "CREDIT" | "REFUND_PENDING" | "REFUNDED";
        };
        /** @description A payment without its proofs' URLs — what lists and the guest's own responses carry */
        PaymentSummary: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            guestId: string;
            /**
             * Format: uuid
             * @description The contract the period belongs to; null for a temporary guest
             */
            contractId: string | null;
            /**
             * Format: uuid
             * @description The stay a temporary guest paid for; null for a guest with a contract
             */
            stayId: string | null;
            /**
             * @description null for a temporary guest (RN-03)
             * @example 2026-09
             */
            period: string | null;
            /** @description Sum of the declared amounts of its proofs, in soles */
            amount: number;
            /** @description Sum of the verified amounts (RN-16); null until approved */
            verifiedAmount: number | null;
            /**
             * @deprecated
             * @description Method of its first proof; each proof carries its own method now (TAR-239)
             */
            paymentMethod?: string | null;
            /** @enum {string} */
            status: "PENDING" | "APPROVED" | "REJECTED";
            /** @description Shown to the guest in the app only, never by email (D-34d) */
            rejectionReason?: string | null;
            proofCount: number;
            voucherCount: number;
            hasCash: boolean;
            /** Format: date-time */
            reviewedAt?: string | null;
            /**
             * Format: date-time
             * @description Last time it was sent (a corrected payment is sent again)
             */
            submittedAt: string;
            /** Format: date-time */
            createdAt: string;
        } & (({
            contractId?: string;
            period?: string;
            /** @enum {string|null} */
            stayId?: null;
        } & {
            [key: string]: unknown;
        }) | ({
            stayId?: string;
            /** @enum {string|null} */
            contractId?: null;
            /** @enum {string|null} */
            period?: null;
        } & {
            [key: string]: unknown;
        }));
        /** @description A payment in the administrator's detail (`getPayment`): what is being paid, its proofs with their signed URLs and its reviews (A5.2, TAR-239) */
        Payment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            guestId: string;
            /** @description null while the guest has not given a name in the onboarding */
            guestName: string | null;
            documentNumber: string;
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            /** @description null for a stay without environment (TAR-237) */
            environmentCode: string | null;
            /** Format: uuid */
            contractId: string | null;
            /** Format: uuid */
            stayId: string | null;
            /** @example 2026-09 */
            period: string | null;
            /**
             * Format: date
             * @description Stay dates; null for a guest with a contract
             */
            stayStartDate: string | null;
            /** Format: date */
            stayEndDate: string | null;
            /** @description Monthly amount of the contract or agreed amount of the stay */
            expectedAmount: number;
            /** @description Credit of the guest discounted from this period (RN-38); 0 for a stay */
            creditApplied: number;
            /** @description expectedAmount - creditApplied: what the verified sum must cover to approve */
            amountDue: number;
            /** @description Last period of the contract, or a stay: what is left over is refunded instead of kept as credit (RN-38) */
            lastPeriod: boolean;
            /** @description Sum of the declared amounts */
            amount: number;
            verifiedAmount: number | null;
            /** @enum {string} */
            status: "PENDING" | "APPROVED" | "REJECTED";
            rejectionReason?: string | null;
            surplus?: components["schemas"]["PaymentSurplus"] | (never | null);
            /** Format: date-time */
            reviewedAt?: string | null;
            /** @description Who resolved it last (TAR-230); null while pending */
            reviewedBy: components["schemas"]["ReviewerRef"] | (never | null);
            /** Format: date-time */
            submittedAt: string;
            /** Format: date-time */
            createdAt: string;
            proofs: components["schemas"]["AdminProof"][];
            /** @description Oldest first */
            reviews: components["schemas"]["PaymentReview"][];
        } & (({
            contractId?: string;
            period?: string;
            /** @enum {string|null} */
            stayId?: null;
        } & {
            [key: string]: unknown;
        }) | ({
            stayId?: string;
            /** @enum {string|null} */
            contractId?: null;
            /** @enum {string|null} */
            period?: null;
        } & {
            [key: string]: unknown;
        }));
        PagedPayments: {
            content: components["schemas"]["PaymentSummary"][];
            nextCursor: components["schemas"]["NextCursor"];
        };
        /** @description A row of «Cobros del mes» in A1 (TAR-236) */
        DashboardCharge: {
            /** Format: uuid */
            guestId: string;
            guestName: string | null;
            documentType: components["schemas"]["DocumentType"];
            documentNumber: string;
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            /** @description Null for an old stay without environment (TAR-237) */
            environmentCode: string | null;
            /** Format: uuid */
            contractId: string | null;
            /** Format: uuid */
            stayId: string | null;
            /** @description Period of a contract; null for a stay */
            period: string | null;
            /** Format: date */
            stayStartDate: string | null;
            /** Format: date */
            stayEndDate: string | null;
            /** @description Monthly amount or agreed amount of the stay, minus the credit applied (RN-38) */
            amount: number;
            /**
             * Format: date
             * @description Payment day of the period (RN-10) or the check-out date of the stay
             */
            dueDate: string;
            /** @enum {string} */
            status: "PAID" | "UNDER_REVIEW" | "UNPAID" | "OVERDUE";
            /**
             * Format: uuid
             * @description The payment of the period, to open A5.2: the live one when UNDER_REVIEW, or the rejected one nobody corrected yet (paymentRejected). Null when the period has no payment
             */
            paymentId: string | null;
            /** @description The period (UNPAID or OVERDUE) has a rejected payment not corrected yet (RN-05): A1 says «Pago rechazado» and offers «Corregir pago» (A5.2) instead of «Registrar pago», because the period already has its payment (RN-15) */
            paymentRejected: boolean;
        };
        DashboardChargeRef: {
            /** Format: uuid */
            guestId: string;
            guestName: string | null;
            environmentCode: string | null;
            period: string | null;
            /** Format: date */
            stayStartDate: string | null;
            /** Format: date */
            stayEndDate: string | null;
            /** Format: date */
            dueDate: string;
            amount: number;
        };
        /** @description Overdue charges, of this month or earlier (RN-10, RN-25) */
        DashboardOverdue: {
            count: number;
            total: number;
            /** @description The oldest ones first */
            first: components["schemas"]["DashboardChargeRef"][];
        };
        /** @description Payments rejected that nobody has corrected yet (RN-05, A5 Rechazados) */
        DashboardRejected: {
            count: number;
            oldest: {
                /** Format: uuid */
                paymentId: string;
                guestName: string | null;
                period: string | null;
                /** Format: date */
                stayStartDate: string | null;
                /** Format: date */
                stayEndDate: string | null;
                /** Format: date-time */
                rejectedAt: string;
            } | null;
        };
        /** @description Credit to refund (RN-38, RN-39); the detail is in GET /admin/credits?pending=true */
        DashboardRefunds: {
            /** @description Guests with credit to refund */
            count: number;
            total: number;
        };
        /** @description Active contracts that end in 30 days or less (RN-07, expiringSoon) */
        DashboardExpiringContracts: {
            count: number;
            /** @description The one that ends first */
            first: {
                /** Format: uuid */
                contractId: string;
                guestName: string | null;
                environmentCode: string;
                /** Format: date */
                endDate: string;
            } | null;
        };
        /** @description Guests pending activation (RN-32, RN-36) */
        DashboardGuestsNotActivated: {
            count: number;
            /** @description How many of them have their access expired */
            expired: number;
            /** @description An expired one first, otherwise the one whose access ends first */
            first: {
                /** Format: uuid */
                guestId: string;
                documentType: components["schemas"]["DocumentType"];
                documentNumber: string;
                /** Format: date-time */
                accessExpiresAt: string | null;
            } | null;
        };
        /** @description One own payment as the guest sees it (H3 «Tu pago», H4), without voucher URLs nor who reviewed it */
        GuestPayment: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            contractId: string | null;
            /** Format: uuid */
            stayId: string | null;
            period: string | null;
            /** Format: date */
            stayStartDate?: string | null;
            /** Format: date */
            stayEndDate?: string | null;
            /** @enum {string} */
            status: "PENDING" | "APPROVED" | "REJECTED";
            /** @description Sum of the declared amounts */
            amount: number;
            verifiedAmount: number | null;
            creditApplied: number;
            amountDue: number;
            surplus?: components["schemas"]["PaymentSurplus"] | (never | null);
            rejectionReason?: string | null;
            /** Format: date-time */
            submittedAt: string;
            /** Format: date-time */
            createdAt: string;
            proofs: components["schemas"]["GuestProof"][];
            /** @description What happened, oldest first («Lo que pasó» in H4) */
            reviews: components["schemas"]["PaymentReview"][];
        };
        /** @description A refund Quipu made to the guest (RN-39), shown in H4 with the label Devuelto */
        GuestRefund: {
            /** Format: uuid */
            id: string;
            /** Format: date */
            date: string;
            method: string;
            amount: number;
            /**
             * Format: uuid
             * @description The payment whose surplus was refunded
             */
            fromPaymentId: string;
            fromPeriod?: string | null;
        };
        /** @description An item of the guest's history: a payment or a refund, by `kind` */
        GuestHistoryItem: {
            /** @enum {string} */
            kind: "PAYMENT" | "REFUND";
            /** @description Set when kind=PAYMENT */
            payment: components["schemas"]["GuestPayment"] | (never | null);
            /** @description Set when kind=REFUND */
            refund: components["schemas"]["GuestRefund"] | (never | null);
        };
        PagedGuestHistory: {
            content: components["schemas"]["GuestHistoryItem"][];
            nextCursor: components["schemas"]["NextCursor"];
            /** @description Credit the guest has now, to be discounted from the next period (RN-38) */
            creditBalance: number;
        };
        /** @description A row of the review queue (A5); it does not show the amount */
        PaymentQueueItem: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            guestId: string;
            /** @description null while the guest has not given a name in the onboarding */
            guestName: string | null;
            documentNumber: string;
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            /** @description Environment of the contract or of the stay (A5 column Ambiente, «C1»); null only for an old stay registered without environment (TAR-237) */
            environmentCode: string | null;
            /** @example 2026-09 */
            period: string | null;
            /**
             * Format: date
             * @description Stay dates of a temporary guest («20 – 31 oct»); null for a contract
             */
            stayStartDate: string | null;
            /** Format: date */
            stayEndDate: string | null;
            /** @enum {string} */
            status: "PENDING" | "APPROVED" | "REJECTED";
            proofCount: number;
            /** @description With hasCash, the Comprobantes column («2 vouchers», «1 voucher y efectivo») */
            voucherCount: number;
            hasCash: boolean;
            /** @description Who resolved it (TAR-230); null while pending */
            reviewedBy?: components["schemas"]["ReviewerRef"] | (never | null);
            /** @description Reason of the rejection, for the row of the Rechazados view («Motivo: …», TAR-296); null unless the status is REJECTED. It is not sent by mail (D-34d) */
            rejectionReason: string | null;
            /**
             * Format: date-time
             * @description When it was resolved («rechazado hace N días», TAR-296); null while pending
             */
            reviewedAt: string | null;
            /**
             * Format: date-time
             * @description Last time it was sent; orders the queue
             */
            submittedAt: string;
            /**
             * Format: date-time
             * @description When the payment was first sent
             */
            createdAt: string;
        } & (({
            /** @enum {string} */
            guestType?: "CONTRACT";
            environmentCode?: string;
            period?: string;
        } & {
            [key: string]: unknown;
        }) | ({
            /** @enum {string} */
            guestType?: "TEMPORARY";
            /** @description The environment of the stay; null only for an old stay registered without environment */
            environmentCode?: string | null;
            /** @enum {string|null} */
            period?: null;
        } & {
            [key: string]: unknown;
        }));
        PagedPaymentQueue: {
            content: components["schemas"]["PaymentQueueItem"][];
            nextCursor: components["schemas"]["NextCursor"];
        };
        PeriodStatus: {
            /** @example 2026-09 */
            period: string;
            /** @enum {string} */
            status: "PAID" | "UNDER_REVIEW" | "UNPAID" | "OVERDUE";
            /**
             * Format: date
             * @description Payment day of the month, or its last day when the month is shorter (RN-10); the grace days come on top
             */
            dueDate: string;
            /** @description Monthly amount of the contract */
            amount: number;
            /** @description Credit of the guest discounted from this period (RN-38), at most `amount` */
            creditApplied: number;
            /** @description amount - creditApplied: what is left to pay (H1 «S/ 750.00»). When the credit covers the whole period it is 0 and the period is PAID without a payment (`paymentId` null); the credit left passes on to the next period, month by month (RN-38, decided 2026-11-01) */
            amountDue: number;
            /** Format: uuid */
            contractId: string;
            /**
             * Format: uuid
             * @description The live or last payment of the period, if any; null for a period paid with credit only
             */
            paymentId?: string | null;
            /** @description Reason of the last rejection while the payment stays rejected (D-34d); a rejected period stays UNPAID or OVERDUE */
            rejectionReason?: string | null;
        };
        /** @description Credit of a guest with a contract (RN-38, RN-39) */
        GuestCredit: {
            /** @description Credit the guest has now; 0 when none */
            balance: number;
            /** @description true when no period is left where to use it, so Quipu refunds it (A6.5) */
            toRefund: boolean;
            /** @description The payments the credit the guest still uses in the coming periods was left over from (`balance` while `toRefund` is false), and how much each one adds, oldest first (H1 «Tienes S/ … a favor.» says which month it was left over from, RN-38, TAR-284). Credit that already passed to be refunded is not listed here. Empty when there is none. */
            origins: {
                /**
                 * Format: uuid
                 * @description The payment the credit was left over from
                 */
                paymentId: string;
                /**
                 * @description Period of that payment
                 * @example 2026-09
                 */
                period: string;
                /** @description Credit left over from that payment that is still to be used */
                amount: number;
            }[];
            /** @description The last refund Quipu made to the guest (H1 «Te devolvimos S/ 120.00 el 3 de noviembre por Yape») */
            lastRefund: {
                amount: number;
                /** Format: date */
                date: string;
                method: string;
            } | null;
        };
        /** @description Payment status of one stay of a temporary guest (CU-21) */
        StayPaymentStatus: {
            /** Format: uuid */
            stayId: string;
            /** Format: date */
            startDate: string;
            /** Format: date */
            endDate: string;
            /** @description «C1»; with environmentType, «Cabaña C1» (T3). null for an old stay without environment (TAR-237) */
            environmentCode: string | null;
            /**
             * @description null together with environmentCode
             * @enum {string|null}
             */
            environmentType: "ROOM" | "CABIN" | null;
            /**
             * @description OVERDUE once the exit date has passed without an approved payment
             * @enum {string}
             */
            status: "PAID" | "UNDER_REVIEW" | "UNPAID" | "OVERDUE";
            agreedAmount: number;
            /** Format: uuid */
            paymentId?: string | null;
            rejectionReason?: string | null;
            /** @description What was paid over the agreed amount: a stay keeps no credit, it is refunded (RN-38, RN-39, T1) */
            surplus: {
                amount: number;
                /** @enum {string} */
                refundStatus: "PENDING" | "REFUNDED";
                /** Format: date */
                refundedOn?: string | null;
                refundMethod?: string | null;
            } | null;
        };
        /** @description A period or a stay of the guest for a direct payment (A5.1) */
        PayablePeriod: {
            /** Format: uuid */
            contractId: string | null;
            period: string | null;
            /** Format: uuid */
            stayId: string | null;
            /** Format: date */
            stayStartDate: string | null;
            /** Format: date */
            stayEndDate: string | null;
            /**
             * @description UNPAID and OVERDUE take a direct payment; UNDER_REVIEW and REJECTED are completed in A5.2
             * @enum {string}
             */
            status: "UNPAID" | "OVERDUE" | "UNDER_REVIEW" | "REJECTED";
            /**
             * Format: date
             * @description Payment day of the period, or exit date of the stay
             */
            dueDate: string;
            expectedAmount: number;
            creditApplied: number;
            amountDue: number;
            lastPeriod: boolean;
            /**
             * Format: uuid
             * @description Set when UNDER_REVIEW or REJECTED
             */
            paymentId: string | null;
        };
        /** @description The payment cannot be corrected in its state: the guest corrects only a REJECTED payment, the administrator a PENDING or REJECTED one. The `code` is always `PAYMENT_NOT_CORRECTABLE` */
        PaymentNotCorrectableError: {
            /** @enum {string} */
            code: "PAYMENT_NOT_CORRECTABLE";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description A voucher is already pending for the period or the stay (RN-15, RN-03). The `code` is always `VOUCHER_ALREADY_EXISTS` */
        VoucherAlreadyExistsError: {
            /** @enum {string} */
            code: "VOUCHER_ALREADY_EXISTS";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The period or the stay already has an approved payment (RN-02, D-28). The `code` is always `PAYMENT_ALREADY_EXISTS_FOR_PERIOD` */
        PaymentAlreadyExistsForPeriodError: {
            /** @enum {string} */
            code: "PAYMENT_ALREADY_EXISTS_FOR_PERIOD";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description Another process resolved the payment first. The `code` is always `PAYMENT_ALREADY_RESOLVED` */
        PaymentAlreadyResolvedError: {
            /** @enum {string} */
            code: "PAYMENT_ALREADY_RESOLVED";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        /** @description The payment's period is no longer charged by the contract (it was terminated or expired before the approval), so it cannot be approved. The payment stays pending and can only be rejected with a reason. The `code` is always `PAYMENT_PERIOD_NOT_PAYABLE` */
        PaymentPeriodNotPayableError: {
            /** @enum {string} */
            code: "PAYMENT_PERIOD_NOT_PAYABLE";
            /** @description User-facing message, in Spanish, ready to display in the UI */
            message: string;
        };
        RefundInput: {
            /** Format: uuid */
            guestId: string;
            /** @description In soles; at most the pending credit of the guest (RN-38) */
            amount: number;
            /**
             * Format: date
             * @description When the money was returned; not in the future. The refund counts in this date's month (RN-39)
             */
            date: string;
            /** @description Free text, e.g. Yape or transfer; required (RN-39) */
            method: string;
            /** @description Optional; blank means none */
            note?: string;
        };
        /** @description A refund as the BFF answers it, with the guest it went to */
        Refund: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            guestId: string;
            guestName: string | null;
            /** @description The environment of the contract or stay the credit came from; null for a stay without environment (TAR-237) */
            environmentCode: string | null;
            amount: number;
            /** Format: date */
            date: string;
            method: string;
            note?: string | null;
            /** Format: date-time */
            createdAt: string;
        };
        PagedRefunds: {
            content: components["schemas"]["Refund"][];
            nextCursor: components["schemas"]["NextCursor"];
            /** @description Refunds of the month, for «Mostrando X de Y» */
            totalCount: number;
        };
        /** @description Credit of a guest that has to be refunded (RN-38) */
        PendingCredit: {
            /** Format: uuid */
            guestId: string;
            guestName: string | null;
            /** @enum {string} */
            guestType: "CONTRACT" | "TEMPORARY";
            environmentCode: string | null;
            /** @description Pending credit, after any partial refund */
            amount: number;
            /** @description Where the credit came from («Sobró del pago de octubre; su contrato terminó el 15 oct») */
            origin: {
                /** Format: uuid */
                paymentId: string;
                period: string | null;
                /** Format: date */
                stayStartDate: string | null;
                /** Format: date */
                stayEndDate: string | null;
                /**
                 * Format: date
                 * @description End or termination date when the contract is over; null otherwise
                 */
                contractEndedOn: string | null;
            };
        };
        /** @description An edit of an expense (A6.1) is the whole expense again, with the `version` the client loaded */
        ExpenseUpdateInput: components["schemas"]["ExpenseInput"] & {
            /**
             * Format: int64
             * @description The `version` the client loaded. When the expense changed since, the answer is 409 CONCURRENT_MODIFICATION and nothing is saved (BE-SPR-DAT-13)
             */
            version: number;
        };
        ExpenseInput: {
            /**
             * @description UTILITIES: electricity, water, internet. MAINTENANCE: maintenance and repairs. CLEANING_SUPPLIES: cleaning and supplies. TAXES_FEES: taxes and fees (D-26)
             * @enum {string}
             */
            category: "UTILITIES" | "MAINTENANCE" | "CLEANING_SUPPLIES" | "TAXES_FEES";
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
            /**
             * Format: uuid
             * @description Any existing guest, active or inactive
             */
            guestId: string;
            /** @description In soles, greater than 0, at most two decimals */
            amount: number;
            /**
             * @description Month the fine counts as income (RN-30)
             * @example 2026-09
             */
            month: string;
            /** @description Optional; blank means none */
            description?: string;
        };
        /** @description A fine as the BFF answers it; the fields of `FineInput`, with the same constraints, plus its `id` and who it was charged to. The description is left out when there is none. */
        Fine: {
            /** Format: uuid */
            id: string;
            /** Format: uuid */
            guestId: string;
            /** @description For the Multas table of A6 (TAR-240) */
            guestName: string | null;
            /** @description The guest's environment when the fine was charged, or its last one; null if it never had one */
            environmentCode: string | null;
            /** @description In soles, greater than 0, at most two decimals */
            amount: number;
            /** @example 2026-09 */
            month: string;
            description?: string;
        };
        /** @description An expense as the BFF answers it; the fields of `ExpenseInput`, with the same constraints, plus its `id`. The description is left out when there is none. */
        Expense: {
            /** Format: uuid */
            id: string;
            /**
             * Format: int64
             * @description Optimistic-locking version (BE-SPR-DAT-13): A6.1 sends it back when editing; it grows with every change of the expense
             */
            readonly version: number;
            /**
             * @description UTILITIES: electricity, water, internet. MAINTENANCE: maintenance and repairs. CLEANING_SUPPLIES: cleaning and supplies. TAXES_FEES: taxes and fees (D-26)
             * @enum {string}
             */
            category: "UTILITIES" | "MAINTENANCE" | "CLEANING_SUPPLIES" | "TAXES_FEES";
            /** @description In soles, greater than 0, at most two decimals */
            amount: number;
            /** @example 2026-09 */
            month: string;
            description?: string;
        };
    };
    responses: {
        /** @description Authorized admin invalidations. Ready is first; changed contains only this role's keys. Headers below apply to HTTP 200, not JSON errors sent before opening. Flush complete frames without compression or proxy buffering. Tests must parse UTF-8 SSE framing, including CRLF and split chunks, join data lines, ignore comments, JSON-parse data and validate it against the event's x-sse-events dataSchema below. Generic OpenAPI validation of the response string is insufficient. Also assert ready-first, role isolation, frame byte limit, heartbeat behavior, nondecreasing versions and closure/lifecycle rules. */
        AdminChangeStream: {
            headers: {
                /** @description Do not cache or transform this private stream */
                "Cache-Control": "no-store, no-transform";
                /** @description Disable buffering in proxies that support this header */
                "X-Accel-Buffering": "no";
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example event: ready
                 *     data: {"epoch":"f18a40da-6ddf-4ab4-a75b-f4ad8de2d615","version":0}
                 *
                 *     : heartbeat
                 *
                 *     event: changed
                 *     data: {"epoch":"f18a40da-6ddf-4ab4-a75b-f4ad8de2d615","version":2,"invalidate":["admin.dashboard","admin.payments.queue"]}
                 *
                 *     event: changed
                 *     data: {"epoch":"f18a40da-6ddf-4ab4-a75b-f4ad8de2d615","version":5,"invalidate":"ALL"}
                 *
                 *     event: closing
                 *     data: {"reason":"access-token-expired"}
                 */
                "text/event-stream": string;
            };
        };
        /** @description Authorized guest invalidations. Ready is first; changed contains only this role's keys. Headers below apply to HTTP 200, not JSON errors sent before opening. Flush complete frames without compression or proxy buffering. Tests must parse UTF-8 SSE framing, including CRLF and split chunks, join data lines, ignore comments, JSON-parse data and validate it against the event's x-sse-events dataSchema below. Generic OpenAPI validation of the response string is insufficient. Also assert ready-first, role isolation, frame byte limit, heartbeat behavior, nondecreasing versions and closure/lifecycle rules. */
        GuestChangeStream: {
            headers: {
                /** @description Do not cache or transform this private stream */
                "Cache-Control": "no-store, no-transform";
                /** @description Disable buffering in proxies that support this header */
                "X-Accel-Buffering": "no";
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example event: ready
                 *     data: {"epoch":"f18a40da-6ddf-4ab4-a75b-f4ad8de2d615","version":0}
                 *
                 *     : heartbeat
                 *
                 *     event: changed
                 *     data: {"epoch":"f18a40da-6ddf-4ab4-a75b-f4ad8de2d615","version":2,"invalidate":["guest.home","guest.payments"]}
                 *
                 *     event: changed
                 *     data: {"epoch":"f18a40da-6ddf-4ab4-a75b-f4ad8de2d615","version":5,"invalidate":"ALL"}
                 *
                 *     event: closing
                 *     data: {"reason":"access-token-expired"}
                 */
                "text/event-stream": string;
            };
        };
        /** @description Before opening only. AUTH_FORBIDDEN for wrong role, forbidden origin or failed edge gate; AUTH_PASSWORD_CHANGE_REQUIRED when the session must change its temporary password. Do not refresh-loop on a 403. */
        ChangeStreamForbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_FORBIDDEN" | "AUTH_PASSWORD_CHANGE_REQUIRED";
                    /** @description User-facing message in Spanish */
                    message: string;
                };
            };
        };
        /** @description Before opening only. RATE_LIMITED for existing request limits or the stream/account/global cap. Connection caps use Retry-After 30 seconds; existing request-limit windows may differ. EventSource cannot inspect status/headers; controlled recovery must avoid reconnect storms and preserve the session. */
        ChangeStreamLimited: {
            headers: {
                /** @description Seconds until another connection may be attempted */
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
        CsrfInvalid: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["CsrfError"];
            };
        };
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
        /**
         * @description The session is valid but its role cannot use the operation (RN-08, RN-09). On the multipart uploads it is also returned when the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin` (ADR-006). The `code` is always `AUTH_FORBIDDEN`
         *      For unsafe requests, AUTH_CSRF_INVALID is also returned when the CSRF cookie/header pair is absent or invalid, before authentication or business validation.
         */
        Forbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
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
        /** @description Two edits of the same record collided (optimistic locking, BE-SPR-DAT-13): the record changed after the client loaded it. The edits of an environment (A2.4), a pending guest's document and a stay (A3.5) and an expense (A6.1) send back the `version` the client loaded, and a different one is this conflict; elsewhere it is a write that lost a race. The client reloads the record and retries. The `code` is always `CONCURRENT_MODIFICATION` */
        ConcurrentModification: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "code": "CONCURRENT_MODIFICATION",
                 *       "message": "El registro cambió mientras lo editabas; vuelve a cargarlo e inténtalo de nuevo"
                 *     }
                 */
                "application/json": components["schemas"]["ConcurrentModificationError"];
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
        /** @description Account disabled (RN-12) For unsafe requests, AUTH_CSRF_INVALID is also returned when the CSRF cookie/header pair is absent or invalid, before authentication or business validation. */
        AccountDisabled: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description Account temporarily locked after 5 consecutive failed logins (SEG-06): the lock lasts 15 minutes, expires by itself and is lifted by a password reset (RF-16). The `code` is always `AUTH_ACCOUNT_LOCKED`. The `Retry-After` header gives the seconds left, which is what the client counts down from (so a wrong clock on the device cannot skew it), and `lockedUntil` the instant the lock ends, to show the time of day */
        AccountLocked: {
            headers: {
                /** @description Seconds until the account can try again, rounded up (at least 1) */
                "Retry-After": number;
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_ACCOUNT_LOCKED";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                    /**
                     * Format: date-time
                     * @description UTC instant at which the lock ends; the UI shows it in America/Lima
                     */
                    lockedUntil: string;
                };
            };
        };
        /** @description Rate limit exceeded (SEC-01) — retry after the window in the `Retry-After` header */
        TooManyRequests: {
            headers: {
                /** @description Seconds until the client may retry */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /**
         * @description `AUTH_FORBIDDEN`: the session is not an administrator (RN-08), or the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin`, or they name another site (ADR-006). `replaceGuestDocument` is one route of the exact set of multipart routes under that check: `createContract`, `createDirectPayment`, `uploadPaymentVoucher`, `uploadOnboardingDocument`, `uploadTemporaryVoucher`, `uploadOwnDocument`, `uploadTemporaryOwnDocument`, `replaceGuestDocument`, and the corrections of a payment (TAR-239): `correctPaymentByAdmin`, `correctOwnPayment` and `correctOwnPaymentTemporary`. `deleteGuestDocument` is the only JSON route under the same check, because it deletes personal data irreversibly
         *      For unsafe requests, AUTH_CSRF_INVALID is also returned when the CSRF cookie/header pair is absent or invalid, before authentication or business validation.
         */
        OriginCheckForbidden: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /** @description The id does not exist or is not an ADMIN account (`ADMIN_NOT_FOUND`); both cases answer the same `message` */
        AdministratorNotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                /**
                 * @example {
                 *       "code": "ADMIN_NOT_FOUND",
                 *       "message": "El administrador no existe"
                 *     }
                 */
                "application/json": {
                    /** @enum {string} */
                    code: "ADMIN_NOT_FOUND";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /** @description The guest does not exist, the document does not belong to that guest, or a concurrent action on the same document won (`RESOURCE_NOT_FOUND`; for a deletion, only a replacement that won: an already deleted document is a 204). A single lookup by `(guest_id, id)` answers all cases with the same `message`, so the response does not reveal whether the guest or the document exists */
        GuestDocumentNotFound: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["Error"];
            };
        };
        /** @description The file storage (R2) is not configured or failed; nothing was saved — retry later (`FILE_STORAGE_UNAVAILABLE`) */
        FileStorageUnavailable: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["FileStorageUnavailableError"];
            };
        };
        /** @description The guest is inactive (RN-12, RN-18). The `code` is always `GUEST_INACTIVE` and `guestId` lets the administrator reactivate it right from the notice (`POST /admin/guests/{id}/reactivate`, CU-28) */
        GuestInactive: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["GuestInactiveError"];
            };
        };
        /**
         * @description A guest session that cannot use the onboarding operation. The `code` is `AUTH_PASSWORD_CHANGE_REQUIRED` while a temporary password has not been changed (RF-12) or `AUTH_FORBIDDEN` for the administrator. Never `AUTH_ONBOARDING_REQUIRED`: these are the routes an incomplete guest must reach. On the multipart upload, `AUTH_FORBIDDEN` is also returned when the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin` (ADR-006)
         *      For unsafe requests, AUTH_CSRF_INVALID is also returned when the CSRF cookie/header pair is absent or invalid, before authentication or business validation.
         */
        OnboardingAccessDenied: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
                    /** @description User-facing message, in Spanish, ready to display in the UI */
                    message: string;
                };
            };
        };
        /**
         * @description The guest session cannot use the operation yet or at all. The `code` is `AUTH_ONBOARDING_REQUIRED` while the onboarding is incomplete (RN-33: the client redirects to the first pending step, `nextStep` of `GET /guest/onboarding`), `AUTH_PASSWORD_CHANGE_REQUIRED` while a temporary password has not been changed (RF-12) and `AUTH_FORBIDDEN` for a guest of the other type (a CONTRACT guest on `/temporary-guest/**` or the reverse, RN-09)
         *      For unsafe requests, AUTH_CSRF_INVALID is also returned when the CSRF cookie/header pair is absent or invalid, before authentication or business validation.
         */
        GuestAccessDenied: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": {
                    /** @enum {string} */
                    code: "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
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
                "application/json": components["schemas"]["OnboardingConflictError"];
            };
        };
        /** @description Invalid input (`VALIDATION_ERROR`, `UNKNOWN_FIELD`) or a refused verification (TAR-349): `EMAIL_UNCHANGED` (the email is already the guest's, case-insensitive, `field: email`; nothing is sent), `EMAIL_VERIFICATION_INVALID` (the code does not match, or nothing is pending, `field: code`) or `EMAIL_VERIFICATION_EXPIRED` (the code ran out of its 10 minutes or of its 5 attempts; request a new one, `field: code`) */
        EmailVerificationRefused: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["EmailVerificationError"] | components["schemas"]["Error"];
            };
        };
        /** @description `EMAIL_VERIFICATION_COOLDOWN`: a code was sent less than 60 seconds ago (TAR-349), or `RATE_LIMITED` by the address limit (SEC-01). The wait is in `Retry-After` and, for the cooldown, also in `retryAfterSeconds` */
        EmailVerificationCooldown: {
            headers: {
                /** @description Seconds until the client may retry */
                "Retry-After"?: number;
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["EmailVerificationCooldownError"] | components["schemas"]["Error"];
            };
        };
        /** @description `ACCOUNT_EMAIL_TAKEN`: the email, case-insensitive, already belongs to another account, administrator or guest (`field: email`) */
        AccountEmailTaken: {
            headers: {
                [name: string]: unknown;
            };
            content: {
                "application/json": components["schemas"]["AccountEmailTakenError"];
            };
        };
    };
    parameters: {
        /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
        XsrfToken: string;
        Id: string;
        StayId: string;
        DocumentId: string;
        /** @description Items per page, from 1 to 100. A value out of range is a 400 */
        Limit: number;
        /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
        After: string;
    };
    requestBodies: never;
    headers: {
        /** @description Absolute path of the created resource, with its masked id (RFC 9110, 201 Created) */
        Location: string;
    };
    pathItems: never;
}
export type $defs = Record<string, never>;
export interface operations {
    streamAdminChanges: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["AdminChangeStream"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["ChangeStreamForbidden"];
            429: components["responses"]["ChangeStreamLimited"];
        };
    };
    streamGuestChanges: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            200: components["responses"]["GuestChangeStream"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["ChangeStreamForbidden"];
            429: components["responses"]["ChangeStreamLimited"];
        };
    };
    getCsrfToken: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description CSRF cookie available; no response body */
            204: {
                headers: {
                    /** @description The browser and intermediaries must not cache this response */
                    "Cache-Control": "no-store";
                    /** @description XSRF-TOKEN when a token needs to be created. It need not be reissued when the browser already holds an existing token. */
                    "Set-Cookie"?: string;
                    [name: string]: unknown;
                };
                content?: never;
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    login: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description Session started — sets the `sessionToken` (access, 15 minutes) and `refreshToken` HttpOnly cookies (SameSite=Lax; Secure; TAR-228) */
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
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session closed; both session cookies and the CSRF cookie expired */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["CsrfInvalid"];
        };
    };
    refreshSession: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Session renewed: Set-Cookie replaces `sessionToken` and `refreshToken` (no Set-Cookie inside the 30 second race window) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description `AUTH_NO_SESSION`: the refresh token is missing, unknown, expired (7 days without use or 30 days after the login) or revoked; it was already rotated (the session is closed); or the account changed its password or role or was deactivated. The client logs in again */
            401: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            403: components["responses"]["CsrfInvalid"];
            429: components["responses"]["TooManyRequests"];
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
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description Access activated — sets the `sessionToken` and `refreshToken` cookies, as login does (TAR-228). Always a guest session with the password already set: the guest goes on to the onboarding (never back to the password step) or, if it was already active (administrator-assisted recovery), straight to the home */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["ActivatedOnboardingSession"] | components["schemas"]["ActivatedActiveSession"];
                };
            };
            /** @description `AUTH_INVALID_OR_EXPIRED_CODE` (unknown, expired, revoked or already used token: one generic answer for all of them), `AUTH_WEAK_PASSWORD` (with `field: newPassword`: too short, too long or equal to a live link or temporary password of the account; the token is not consumed) or `VALIDATION_ERROR` if a field is missing */
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
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description Password updated; Set-Cookie replaces both session cookies */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description `AUTH_WEAK_PASSWORD` (shorter than 8 characters, longer than 72 bytes, or equal to a live link or temporary password of the account) or `AUTH_PASSWORD_UNCHANGED` (same as the current one), both with `field: newPassword`; `VALIDATION_ERROR` if the field is missing */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            /** @description `AUTH_INVALID_CREDENTIALS` with `field: currentPassword` when the current password is wrong (A0.6, as in the re-authentication of the administrators, TAR-127). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
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
    requestPasswordReset: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            403: components["responses"]["CsrfInvalid"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    resetPassword: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
                    /** @description Full name of an administrator that activates the account (RF-22, A0.5, decided 2026-11-01): required while the account has no name, and ignored once it has one. It applies to any administrator without a name: the first one (ADR-F2) and the ones created by another. It has at least one character that is not whitespace and no control characters (line break, tab, NUL). The email of an account without name links to the administrator activation screen instead of the recovery one. */
                    name?: string;
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
            /** @description `AUTH_INVALID_OR_EXPIRED_CODE` (unknown, expired or already used code, or a disabled account: one generic answer for all of them), `AUTH_WEAK_PASSWORD` (with `field: newPassword`: too short, too long or equal to a live link or temporary password of the account; the code is not consumed) or `VALIDATION_ERROR` if a field is missing (also `field: name` for an administrator account without name; the code is not consumed) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            403: components["responses"]["CsrfInvalid"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listEnvironments: {
        parameters: {
            query?: {
                status?: "ACTIVE" | "INACTIVE" | "ALL";
                /** @description First day the environment must be free */
                freeFrom?: string;
                /** @description Last day the environment must be free; requires `freeFrom` */
                freeTo?: string;
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of the environment list, ordered by code */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedEnvironments"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createEnvironment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /** @description Unique, e.g. "201". Only letters, digits, space and . _ / - (decided 2026-10-31, TAR-237); surrounding spaces are ignored; at least one character is not a space */
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
                    Location: components["headers"]["Location"];
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
            429: components["responses"]["TooManyRequests"];
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
            429: components["responses"]["TooManyRequests"];
        };
    };
    updateEnvironment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": {
                    /**
                     * Format: int64
                     * @description The `version` the client loaded. When the environment changed since, the answer is 409 CONCURRENT_MODIFICATION and nothing is saved (BE-SPR-DAT-13)
                     */
                    version: number;
                    /** @description Same rule as on creation */
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
            /** @description `ENVIRONMENT_CODE_TAKEN` (another environment already has that code, with `field: code`, RF-01) or `CONCURRENT_MODIFICATION` (the record changed while it was being edited, see the `ConcurrentModification` response) */
            409: {
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
                    } | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    deactivateEnvironment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description `ENVIRONMENT_OCCUPIED` (the environment has a contract in force or a stay, now or later, RN-12, RN-20) or `CONCURRENT_MODIFICATION` (see the `ConcurrentModification` response) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["EnvironmentOccupiedError"] | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    reactivateEnvironment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            409: components["responses"]["ConcurrentModification"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    getEnvironmentAccountStatus: {
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
            /** @description Status per period of the environment's current contract */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PeriodStatus"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listAdministrators: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The administrators */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example [
                     *       {
                     *         "id": "3f2b8c1e-7a4d-4e6b-9c0a-1d2e3f4a5b6c",
                     *         "name": "Rosa Quispe",
                     *         "documentType": "DNI",
                     *         "documentNumber": "*****678",
                     *         "email": "admin.uno@example.com",
                     *         "status": "ACTIVE",
                     *         "createdAt": "2026-01-15T14:00:00Z",
                     *         "self": true
                     *       },
                     *       {
                     *         "id": "8a7b6c5d-4e3f-4a1b-8c2d-3e4f5a6b7c8d",
                     *         "name": null,
                     *         "documentType": "CE",
                     *         "documentNumber": "******321",
                     *         "email": "admin.dos@example.com",
                     *         "status": "INACTIVE",
                     *         "createdAt": "2026-03-02T16:30:00Z",
                     *         "self": false
                     *       }
                     *     ]
                     */
                    "application/json": components["schemas"]["AdministratorSummary"][];
                };
            };
            401: components["responses"]["NoSession"];
            /** @description Not an administrator (`AUTH_FORBIDDEN`) or the session still has the password change pending (`AUTH_PASSWORD_CHANGE_REQUIRED`) */
            403: {
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
    createAdministrator: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdministratorInput"];
            };
        };
        responses: {
            /** @description Administrator created */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AdministratorCreated"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            /** @description Not an administrator (`AUTH_FORBIDDEN`), the session still has the password change pending (`AUTH_PASSWORD_CHANGE_REQUIRED`), or `currentPassword` is wrong (`AUTH_INVALID_CREDENTIALS` with `field: currentPassword`). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description `ACCOUNT_DOCUMENT_TAKEN` (the document already belongs to an account, administrator or guest, `field: documentNumber`), `ACCOUNT_EMAIL_TAKEN` (the email, case-insensitive, already belongs to an account, `field: email`; a guest contact email is not an account email, D-33) or `ADMIN_LIMIT_REACHED` (the maximum number of active administrators already exists; inactive administrators do not count) */
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
    deactivateAdministrator: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdministratorReauthentication"];
            };
        };
        responses: {
            /** @description Administrator deactivated; deactivating an inactive one changes nothing */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            /** @description Not an administrator (`AUTH_FORBIDDEN`), the session still has the password change pending (`AUTH_PASSWORD_CHANGE_REQUIRED`), or `currentPassword` is wrong (`AUTH_INVALID_CREDENTIALS` with `field: currentPassword`). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            404: components["responses"]["AdministratorNotFound"];
            /** @description `ADMIN_SELF_DEACTIVATION` (the target is the account of the session) or `LAST_ACTIVE_ADMIN` (deactivating it would leave no active administrator) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "LAST_ACTIVE_ADMIN",
                     *       "message": "No puedes desactivar al último administrador activo"
                     *     }
                     */
                    "application/json": components["schemas"]["AdministratorDeactivationConflictError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    reactivateAdministrator: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["AdministratorReauthentication"];
            };
        };
        responses: {
            /** @description Administrator reactivated; reactivating an active one changes nothing */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            /** @description Not an administrator (`AUTH_FORBIDDEN`), the session still has the password change pending (`AUTH_PASSWORD_CHANGE_REQUIRED`), or `currentPassword` is wrong (`AUTH_INVALID_CREDENTIALS` with `field: currentPassword`). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            404: components["responses"]["AdministratorNotFound"];
            /** @description `ADMIN_LIMIT_REACHED` (the maximum number of active administrators already exists; inactive administrators do not count) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    /**
                     * @example {
                     *       "code": "ADMIN_LIMIT_REACHED",
                     *       "message": "Ya hay 5 administradores, el máximo. Desactiva uno antes de crear otro."
                     *     }
                     */
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    listGuests: {
        parameters: {
            query?: {
                type?: "CONTRACT" | "TEMPORARY";
                /** @description CURRENT is every guest except the inactive ones (pending activation, onboarding and active) */
                status?: "CURRENT" | "PENDING_ACTIVATION" | "ONBOARDING" | "ACTIVE" | "INACTIVE" | "ALL";
                /** @description true: only guests without a contract in force, to choose one when loading a contract (A4.1, TAR-237) */
                withoutContract?: boolean;
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of the guest list, ordered by document type and number */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedGuests"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createGuest: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
                    Location: components["headers"]["Location"];
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
            /** @description `GUEST_INACTIVE` (the document belongs to an inactive guest, RN-12, RN-18), `GUEST_DOCUMENT_TAKEN` (the document belongs to an administrator account, D-34e) or `ACCOUNT_EMAIL_TAKEN` (the email, case-insensitive, is already the email of another account, administrator or guest, `field: email`; nothing is created, so the guest never ends up without its email in silence, RF-02, D-77, TAR-349) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestInactiveError"] | components["schemas"]["GuestDocumentTakenError"] | components["schemas"]["AccountEmailTakenError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
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
            429: components["responses"]["TooManyRequests"];
        };
    };
    updateGuest: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description `GUEST_DOCUMENT_LOCKED` (the document can only be corrected while the guest is pending activation, RN-36) or `GUEST_DOCUMENT_TAKEN` (the corrected document already belongs to another guest or to an administrator account, RN-18, D-34e), both with the `field` that caused it; or `CONCURRENT_MODIFICATION` (the record changed while it was being edited, see the `ConcurrentModification` response) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        code: "GUEST_DOCUMENT_LOCKED";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                        field: string;
                    } | {
                        /** @enum {string} */
                        code: "GUEST_DOCUMENT_TAKEN";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                        field: string;
                    } | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    deactivateGuest: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description `GUEST_HAS_ACTIVE_CONTRACT` (the guest has a contract in force; debt does not block, RN-12) or `CONCURRENT_MODIFICATION` (see the `ConcurrentModification` response) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestHasActiveContractError"] | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    reactivateGuest: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description `GUEST_HAS_PENDING_DEBT` (the guest owes periods; it is reactivated once they are paid, RN-25, RN-35) or `CONCURRENT_MODIFICATION` (see the `ConcurrentModification` response) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestHasPendingDebtError"] | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    listGuestStays: {
        parameters: {
            query?: {
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of the stays of the guest */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedStays"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createGuestStay: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StayInput"];
            };
        };
        responses: {
            /** @description Stay registered */
            201: {
                headers: {
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stay"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            /** @description `GUEST_NOT_ACTIVE` (the guest is not active, RN-35), `GUEST_NOT_TEMPORARY` (only temporary guests have stays), `STAY_OVERLAP` (the dates cross another stay of the guest) or `ENVIRONMENT_OCCUPIED` (the environment is taken in those dates by a contract or another stay, or it is inactive; message «El ambiente ya está ocupado en esas fechas», TAR-237) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestNotActiveError"] | components["schemas"]["GuestNotTemporaryError"] | components["schemas"]["StayOverlapError"] | components["schemas"]["EnvironmentOccupiedError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    updateGuestStay: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
                stayId: components["parameters"]["StayId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["StayUpdateInput"];
            };
        };
        responses: {
            /** @description Stay updated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Stay"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            /** @description `STAY_OVERLAP` (the new dates cross another stay of the guest), `ENVIRONMENT_OCCUPIED` (the environment is taken in the new dates, TAR-237) or `CONCURRENT_MODIFICATION` (see the `ConcurrentModification` response) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["StayOverlapError"] | components["schemas"]["EnvironmentOccupiedError"] | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    setGuestAccountEmail: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
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
            /** @description Account email saved (unchanged if it was already that one) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            /** @description `ACCOUNT_EMAIL_TAKEN` (the email, case-insensitive, already belongs to another account, `field: email`) or `GUEST_INACTIVE` (the guest is inactive, RN-12) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["AccountEmailTakenError"] | components["schemas"]["GuestInactiveError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    generateGuestAccess: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            /** @description `GUEST_INACTIVE` (the guest is inactive, RN-12, RN-18; `guestId` lets the administrator reactivate it, CU-28) or `CONCURRENT_MODIFICATION` (the guest row changed while the access was generated, see the `ConcurrentModification` response) */
            409: {
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
                    } | components["schemas"]["ConcurrentModificationError"];
                };
            };
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
            429: components["responses"]["TooManyRequests"];
        };
    };
    replaceGuestDocument: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
                documentId: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB, checked by content (RF-15); over 5 MB is a 400 DOCUMENT_INVALID_FILE, not a 413
                     */
                    file: string;
                    reason: components["schemas"]["DocumentActionReason"];
                    requestedAt?: components["schemas"]["DocumentRequestedAt"];
                    requestChannel?: components["schemas"]["DocumentRequestChannel"];
                    note?: components["schemas"]["DocumentActionNote"];
                };
            };
        };
        responses: {
            /** @description Document replaced; the response is the new document, with a new `id` */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestDocument"];
                };
            };
            /** @description `DOCUMENT_INVALID_FILE` (not JPG, PNG or PDF by content, over 5 MB, or an unknown multipart field, RF-15) or `VALIDATION_ERROR` with its `field`: `reason` missing or unknown; with `ARCO_REQUEST`, `requestedAt` or `requestChannel` missing; with `UPLOAD_ERROR`, `requestedAt` or `requestChannel` present; `requestedAt` after today (America/Lima); `note` over 500 characters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OriginCheckForbidden"];
            404: components["responses"]["GuestDocumentNotFound"];
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    deleteGuestDocument: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
                documentId: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["DocumentActionRequest"];
            };
        };
        responses: {
            /** @description File and row deleted, evidence entry recorded; or the document was already deleted, and its first evidence entry stays as it was */
            204: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            /** @description `VALIDATION_ERROR` with its `field`: `reason` missing or unknown; with `ARCO_REQUEST`, `requestedAt` or `requestChannel` missing; with `UPLOAD_ERROR`, `requestedAt` or `requestChannel` present; `requestedAt` after today (America/Lima); `note` over 500 characters; or an unknown property */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OriginCheckForbidden"];
            404: components["responses"]["GuestDocumentNotFound"];
            /** @description The `Content-Type` is not exactly `application/json` (`UNSUPPORTED_MEDIA_TYPE`) */
            415: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            /** @description The object was deleted from the storage but the transaction that deletes the row and writes the evidence failed; the row stays. Repeat the action: it is idempotent and completes */
            500: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    listGuestDocumentActions: {
        parameters: {
            query?: {
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of the document actions of the guest, newest first (empty if there is none) */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedGuestDocumentActions"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listGuestPaymentsByAdmin: {
        parameters: {
            query?: {
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Payment history page for the given guest */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedPayments"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    getGuestAccountStatusByAdmin: {
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
            /** @description Status per period of the given guest */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PeriodStatus"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listPayablePeriods: {
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
            /** @description Periods or stays that can receive a payment, or that have one pending or rejected */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PayablePeriod"][];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listContracts: {
        parameters: {
            query?: {
                status?: "ACTIVE" | "EXPIRED" | "TERMINATED";
                /** @description true: only ACTIVE contracts with 30 days or fewer to the end date, soonest first (implies status=ACTIVE; with another status the answer is 400 `VALIDATION_ERROR`) */
                expiringSoon?: boolean;
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Contract page */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedContracts"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createContract: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description PDF, ≤10MB, checked by content (RF-15)
                     */
                    file: string;
                    /** Format: uuid */
                    environmentId: string;
                    /** Format: uuid */
                    guestId: string;
                    /** @description In soles, greater than 0, at most two decimals */
                    monthlyAmount: number;
                    paymentDay: number;
                    graceDays: number;
                    /** Format: date */
                    startDate: string;
                    /**
                     * Format: date
                     * @description optional; omitted means an open-ended contract (RN-07); when present it must be after `startDate`
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
            /** @description `CONTRACT_INVALID_FILE` (not a PDF by content, or over 10 MB, RF-15), `CONTRACT_INVALID_DATES` (the end date is not after the start date, RF-03) or `VALIDATION_ERROR` (any other field, with its `field`) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            /** @description The environment (`ENVIRONMENT_NOT_FOUND`) or the guest (`GUEST_NOT_FOUND`) does not exist */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description `GUEST_NOT_ACTIVE` (the guest is not active, RN-35), `GUEST_NOT_CONTRACT` (only a guest of type CONTRACT takes a contract, the temporary one has stays, RN-13), `GUEST_HAS_PENDING_DEBT` (the guest owes periods, RN-25), `ENVIRONMENT_INACTIVE` (the environment is inactive and takes no new contract, RF-01) or `ENVIRONMENT_OCCUPIED` (the dates cross another contract not terminated or a stay of the environment, RN-20; a renewal that starts after the end of the contract in force is accepted, decided 2026-10-31). The check order is: guest state, guest type, debt, environment state, environment occupancy */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestNotActiveError"] | components["schemas"]["GuestNotContractError"] | components["schemas"]["GuestHasPendingDebtError"] | components["schemas"]["EnvironmentInactiveError"] | components["schemas"]["EnvironmentOccupiedError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
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
            /** @description Contract detail (never cacheable: it carries a freshly signed file URL, null if the storage could not sign it) */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Contract"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    terminateContract: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
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
                        /** @description PAID */
                        paymentsUpToDate: number;
                        /** @description UNDER_REVIEW */
                        paymentsUnderReview: number;
                        /** @description UNPAID, not yet overdue */
                        paymentsPending: number;
                        /** @description OVERDUE */
                        paymentsOverdue: number;
                        pendingVouchers: components["schemas"]["PaymentQueueItem"][];
                        pendingVouchersTotal: number;
                        /** @description One per active contract (its period of the current month) and per stay in force today; not paginated (a few dozen at most) */
                        charges: components["schemas"]["DashboardCharge"][];
                        overdue: components["schemas"]["DashboardOverdue"];
                        rejected: components["schemas"]["DashboardRejected"];
                        refunds: components["schemas"]["DashboardRefunds"];
                        expiringContracts: components["schemas"]["DashboardExpiringContracts"];
                        guestsNotActivated: components["schemas"]["DashboardGuestsNotActivated"];
                    };
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    getFinanceSummary: {
        parameters: {
            query: {
                /** @description Month to summarize, YYYY-MM with a year from 0001 to 9999 */
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
                        /** @example 2026-09 */
                        month: string;
                        /** @description incomeFromPayments + incomeFromFines - refundsTotal (RN-11, RN-39) */
                        totalIncome: number;
                        /** @description Approved contract and stay payments attributed to the month, by their verified amounts */
                        incomeFromPayments: number;
                        paymentsCount: number;
                        /** @description Fines of the month */
                        incomeFromFines: number;
                        finesCount: number;
                        /** @description Refunds dated in the month (RN-39) */
                        refundsTotal: number;
                        refundsCount: number;
                        totalExpenses: number;
                        expensesCount: number;
                        /** @description totalIncome - totalExpenses; negative when expenses are higher */
                        net: number;
                    };
                };
            };
            /** @description `VALIDATION_ERROR` with `field: month` when it is missing, not a YYYY-MM month or its year is 0000 */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    listPayments: {
        parameters: {
            query?: {
                status?: "PENDING" | "APPROVED" | "REJECTED";
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Payment queue page */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedPaymentQueue"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createDirectPayment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["DirectPaymentUpload"];
            };
        };
        responses: {
            /** @description Payment registered, status APPROVED immediately (RN-23), with each proof verified at its amount */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `VOUCHER_INVALID_FILE` (a file is not JPG, PNG or PDF by content, or is over 5 MB, RF-15; `field` names it, e.g. `proofs[1].file`) or `VALIDATION_ERROR` (any other field, with its `field`: amount, period, stayId, receivedOn, `proofs` when there are none, more than 5, or they do not cover what is due, `proofs[i].amount`, or both or neither of period and stayId) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OriginCheckForbidden"];
            /** @description The guest (`GUEST_NOT_FOUND`) or the stay (`STAY_NOT_FOUND`) does not exist */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description `GUEST_NOT_ACTIVE` (RN-35; a guest that is not active and does not owe that period), `PAYMENT_ALREADY_EXISTS_FOR_PERIOD` (an approved payment already exists for the period or the stay, RN-02) or `VOUCHER_ALREADY_EXISTS` (a payment is pending or rejected for it: complete it in `correctPaymentByAdmin`) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestNotActiveError"] | components["schemas"]["PaymentAlreadyExistsForPeriodError"] | components["schemas"]["VoucherAlreadyExistsError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getPayment: {
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
            /** @description Payment detail (never cacheable: it carries freshly signed voucher URLs) */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Payment"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    resolvePayment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
                    /** @description Required when status=REJECTED, not blank (RN-05); shown to the guest in the app only */
                    reason?: string;
                    /** @description Required when status=APPROVED: one entry per proof of the payment, with what the administrator verified (RN-16) */
                    proofs?: {
                        /** Format: uuid */
                        id: string;
                        /** @description In soles; 0 when the proof turned out to be worthless */
                        verifiedAmount: number;
                    }[];
                };
            };
        };
        responses: {
            /** @description Payment resolved (without the voucher URLs; ask `getPayment` for them) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `PAYMENT_REASON_REQUIRED` (empty reason on rejection, RN-05) or `VALIDATION_ERROR` (`field: proofs` when approving without the verified amount of every proof of the payment, or when their sum does not cover what is due) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            404: components["responses"]["NotFound"];
            /** @description `PAYMENT_ALREADY_RESOLVED` (the payment is already approved: another process resolved it first), `PAYMENT_ALREADY_EXISTS_FOR_PERIOD` (approving it would leave two approved payments for the same period or stay) or `PAYMENT_PERIOD_NOT_PAYABLE` (approving a payment whose period the contract no longer charges, because it was terminated or expired first; the payment can only be rejected with a reason) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentAlreadyResolvedError"] | components["schemas"]["PaymentAlreadyExistsForPeriodError"] | components["schemas"]["PaymentPeriodNotPayableError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
        };
    };
    correctPaymentByAdmin: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ProofsCorrection"];
            };
        };
        responses: {
            /** @description Proofs saved; the payment without the voucher URLs (ask `getPayment` for them) */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `VOUCHER_INVALID_FILE` (with the `field` of the file, RF-15) or `VALIDATION_ERROR` (`field: proofs` when there are none or more than 5, or `proofs[i].…`; an `id` that is not a proof of this payment is `proofs[i].id`) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["OriginCheckForbidden"];
            404: components["responses"]["NotFound"];
            /** @description `PAYMENT_NOT_CORRECTABLE` (the payment is already approved) or `CONCURRENT_MODIFICATION` (the payment changed meanwhile, for example the guest sent it again) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentNotCorrectableError"] | components["schemas"]["ConcurrentModificationError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    listExpenses: {
        parameters: {
            query: {
                month: string;
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of the expense list of the month, oldest first */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedExpenses"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createExpense: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Expense"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    deleteExpense: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            429: components["responses"]["TooManyRequests"];
        };
    };
    updateExpense: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["ExpenseUpdateInput"];
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
            409: components["responses"]["ConcurrentModification"];
            429: components["responses"]["TooManyRequests"];
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
            /** @description Fines of the month, not paginated */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Fine"][];
                };
            };
            /** @description `VALIDATION_ERROR` with `field: month` (missing, or not a YYYY-MM month) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createFine: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Fine"];
                };
            };
            /** @description `VALIDATION_ERROR` with its `field`: `guestId` missing or not a UUID, `amount` missing, not greater than 0, over 99999999.99 or with more than two decimals, `month` missing or not a YYYY-MM month, or `description` over 500 characters */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            /** @description The guest does not exist (`RESOURCE_NOT_FOUND`) */
            404: {
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
    deleteFine: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Fine deleted for good (RN-24) */
            204: {
                headers: {
                    [name: string]: unknown;
                };
                content?: never;
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            /** @description The fine does not exist (`RESOURCE_NOT_FOUND`) */
            404: {
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
    listRefunds: {
        parameters: {
            query: {
                month: string;
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description One page of the refunds of the month */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedRefunds"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    createRefund: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["RefundInput"];
            };
        };
        responses: {
            /** @description Refund registered; the month of its date is recalculated */
            201: {
                headers: {
                    Location: components["headers"]["Location"];
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Refund"];
                };
            };
            /** @description `VALIDATION_ERROR` with its `field`: `guestId`; `amount` (missing, not greater than 0, more than two decimals, or more than the pending credit of the guest); `date` (missing or in the future); `method` (missing, blank or over 50); `note` (over 500) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            /** @description The guest does not exist (`RESOURCE_NOT_FOUND`) */
            404: {
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
    listPendingCredits: {
        parameters: {
            query: {
                /** @description Only credit still to refund; `true` is the only value supported for now */
                pending: true;
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Pending credits, one per guest */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PendingCredit"][];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["Forbidden"];
            429: components["responses"]["TooManyRequests"];
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
    getOwnCredit: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own credit */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestCredit"];
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
            /** @description Own contracts (never cacheable: they carry freshly signed file URLs) */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        current: components["schemas"]["Contract"];
                        next: components["schemas"]["Contract"] | (never | null);
                    };
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
            query?: {
                /** @description Items per page, from 1 to 100. A value out of range is a 400 */
                limit?: components["parameters"]["Limit"];
                /** @description Opaque cursor: the `nextCursor` of the previous page. Absent for the first page. Do not build or edit it; a cursor that is not valid is a 400. Keyset pagination: the list keeps its order and the page starts right after the last item seen, so it costs the same on any page. */
                after?: components["parameters"]["After"];
            };
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own payment history page */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PagedGuestHistory"];
                };
            };
            400: components["responses"]["ValidationFailed"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    uploadPaymentVoucher: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["GuestPaymentUpload"];
            };
        };
        responses: {
            /** @description Payment sent, status PENDING */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `VOUCHER_INVALID_FILE` (a file is not JPG, PNG or PDF by content, or is over 5 MB, RF-15; `field` names it, e.g. `proofs[1].file`) or `VALIDATION_ERROR` (any other field, with its `field`: period, `proofs` when there are none or more than 5, `proofs[i].amount`, `proofs[i].fileIndex`) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            /** @description `VOUCHER_NO_ACTIVE_CONTRACT` (no active contract, RN-27), `AUTH_ONBOARDING_REQUIRED` (the onboarding is not complete, RN-33), `AUTH_PASSWORD_CHANGE_REQUIRED` (temporary password not changed, RF-12) or `AUTH_FORBIDDEN` (a guest of the other type, RN-09). On the multipart upload, `AUTH_FORBIDDEN` is also returned when the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin` (ADR-006). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        code: "VOUCHER_NO_ACTIVE_CONTRACT" | "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                    };
                };
            };
            /** @description `GUEST_NOT_ACTIVE` (RN-35), `PAYMENT_ALREADY_EXISTS_FOR_PERIOD` (the period is already approved, RN-02, D-28) or `VOUCHER_ALREADY_EXISTS` (a payment is pending for this period, RN-15, or rejected: correct it with `correctOwnPayment`) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestNotActiveError"] | components["schemas"]["PaymentAlreadyExistsForPeriodError"] | components["schemas"]["VoucherAlreadyExistsError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getOwnPayment: {
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
            /** @description The payment, with its proofs and reviews */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestPayment"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description No payment with that id belongs to this guest (`RESOURCE_NOT_FOUND`, RN-09) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    correctOwnPayment: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ProofsCorrection"];
            };
        };
        responses: {
            /** @description Payment sent again, status PENDING */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `VOUCHER_INVALID_FILE` (with the `field` of the file, RF-15) or `VALIDATION_ERROR` (`proofs` or `proofs[i].…`) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description No payment with that id belongs to this guest (`RESOURCE_NOT_FOUND`, RN-09) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description `PAYMENT_NOT_CORRECTABLE` (the payment is pending or approved, not rejected) or `GUEST_NOT_ACTIVE` (RN-35) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentNotCorrectableError"] | components["schemas"]["GuestNotActiveError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getOwnProfile: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own profile */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OwnProfile"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    updateOwnProfile: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            429: components["responses"]["TooManyRequests"];
        };
    };
    requestOwnEmailVerification: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerificationInput"];
            };
        };
        responses: {
            /** @description Code sent; the email is pending until its code is confirmed */
            202: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["EmailVerificationRefused"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            409: components["responses"]["AccountEmailTaken"];
            429: components["responses"]["EmailVerificationCooldown"];
        };
    };
    confirmOwnEmailVerification: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerificationConfirmation"];
            };
        };
        responses: {
            /** @description Email changed */
            204: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["EmailVerificationRefused"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            409: components["responses"]["AccountEmailTaken"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    uploadOwnDocument: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB, checked by content (RF-15)
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Document stored; it appears in `documents` of the own profile */
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
            /** @description `AUTH_ONBOARDING_REQUIRED` (the onboarding is not complete, RN-33), `AUTH_PASSWORD_CHANGE_REQUIRED` (temporary password not changed, RF-12) or `AUTH_FORBIDDEN` (a TEMPORARY guest, RN-09). On the multipart upload, `AUTH_FORBIDDEN` is also returned when the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin` (ADR-006). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        code: "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                    };
                };
            };
            /** @description `DOCUMENT_LIMIT_REACHED` (the guest already has 5 files, RN-37) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getOwnDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The document with its signed link */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestDocument"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description The document is not one of the session's guest (`RESOURCE_NOT_FOUND`) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
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
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
    requestOnboardingEmailVerification: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerificationInput"];
            };
        };
        responses: {
            /** @description Code sent; the email is pending until its code is confirmed */
            202: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["EmailVerificationRefused"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
            409: components["responses"]["AccountEmailTaken"];
            429: components["responses"]["EmailVerificationCooldown"];
        };
    };
    confirmOnboardingEmailVerification: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerificationConfirmation"];
            };
        };
        responses: {
            /** @description Email changed */
            204: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["EmailVerificationRefused"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["OnboardingAccessDenied"];
            409: components["responses"]["AccountEmailTaken"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    uploadOnboardingDocument: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB, checked by content (RF-15)
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
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
                    "application/json": components["schemas"]["StayPaymentStatus"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description The guest has no stay yet (`RESOURCE_NOT_FOUND`) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    uploadTemporaryVoucher: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["StayPaymentUpload"];
            };
        };
        responses: {
            /** @description Payment sent, status PENDING */
            201: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `VOUCHER_INVALID_FILE` (a file is not JPG, PNG or PDF by content, or is over 5 MB, RF-15; `field` names it) or `VALIDATION_ERROR` (`proofs` when there are none or more than 5, `proofs[i].amount`, `proofs[i].fileIndex`) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            /** @description `VOUCHER_NO_ACTIVE_STAY` (the guest has no stay in force or coming, CU-22), `AUTH_ONBOARDING_REQUIRED` (the onboarding is not complete, RN-33), `AUTH_PASSWORD_CHANGE_REQUIRED` (temporary password not changed, RF-12) or `AUTH_FORBIDDEN` (a guest of the other type, RN-09). On the multipart upload, `AUTH_FORBIDDEN` is also returned when the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin` (ADR-006). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        code: "VOUCHER_NO_ACTIVE_STAY" | "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                    };
                };
            };
            /** @description `GUEST_NOT_ACTIVE` (RN-35), `PAYMENT_ALREADY_EXISTS_FOR_PERIOD` (the stay is already paid, RN-03) or `VOUCHER_ALREADY_EXISTS` (a payment is pending for the stay, RN-03, RN-15, or rejected: correct it with `correctOwnPaymentTemporary`) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestNotActiveError"] | components["schemas"]["PaymentAlreadyExistsForPeriodError"] | components["schemas"]["VoucherAlreadyExistsError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getOwnPaymentTemporary: {
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
            /** @description The payment, with its proofs and reviews */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestPayment"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description No payment with that id belongs to this guest (`RESOURCE_NOT_FOUND`, RN-09) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
        };
    };
    correctOwnPaymentTemporary: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path: {
                id: components["parameters"]["Id"];
            };
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": components["schemas"]["ProofsCorrection"];
            };
        };
        responses: {
            /** @description Payment sent again, status PENDING */
            200: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentSummary"];
                };
            };
            /** @description `VOUCHER_INVALID_FILE` (with the `field` of the file, RF-15) or `VALIDATION_ERROR` (`proofs` or `proofs[i].…`) */
            400: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description No payment with that id belongs to this guest (`RESOURCE_NOT_FOUND`, RN-09) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            /** @description `PAYMENT_NOT_CORRECTABLE` (the payment is pending or approved, not rejected) or `GUEST_NOT_ACTIVE` (RN-35) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["PaymentNotCorrectableError"] | components["schemas"]["GuestNotActiveError"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getOwnProfileTemporary: {
        parameters: {
            query?: never;
            header?: never;
            path?: never;
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description Own profile */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["OwnProfile"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
        };
    };
    updateOwnProfileTemporary: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
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
            429: components["responses"]["TooManyRequests"];
        };
    };
    requestOwnTemporaryEmailVerification: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerificationInput"];
            };
        };
        responses: {
            /** @description Code sent; the email is pending until its code is confirmed */
            202: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["EmailVerificationRefused"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            409: components["responses"]["AccountEmailTaken"];
            429: components["responses"]["EmailVerificationCooldown"];
        };
    };
    confirmOwnTemporaryEmailVerification: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "application/json": components["schemas"]["EmailVerificationConfirmation"];
            };
        };
        responses: {
            /** @description Email changed */
            204: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content?: never;
            };
            400: components["responses"]["EmailVerificationRefused"];
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            409: components["responses"]["AccountEmailTaken"];
            429: components["responses"]["TooManyRequests"];
        };
    };
    uploadTemporaryOwnDocument: {
        parameters: {
            query?: never;
            header: {
                /** @description CSRF token read from the XSRF-TOKEN cookie by Angular HttpClient. Obtain the cookie via GET /auth/csrf before an unsafe request. Cookie and header must match. Read the current cookie for every request; do not persist or cache the token across authentication transitions. The token does not authenticate the caller. */
                "X-XSRF-TOKEN": components["parameters"]["XsrfToken"];
            };
            path?: never;
            cookie?: never;
        };
        requestBody: {
            content: {
                "multipart/form-data": {
                    /**
                     * Format: binary
                     * @description JPG/PNG/PDF, ≤5MB, checked by content (RF-15)
                     */
                    file: string;
                };
            };
        };
        responses: {
            /** @description Document stored; it appears in `documents` of the own profile */
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
            /** @description `AUTH_ONBOARDING_REQUIRED` (the onboarding is not complete, RN-33), `AUTH_PASSWORD_CHANGE_REQUIRED` (temporary password not changed, RF-12) or `AUTH_FORBIDDEN` (a CONTRACT guest, RN-09). On the multipart upload, `AUTH_FORBIDDEN` is also returned when the request carries neither an `Origin` header nor `Sec-Fetch-Site: same-origin` (ADR-006). AUTH_CSRF_INVALID when the CSRF cookie/header pair is missing or invalid. This check can reject the request before authentication or business validation; a valid token does not replace authorization. */
            403: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": {
                        /** @enum {string} */
                        code: "AUTH_ONBOARDING_REQUIRED" | "AUTH_PASSWORD_CHANGE_REQUIRED" | "AUTH_FORBIDDEN" | "AUTH_CSRF_INVALID";
                        /** @description User-facing message, in Spanish, ready to display in the UI */
                        message: string;
                    };
                };
            };
            /** @description `DOCUMENT_LIMIT_REACHED` (the guest already has 5 files, RN-37) */
            409: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
    getTemporaryOwnDocument: {
        parameters: {
            query?: never;
            header?: never;
            path: {
                documentId: components["parameters"]["DocumentId"];
            };
            cookie?: never;
        };
        requestBody?: never;
        responses: {
            /** @description The document with its signed link */
            200: {
                headers: {
                    "Cache-Control": "no-store";
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["GuestDocument"];
                };
            };
            401: components["responses"]["NoSession"];
            403: components["responses"]["GuestAccessDenied"];
            /** @description The document is not one of the session's guest (`RESOURCE_NOT_FOUND`) */
            404: {
                headers: {
                    [name: string]: unknown;
                };
                content: {
                    "application/json": components["schemas"]["Error"];
                };
            };
            429: components["responses"]["TooManyRequests"];
            503: components["responses"]["FileStorageUnavailable"];
        };
    };
}
