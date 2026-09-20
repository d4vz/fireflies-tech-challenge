# Sign-in

`/sign-in` is the unsigned page. It shows the Fireflies wordmark and Clerk's default SignIn. The verify user is a Clerk development test identity: an email with `+clerk_test`, an optional fictional `+1XXX55501xx` phone, and OTP `424242`. After the code, Clerk lands on Home.

## Sub-features

- `sign-in-gate` redirects unsigned `/` to `/sign-in`. The page has no Home chrome.
- `sign-in-email` accepts the launch test email (`+clerk_test`), then OTP `424242`.
- `sign-in-phone` accepts the launch test phone when the form offers phone, with the same OTP.
- `sign-in-home` lands on `/` after a complete OTP. The heading is `Home`. The greeting includes `Verify` and `👋`.

## How to get to it (user POV)

- Open `/` while signed out.
- Open `/sign-in` directly.

## Driving it with the Cursor browser

Preconditions:

- `control-fireflies doctor` reports `doctor=ok` and `login=clerk_test`.
- `control-fireflies login` has printed `login_url`, `login_file`, and `hook_file`. Read those files. Do not print them.
- Inject `.run/clerk-hook.js` before the first Clerk Frontend API call. Prefer CDP `Page.addScriptToEvaluateOnNewDocument`, then navigate. If you can only evaluate after load, evaluate the hook, reload `/sign-in`, then type.
- Viewport is 1440x900.

- **Unsigned gate.** Run `browser_navigate` to the doctor `ui_url`. The path becomes `/sign-in`. The heading `Home` is absent. The image named `Fireflies` is present.
- **Email identifier.** Fill the identifier field with `email` from `login.json`. Choose `Continue`. Clerk does not send a real message.
- **OTP.** Enter `424242`. Use the verification-code field from the snapshot. Typical names are `Enter verification code` or six separate digit boxes.
- **Land on Home.** The path is `/`. The heading is `Home`. The greeting matches `Good (Morning|Afternoon|Evening), Verify 👋`.
- **Phone alternate.** Use this only when the form shows a phone identifier and email is not offered. Fill `phone` from `login.json`, then the same OTP.
- **Proof.** `artifacts/sign-in/signed-out.aria.txt` and `signed-out.png` show `/sign-in` before the code. `artifacts/sign-in/signed-in.aria.txt` and `signed-in.png` show Home after the code. Cloud: record `artifacts/sign-in/login.mp4` from the identifier field through the Home greeting, and copy that file to `/opt/cursor/artifacts`.

## Gotchas

- Do not open an agent-task URL. Do not set `__session` as proof of this feature.
- `424242` works only on a Clerk development instance with a `+clerk_test` email or a fictional `555-01xx` phone. See https://clerk.com/docs/guides/development/testing/test-emails-and-phones.
- "Bot traffic detected" or a captcha is a harness miss. Re-run `control-fireflies login`, re-inject the hook, and reload `/sign-in`.
- The SignIn card is Clerk's hosted component. Prefer the visible Email / Continue / code fields from the live snapshot. Labels may be `Email address`, `Email address or username`, or `Phone number`.
- `.run/session.jwt` is for doctor and the Capture upload fallback. It is not login proof.
