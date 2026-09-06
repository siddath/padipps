# Identity review — learner fills this in

Status: **unimplemented / no live SSO test performed**.

| Boundary | Actor and artifact | Validation / permission | Failure test and evidence |
|---|---|---|---|
| OAuth2 authorization code + PKCE | TODO | TODO | TODO |
| OIDC login and nonce | TODO | TODO | TODO |
| SAML browser SSO | TODO | TODO | TODO |
| Slack installation to tenant | TODO | TODO | TODO |
| HubSpot delegated CRM grant | TODO | TODO | TODO |
| Revocation and signing-key rotation | TODO | TODO | TODO |

Draw: registered redirect URI, state/correlation, code verifier, token exchange, issuer/subject
membership, API scope, and where tokens are stored/redacted. Explain why an ID token cannot simply
stand in for a CRM access token. Name the system of record for each mapping.

Local IdP and maintained library chosen (include versions): TODO.
Exact disposable setup and negative-test commands: TODO.
Actual outputs, cryptographic failures exercised, and remaining gaps: TODO.
