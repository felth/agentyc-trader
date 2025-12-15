# IBKR Cookie Extraction - Execution Summary

## Problem Statement

- Session API v2 returns only `JSESSIONID` (synthetic, from logs)
- Direct cookie test fails: "Access Denied"
- IBeam cookie DB not found (Chrome profile doesn't exist)
- Need REAL cookies from Selenium WebDriver to authenticate Gateway requests

**Key Insight:** We must extract cookies directly from Selenium, not from file system.

---

## Step-by-Step Execution Plan

### ✅ Step 1: Verify Gateway Auth (Inside Container)

**Command:**
```bash
chmod +x scripts/infra/step1_verify_gateway_auth.sh
sudo scripts/infra/step1_verify_gateway_auth.sh
```

**Purpose:** Confirm Gateway is actually authenticated before chasing cookies.

**Expected:**
- If `authenticated=true` → Proceed to Step 2
- If `authenticated=false` → Fix login stability first

---

### ✅ Step 2: Pause IBeam Retries

**Command:**
```bash
chmod +x scripts/infra/step2_pause_ibeam.sh
sudo scripts/infra/step2_pause_ibeam.sh
```

**Purpose:** Stop repeated login attempts that trigger IBKR auth prompts.

**Recommendation:** Stop IBeam container entirely during cookie extraction testing.

---

### ✅ Step 3: Extract Real Cookies from Selenium

**Reference:** `scripts/infra/step3_ibeam_cookie_dump_modification.md`

**Steps:**
1. Find IBeam source code location (inside container or on host)
2. Add `dump_authenticated_cookies()` function
3. Hook it to run after successful authentication
4. Trigger login and retrieve `/srv/outputs/authenticated_cookies.json`

**Expected Output:**
```json
{
  "cookie_names": ["JSESSIONID", "other_cookie", "another_cookie", ...],
  "cookie_name_value_pairs": {
    "JSESSIONID": "abc123...",
    "other_cookie": "xyz789...",
    ...
  },
  "gateway_cookie_names": [...]
}
```

---

### ⏸️ Step 4: Update Session API v2 (After Step 3)

**Only proceed once Step 3 yields `authenticated_cookies.json`.**

**Changes needed:**
- Read from `/srv/outputs/authenticated_cookies.json` (or copy to accessible location)
- Return ALL cookies, not just JSESSIONID
- Update `/session-cookies` endpoint
- Test `/test-gateway` → should return 200 OK

---

### ⏸️ Step 5: Integrate Bridge (After Step 4)

**Only proceed once `/test-gateway` returns 200 OK.**

Then:
- Update Bridge `ib_get()` to fetch cookies from Session API
- Use persistent httpx client with cookies
- Test Bridge `/account` endpoint

---

## Quick Reference: Diagnostic Commands

### Test Gateway Auth from Inside Container

```bash
# Auth status
docker exec -it ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/iserver/auth/status' | jq

# Portfolio accounts
docker exec -it ibeam_ibeam_1 sh -lc 'curl -sk https://localhost:5000/v1/api/portfolio/accounts' | jq
```

### Pause IBeam

```bash
cd /opt/ibeam
docker-compose stop ibeam
```

### Retrieve Cookie Dump (After Step 3)

```bash
docker cp ibeam_ibeam_1:/srv/outputs/authenticated_cookies.json ./authenticated_cookies.json
cat authenticated_cookies.json | jq '.cookie_names'
```

### Test Session API

```bash
curl -s http://127.0.0.1:5002/session-cookies | jq
curl -s http://127.0.0.1:5002/test-gateway | jq
```

---

## Current Status

- ✅ Diagnostic scripts created
- ✅ Modification guide created
- ⏸️ **NEXT:** Run Step 1 diagnostic
- ⏸️ **THEN:** Execute Step 2 (pause IBeam)
- ⏸️ **THEN:** Execute Step 3 (modify IBeam to dump cookies)

---

## Blockers & Risks

**Blocker:** None currently  
**Risk:** Low (cookie dump is non-fatal if it fails)  
**Dependencies:** Need access to IBeam source code for Step 3

---

## Success Criteria

- [ ] Step 1: Gateway shows `authenticated=true` from inside container
- [ ] Step 2: IBeam retries stopped (no auth prompt spam)
- [ ] Step 3: Cookie dump file contains multiple cookie names (not just JSESSIONID)
- [ ] Step 4: `/test-gateway` returns 200 OK with account data
- [ ] Step 5: Bridge `/account` endpoint returns real IBKR data

---

**Last Updated:** Ready for Step 1 execution  
**Next Action:** Run `step1_verify_gateway_auth.sh`

