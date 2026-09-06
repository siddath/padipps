# Conventions

Use vanilla ES modules, Node built-ins, stable lesson IDs and explicit data boundaries. Prefer existing modules and readable functions over new frameworks or broad abstractions. These conventions apply to changes, not unrelated formatting churn.

- Escape learner/pack strings or assign `textContent`; never render model text as executable HTML.
- Keep pure state transitions in engine modules and DOM behavior in UI modules.
- Preserve pack-fingerprint namespaces, validated imports, conflict recovery and separate evidence stores.
- Use local GSAP only for purposeful feedback; system reduced motion takes precedence.
- Keep operational credentials outside source, browser storage, exports and logs. An environment override is local configuration, not a credential to commit.
- Use an explicit browser asset list for both serving and deployment. No recursive repository copy into dist.
- Test outcomes and negative boundaries; fixture success is not a real system deployment or learner achievement.
