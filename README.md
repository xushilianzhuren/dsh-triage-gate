# dsh-triage-gate

**Two-stage event triage gate** — the engineering contract for Fast Path /
Slow Path filtering in event-driven agent systems.

## How it works

1. **Fast Path (deterministic rules, free & instant)**: whitelist / source /
   keyword rules kill most noise before any model call.
2. **Slow Path (semantic layer)**: unmatched candidates go to the LLM with
   your prompt-defined policy.

Verdict per event: `ignore` / `candidate` / `act`, with the stage and reason
attached — so your agent knows whether the decision was made by code or
needs a model pass.

## Use

```bash
dsh plugin add github:<owner>/dsh-triage-gate
curl "http://127.0.0.1:<port>/triage/api?act=rules"
curl -X POST "http://127.0.0.1:<port>/triage/api?act=triage" \
  -H 'content-type: application/json' \
  -d '{"source":"im","from":"alice","text":"报错了帮忙看看"}'
```

Rules are configurable via plugin config (`rules` array, evaluated in order,
first match wins). Unmatched events default to `candidate` (semantic layer).
