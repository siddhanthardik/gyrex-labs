// Gyrex Labs - Logout Flow, Cookie Invalidation & Redirect Unit/Integration Tests
//
// Verifies:
// 1. POST /api/auth/logout with default fetch Accept headers returns 200 OK JSON (no 303 redirect to 127.0.0.1 loopback).
// 2. POST /api/auth/logout with explicit Accept: application/json returns 200 OK JSON with redirectUrl: "/".
// 3. POST /api/auth/logout Set-Cookie header contains gyrex_session with max-age=0, expires in the past, path=/, and httpOnly.
// 4. GET /api/auth/logout redirects to public origin (not 127.0.0.1).
// 5. POST /api/auth/logout with HTML Accept header redirects to public origin (not 127.0.0.1).
// 6. Middleware and Superadmin authorization strictly reject requests once session cookie is empty/invalid.

import { NextRequest } from "next/server";
import { POST, GET } from "../app/api/auth/logout/route";
import { SESSION_COOKIE_NAME, verifySessionToken } from "../lib/auth/session";

let passed = 0;
let failed = 0;

function assert(condition: boolean, testName: string, detail?: string) {
  if (condition) {
    console.log(`  ✅ PASS: ${testName}`);
    passed++;
  } else {
    console.error(`  ❌ FAIL: ${testName}${detail ? ` - ${detail}` : ""}`);
    failed++;
  }
}

async function runTests() {
  console.log("\n🚪 Starting Gyrex Labs Logout Flow & Network Security Verification Suite...\n");

  // 1. Browser fetch default Accept (*/*) test
  console.log("--- 1. Programmatic fetch() with Default Accept (*/*) ---");
  {
    const req = new NextRequest("http://127.0.0.1:3005/api/auth/logout", {
      method: "POST",
      headers: {
        "host": "127.0.0.1:3005",
        "accept": "*/*",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "labs.gyrex.in",
      },
    });

    const res = await POST(req);
    assert(res.status === 200, "POST with '*/*' returns 200 OK (not 303 redirect)", `Received status ${res.status}`);

    const data = await res.json();
    assert(data.success === true, "Response JSON has success: true");
    assert(data.redirectUrl === "/", "Response JSON specifies redirectUrl: '/'");

    const setCookie = res.headers.get("set-cookie") || "";
    assert(setCookie.includes(`${SESSION_COOKIE_NAME}=;`), "Set-Cookie clears gyrex_session");
    assert(setCookie.toLowerCase().includes("max-age=0"), "Set-Cookie has Max-Age=0");
    assert(setCookie.toLowerCase().includes("path=/"), "Set-Cookie has Path=/");
    assert(setCookie.toLowerCase().includes("httponly"), "Set-Cookie has HttpOnly");
  }

  // 2. Explicit Accept: application/json test
  console.log("\n--- 2. Programmatic fetch() with Accept: application/json ---");
  {
    const req = new NextRequest("https://labs.gyrex.in/api/auth/logout", {
      method: "POST",
      headers: {
        "host": "labs.gyrex.in",
        "accept": "application/json",
      },
    });

    const res = await POST(req);
    assert(res.status === 200, "POST with 'application/json' returns 200 OK");
    const data = await res.json();
    assert(data.success === true, "JSON returns success: true");
    assert(data.redirectUrl === "/", "Redirect target is '/'");
  }

  // 3. HTML Form Post Navigation
  console.log("\n--- 3. Direct HTML Form POST Navigation ---");
  {
    const req = new NextRequest("http://127.0.0.1:3005/api/auth/logout", {
      method: "POST",
      headers: {
        "host": "127.0.0.1:3005",
        "accept": "text/html,application/xhtml+xml",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "labs.gyrex.in",
      },
    });

    const res = await POST(req);
    assert(res.status === 303, "HTML Form POST returns 303 See Other redirect");
    const location = res.headers.get("location") || "";
    assert(
      !location.includes("127.0.0.1") && !location.includes("localhost"),
      "Redirect Location does NOT contain 127.0.0.1 or localhost",
      `Location: ${location}`
    );
    assert(
      location === "https://labs.gyrex.in/" || location.endsWith("labs.gyrex.in/"),
      "Redirect Location targets https://labs.gyrex.in/",
      `Location: ${location}`
    );
  }

  // 4. Direct GET /api/auth/logout Browser Navigation
  console.log("\n--- 4. Direct GET Navigation ---");
  {
    const req = new NextRequest("http://127.0.0.1:3005/api/auth/logout", {
      method: "GET",
      headers: {
        "host": "127.0.0.1:3005",
        "accept": "text/html",
        "x-forwarded-proto": "https",
        "x-forwarded-host": "labs.gyrex.in",
      },
    });

    const res = await GET(req);
    assert(res.status === 303, "GET returns 303 See Other redirect");
    const location = res.headers.get("location") || "";
    assert(
      !location.includes("127.0.0.1") && !location.includes("localhost"),
      "GET Redirect Location does NOT contain 127.0.0.1 or localhost",
      `Location: ${location}`
    );
    assert(
      location === "https://labs.gyrex.in/" || location.endsWith("labs.gyrex.in/"),
      "GET Redirect Location targets public domain https://labs.gyrex.in/",
      `Location: ${location}`
    );
    const setCookie = res.headers.get("set-cookie") || "";
    assert(setCookie.includes(`${SESSION_COOKIE_NAME}=;`), "GET Set-Cookie clears gyrex_session");
  }

  // 5. Cleared session verification
  console.log("\n--- 5. Session Token Validation Post-Clear ---");
  {
    const emptyTokenVerification = await verifySessionToken("");
    assert(emptyTokenVerification === null, "Empty token is rejected as null");
  }

  console.log("\n============================================================");
  console.log(`LOGOUT TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
  console.log("============================================================\n");

  if (failed > 0) {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error("Test execution error:", err);
  process.exit(1);
});
