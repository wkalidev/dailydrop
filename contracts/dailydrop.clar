;; ============================================================
;; DailyDrop — Clarity (Stacks / Bitcoin L2)
;; Check-in quotidien on-chain. Streak 7 jours = 10 DROP tokens.
;;
;; Compatibilité : Stacks 2.1+
;; Auteur        : wkalidev
;; ============================================================

;; ─── Fungible Token ──────────────────────────────────────────
(define-fungible-token DROP)

;; ─── Constants ───────────────────────────────────────────────
;; ~144 blocs Bitcoin par jour (1 bloc ≈ 10 min)
(define-constant BLOCKS-PER-DAY u144)
;; Fenêtre max avant reset du streak : 2 jours
(define-constant BLOCKS-RESET (* BLOCKS-PER-DAY u2))
;; Streak cible
(define-constant STREAK-TARGET u7)
;; Récompense : 10 DROP (6 décimales)
(define-constant REWARD-AMOUNT u10000000)

;; ─── Error codes ──────────────────────────────────────────────
(define-constant ERR-TOO-SOON       (err u101))
(define-constant ERR-NOT-OWNER      (err u102))
(define-constant ERR-STREAK-LOW     (err u103))
(define-constant ERR-ZERO-ADDRESS   (err u104))

;; ─── Data maps ────────────────────────────────────────────────
(define-map user-streak
    principal
    {
        streak:          uint,
        last-checkin:    uint,   ;; block-height du dernier check-in
        total-checkins:  uint
    }
)

;; ─── Owner (pour mintInitial) ─────────────────────────────────
(define-data-var contract-owner principal tx-sender)

;; ─── Read-only helpers ────────────────────────────────────────

(define-read-only (get-streak (user principal))
    (default-to u0
        (get streak (map-get? user-streak user))
    )
)

(define-read-only (get-last-checkin (user principal))
    (default-to u0
        (get last-checkin (map-get? user-streak user))
    )
)

(define-read-only (get-total-checkins (user principal))
    (default-to u0
        (get total-checkins (map-get? user-streak user))
    )
)

(define-read-only (can-checkin (user principal))
    (let (
        (last (get-last-checkin user))
    )
        (or
            (is-eq last u0)
            (>= block-height (+ last BLOCKS-PER-DAY))
        )
    )
)

(define-read-only (get-user-data (user principal))
    (let (
        (data (default-to
                   { streak: u0, last-checkin: u0, total-checkins: u0 }
                   (map-get? user-streak user)
               ))
        (last (get last-checkin data))
    )
        {
            streak:         (get streak data),
            last-checkin:   last,
            total-checkins: (get total-checkins data),
            can-checkin:    (or (is-eq last u0) (>= block-height (+ last BLOCKS-PER-DAY))),
            can-claim:      (>= (get streak data) STREAK-TARGET),
            next-checkin:   (if (is-eq last u0) u0 (+ last BLOCKS-PER-DAY))
        }
    )
)

;; ─── Check-in ─────────────────────────────────────────────────

(define-public (check-in)
    (let (
        (caller      tx-sender)
        (current-block block-height)
        (existing    (default-to
                         { streak: u0, last-checkin: u0, total-checkins: u0 }
                         (map-get? user-streak caller)
                     ))
        (last        (get last-checkin existing))
        (cur-streak  (get streak existing))
        (cur-total   (get total-checkins existing))
    )
        ;; Vérifier le délai minimum (24h en blocs)
        (asserts!
            (or (is-eq last u0) (>= current-block (+ last BLOCKS-PER-DAY)))
            ERR-TOO-SOON
        )

        ;; Calculer le nouveau streak
        ;; Si > 48h (BLOCKS-RESET) depuis dernier check-in → reset à 1
        ;; Sinon → incrément
        (let (
            (new-streak
                (if (and (> last u0) (> current-block (+ last BLOCKS-RESET)))
                    u1      ;; streak cassé, on repart à 1 (ce check-in compte)
                    (+ cur-streak u1)
                )
            )
        )
            ;; Persister
            (map-set user-streak caller
                {
                    streak:         new-streak,
                    last-checkin:   current-block,
                    total-checkins: (+ cur-total u1)
                }
            )

            ;; Si streak atteint : auto-claim + reset
            (if (>= new-streak STREAK-TARGET)
                (begin
                    ;; Reset le streak
                    (map-set user-streak caller
                        {
                            streak:         u0,
                            last-checkin:   current-block,
                            total-checkins: (+ cur-total u1)
                        }
                    )
                    ;; Mint la récompense
                    (try! (ft-mint? DROP REWARD-AMOUNT caller))
                    (print { event: "reward-claimed", user: caller, amount: REWARD-AMOUNT, block: current-block })
                    (ok { action: "claimed", streak: u0, reward: REWARD-AMOUNT })
                )
                (begin
                    (print { event: "check-in", user: caller, streak: new-streak, block: current-block })
                    (ok { action: "checked-in", streak: new-streak, reward: u0 })
                )
            )
        )
    )
)

;; ─── Claim manuel (si besoin) ─────────────────────────────────
;; Séparé pour compatibilité avec le frontend existant

(define-public (claim-reward)
    (let (
        (caller     tx-sender)
        (existing   (default-to
                        { streak: u0, last-checkin: u0, total-checkins: u0 }
                        (map-get? user-streak caller)
                    ))
        (cur-streak (get streak existing))
    )
        (asserts! (>= cur-streak STREAK-TARGET) ERR-STREAK-LOW)

        ;; Reset streak
        (map-set user-streak caller
            (merge existing { streak: u0 })
        )

        ;; Mint
        (try! (ft-mint? DROP REWARD-AMOUNT caller))
        (print { event: "reward-claimed", user: caller, amount: REWARD-AMOUNT })
        (ok REWARD-AMOUNT)
    )
)

;; ─── Owner : mint initial (liquidité) ────────────────────────

(define-public (mint-initial (recipient principal) (amount uint))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (ft-mint? DROP amount recipient)
    )
)

;; ─── SIP-010 helpers ──────────────────────────────────────────

(define-read-only (get-balance (account principal))
    (ok (ft-get-balance DROP account))
)

(define-read-only (get-total-supply)
    (ok (ft-get-supply DROP))
)

(define-read-only (get-name)
    (ok "DailyDrop")
)

(define-read-only (get-symbol)
    (ok "DROP")
)

(define-read-only (get-decimals)
    (ok u6)
)

(define-read-only (get-token-uri)
    (ok (some u"https://dailydrop-five.vercel.app/token-metadata"))
)

;; ─── Relayer cross-chain ──────────────────────────────────────
;; Appelé par un relayer autorisé pour synchroniser depuis Base

(define-map authorized-relayers principal bool)

(define-public (set-relayer (relayer principal) (active bool))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (map-set authorized-relayers relayer active)
        (ok true)
    )
)

;; Mise à jour du streak depuis le relayer cross-chain
(define-public (update-streak-from-relayer
    (user principal)
    (new-streak uint)
    (source-chain (string-ascii 16))
)
    (let (
        (caller tx-sender)
    )
        (asserts!
            (default-to false (map-get? authorized-relayers caller))
            ERR-NOT-OWNER
        )
        (let (
            (existing (default-to
                           { streak: u0, last-checkin: u0, total-checkins: u0 }
                           (map-get? user-streak user)
                       ))
        )
            (map-set user-streak user
                (merge existing { streak: new-streak })
            )
            (print { event: "relayer-update", user: user, streak: new-streak, chain: source-chain })
            (ok true)
        )
    )
)
