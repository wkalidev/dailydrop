;; DailyDrop - Clarity (Stacks / Bitcoin L2)
;; Daily check-in on-chain. 7-day streak = 10 DROP tokens.
;; Author: wkalidev

;; --- Fungible Token ---
(define-fungible-token DROP)

;; --- Constants ---
(define-constant BLOCKS-PER-DAY u144)
(define-constant BLOCKS-RESET (* BLOCKS-PER-DAY u2))
(define-constant STREAK-TARGET u7)
(define-constant REWARD-AMOUNT u10000000)

;; --- Error codes ---
(define-constant ERR-TOO-SOON     (err u101))
(define-constant ERR-NOT-OWNER    (err u102))
(define-constant ERR-STREAK-LOW   (err u103))
(define-constant ERR-ZERO-ADDRESS (err u104))

;; --- Data maps ---
(define-map user-streak
    principal
    {
        streak:         uint,
        last-checkin:   uint,
        total-checkins: uint
    }
)

;; --- Owner ---
(define-data-var contract-owner principal tx-sender)

;; --- Read-only ---

(define-read-only (get-streak (user principal))
    (default-to u0 (get streak (map-get? user-streak user)))
)

(define-read-only (get-last-checkin (user principal))
    (default-to u0 (get last-checkin (map-get? user-streak user)))
)

(define-read-only (get-total-checkins (user principal))
    (default-to u0 (get total-checkins (map-get? user-streak user)))
)

(define-read-only (can-checkin (user principal))
    (let ((last (get-last-checkin user)))
        (or (is-eq last u0) (>= block-height (+ last BLOCKS-PER-DAY)))
    )
)

(define-read-only (get-user-data (user principal))
    (let (
        (data (default-to { streak: u0, last-checkin: u0, total-checkins: u0 } (map-get? user-streak user)))
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

;; --- Check-in ---

(define-public (check-in)
    (let (
        (caller        tx-sender)
        (current-block block-height)
        (existing      (default-to { streak: u0, last-checkin: u0, total-checkins: u0 } (map-get? user-streak caller)))
        (last          (get last-checkin existing))
        (cur-streak    (get streak existing))
        (cur-total     (get total-checkins existing))
    )
        (asserts!
            (or (is-eq last u0) (>= current-block (+ last BLOCKS-PER-DAY)))
            ERR-TOO-SOON
        )
        (let (
            (new-streak
                (if (and (> last u0) (> current-block (+ last BLOCKS-RESET)))
                    u1
                    (+ cur-streak u1)
                )
            )
            (should-reward (>= new-streak STREAK-TARGET))
        )
            ;; Update base streak data first
            (map-set user-streak caller
                { 
                    streak: (if should-reward u0 new-streak),  ;; Reset after reward
                    last-checkin: current-block, 
                    total-checkins: (+ cur-total u1) 
                }
            )
            
            (if should-reward
                (begin
                    (try! (ft-mint? DROP REWARD-AMOUNT caller))
                    (print { event: "reward-claimed", user: caller, amount: REWARD-AMOUNT, streak: new-streak, block: current-block })
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

;; --- Claim reward manually ---

(define-public (claim-reward)
    (let (
        (caller     tx-sender)
        (existing   (default-to { streak: u0, last-checkin: u0, total-checkins: u0 } (map-get? user-streak caller)))
        (cur-streak (get streak existing))
    )
        (asserts! (>= cur-streak STREAK-TARGET) ERR-STREAK-LOW)
        (map-set user-streak caller (merge existing { streak: u0 }))
        (try! (ft-mint? DROP REWARD-AMOUNT caller))
        (print { event: "reward-claimed", user: caller, amount: REWARD-AMOUNT })
        (ok REWARD-AMOUNT)
    )
)

;; --- Owner: mint initial supply ---

(define-public (mint-initial (recipient principal) (amount uint))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (ft-mint? DROP amount recipient)
    )
)

;; --- SIP-010 helpers ---

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

;; --- Cross-chain relayer ---

(define-map authorized-relayers principal bool)

(define-public (set-relayer (relayer principal) (active bool))
    (begin
        (asserts! (is-eq tx-sender (var-get contract-owner)) ERR-NOT-OWNER)
        (map-set authorized-relayers relayer active)
        (ok true)
    )
)

(define-public (update-streak-from-relayer
    (user principal)
    (new-streak uint)
    (source-chain (string-ascii 16))
)
    (let ((caller tx-sender))
        (asserts!
            (default-to false (map-get? authorized-relayers caller))
            ERR-NOT-OWNER
        )
        (let (
            (existing (default-to { streak: u0, last-checkin: u0, total-checkins: u0 } (map-get? user-streak user)))
        )
            (map-set user-streak user (merge existing { streak: new-streak }))
            (print { event: "relayer-update", user: user, streak: new-streak, chain: source-chain })
            (ok true)
        )
    )
)
