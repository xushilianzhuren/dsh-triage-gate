/**
 * dsh-triage-gate · Two-stage event triage gate (host plugin, zero-dep)
 *
 * Engineering contract for the Fast Path / Slow Path event filtering from
 * the Super-agent architecture: deterministic code rules kill most noise
 * (fast, free), only candidates reach the LLM semantic layer (slow, smart).
 *
 * Host HTTP API (webServer pattern, zero deps):
 *   GET  /triage/api?act=rules                      -> current rule table
 *   POST /triage/api?act=triage  body={source,from,text}  -> verdict:
 *        {action:"ignore"|"candidate"|"act", stage:"fast"|"slow", reason}
 */
export const name = 'triage-gate'
export const inject = ['webServer']

// Fast Path: deterministic rules, evaluated in order. First match wins.
const DEFAULT_RULES = [
  { when: { source: ['spam', 'ad'] }, action: 'ignore', stage: 'fast', reason: 'spam source' },
  { when: { text: /(测试|test)\b/i }, action: 'ignore', stage: 'fast', reason: 'test message' },
  { when: { from: 'whitelist' }, action: 'act', stage: 'fast', reason: 'whitelisted sender' },
  { when: { text: /(求助|报错|bug|修复|问题)/i }, action: 'candidate', stage: 'slow', reason: 'possible work request — needs semantic check' },
]
// Everything unmatched -> candidate (Slow Path decides).

export function apply(ctx) {
  const cfg = (ctx.config && ctx.config['triage-gate']) || {}
  const rules = cfg.rules || DEFAULT_RULES
  const whitelist = new Set(cfg.whitelist || [])
  const web = ctx['webServer']

  web.registerHttpHandler('/triage/api', async (req) => {
    const url = new URL(req.url, 'http://x')
    if (url.searchParams.get('act') === 'rules') return { ok: true, rules }
    if (url.searchParams.get('act') !== 'triage') return { ok: false, error: 'unknown act; use rules|triage' }
    let body = {}
    try { body = await req.json() } catch (e) {}
    const ev = {
      source: String(body.source || '').toLowerCase(),
      from: String(body.from || ''),
      text: String(body.text || ''),
    }
    for (const rule of rules) {
      const w = rule.when || {}
      let hit = true
      if (w.source && !w.source.includes(ev.source)) hit = false
      if (hit && w.from === 'whitelist' && !whitelist.has(ev.from)) hit = false
      if (hit && w.text && !w.text.test(ev.text)) hit = false
      if (hit) return { ok: true, action: rule.action, stage: rule.stage, reason: rule.reason, matched: rule }
    }
    return { ok: true, action: 'candidate', stage: 'slow', reason: 'no fast-path rule matched — send to semantic layer' }
  })
}
