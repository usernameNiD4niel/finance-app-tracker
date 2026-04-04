# Stripe Test Cards

Use these card numbers in the payment sheet during development. Any future expiry date and any 3-digit CVC are accepted.

## Accepted Cards

| Card Number | Brand | Notes |
|---|---|---|
| 4242 4242 4242 4242 | Visa | Default success |
| 4000 0566 5566 5556 | Visa (debit) | Success |
| 5555 5555 5555 4444 | Mastercard | Success |
| 2223 0031 2200 3222 | Mastercard (2-series) | Success |
| 3782 822463 10005 | American Express | Success (4-digit CVC) |
| 6011 1111 1111 1117 | Discover | Success |
| 4000 0025 0000 3155 | Visa | Requires 3D Secure authentication |
| 4000 0027 6000 3184 | Visa | 3D Secure 2 — authenticated |

## Declined Cards

| Card Number | Brand | Decline Reason |
|---|---|---|
| 4000 0000 0000 0002 | Visa | Generic decline |
| 4000 0000 0000 9995 | Visa | Insufficient funds |
| 4000 0000 0000 9987 | Visa | Lost card |
| 4000 0000 0000 9979 | Visa | Stolen card |
| 4000 0000 0000 0069 | Visa | Expired card |
| 4000 0000 0000 0127 | Visa | Incorrect CVC |
| 4000 0000 0000 0119 | Visa | Processing error |
| 4242 4242 4242 4241 | Visa | Incorrect number |

## Usage

- **Expiry:** Any future date (e.g. `12/34`)
- **CVC:** Any 3 digits (e.g. `123`), except Amex which uses 4 digits (e.g. `1234`)
- **ZIP:** Any 5 digits (e.g. `12345`)

> These cards only work with Stripe **test mode** keys (`pk_test_...`). They will not work in production.
