# Resilient Email Sending Service

## Features

- Retry with exponential backoff
- Fallback between two mock providers
- Idempotency via unique email IDs
- Rate limiting (configurable)
- Status event tracking
- Circuit breaker for providers
- Simple logging
- Basic queue for requests

## Setup & Run

1. Clone the repo
2. Run `npm install` (if you add any dependencies)
3. Run `npm start` to execute example usage

## Assumptions

- Idempotency uses in-memory Set (reset on restart)
- Rate limiting is per instance, not distributed
- Mock providers simulate failures randomly

## To Do

- Add unit tests (Jest/Mocha)
- Wrap with Express API for deployment
- Add persistent storage for idempotency & status
