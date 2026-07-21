# Search & Earn Bot — Bot specification

**Archetype:** custom

**Voice:** friendly and encouraging — write every user-facing message, button label, error, and empty state in this voice.

A Telegram bot offering fast content search and a referral program where users earn $0.01 per valid referral (24h retention). Admin manually reviews withdrawal requests and handles payouts via specified methods.

> This is the complete contract for the bot. Implement EVERY entry point, flow, feature, integration, and edge case below. The completeness review checks the bot against this document after each build pass.

## Primary audience

- Telegram users seeking searchable content
- Users interested in passive referral earnings

## Success criteria

- Users receive search results within 2 seconds
- Referral links generate at least 1000 active users in 30 days
- Admin processes withdrawals within 48 hours

## Entry points

Every feature must be reachable from the bot's command/button surface (button-first; only /start and /help are slash commands).

- **/start** (command, actor: user, command: /start) — Register user, display balance, and show main menu with referral link
- **/search** (command, actor: user, command: /search) — Prompt for search query and return results
- **/profile** (command, actor: user, command: /profile) — Display user profile with balance, referral stats, and dark/light toggle
- **/referral** (command, actor: user, command: /referral) — Show referral link and statistics
- **/balance** (command, actor: user, command: /balance) — Display real-time balance breakdown
- **/withdraw** (command, actor: user, command: /withdraw) — Initiate withdrawal request flow
- **/help** (command, actor: user, command: /help) — List available commands and rules
- **Approve Withdrawal** (button, actor: admin, callback: admin:approve_withdrawal) — Admin action to approve and record payout
- **Reject Withdrawal** (button, actor: admin, callback: admin:reject_withdrawal) — Admin action to reject withdrawal request

## Flows

### Referral Earnings Flow
_Trigger:_ /referral

1. Display referral link and code
2. Track new users via referral code
3. Mark referral as pending
4. Check 24h retention and fraud flags
5. Credit $0.01 if valid

_Data touched:_ User, Referral record

### Withdrawal Request Flow
_Trigger:_ /withdraw

1. Collect withdrawal amount
2. Validate $10-$500 range
3. Collect payment method (USDT/PayPal/Bank)
4. Submit request to admin
5. Admin reviews and marks as paid

_Data touched:_ Withdrawal request

### Search Flow
_Trigger:_ /search

1. Prompt for query
2. Return search results
3. Save query to history

_Data touched:_ Search entry, User

### Admin Dashboard Flow
_Trigger:_ admin:approve_withdrawal

1. Display withdrawal details
2. Record admin approval
3. Update user balance

_Data touched:_ Withdrawal request, User

## Data entities

Durable data (must survive a restart) uses the toolkit's persistent store, never in-memory maps.

- **User** _(retention: persistent)_ — Registered user with referral and search tracking
  - fields: id, username, referral_code, registration_time, balance, search_history, referrals
- **Referral record** _(retention: persistent)_ — Tracking of referral relationships and status
  - fields: referrer_id, referred_user_id, timestamp, status
- **Search entry** _(retention: persistent)_ — User search queries and results metadata
  - fields: user_id, query, timestamp, result_metadata
- **Withdrawal request** _(retention: persistent)_ — User withdrawal requests and admin tracking
  - fields: id, user_id, amount, method, details, status, created_at, admin_notes

## Integrations

- **Telegram** (required) — Bot API messaging and inline keyboard interactions
Call external APIs against their real contract (correct endpoints, ids, params); credentials from env. Do not fake responses.

## Owner controls

- View user list and referral stats
- Approve/reject withdrawals
- Mark referrals as fraudulent
- Export action logs

## Notifications

- New withdrawal requests sent to @CHARLIES801
- Fraudulent referral alerts sent to @CHARLIES801

## Permissions & privacy

- Store user search history for 1 year
- Track referral relationships with IP/device metadata
- Admin has access to withdrawal details and action logs

## Edge cases

- Users attempting self-referral
- Multiple referrals from same IP/device
- Withdrawal amounts below $10 or above $500
- Users leaving within 24 hours of referral

## Required tests

- Verify referral credits after 24h retention
- Validate withdrawal amount limits
- Test admin approval workflow
- Confirm search history persistence

## Assumptions

- Referral links use t.me format with bot username
- Search results default to general content index
- Balances tracked in USD cents
- Admin manually records payout completion
