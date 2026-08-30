# Contributing

## Commit messages

Use Conventional Commits so the history says what changed and why at a glance:

```text
type(scope): imperative summary
```

Keep the first line under 72 characters. Use the imperative mood (`add`, `fix`, `simplify`), avoid vague messages such as `changes` or `updates`, and describe one logical change per commit.

Common types:

- `feat`: a user-facing capability
- `fix`: a bug fix
- `refactor`: a code change without new behavior
- `style`: visual-only changes
- `test`: test coverage or test maintenance
- `docs`: documentation
- `chore`: tooling, dependencies, or maintenance

Examples for this project:

```text
feat(menu): add searchable mobile dish catalogue
style(home): align the mobile layout with the Figma direction
fix(menu): keep category tabs visible while scrolling
refactor(seed): reference optimized WebP assets directly
test(menu): cover keyboard dialog navigation
docs(repo): explain local setup and commit conventions
```

Add a body when the reason or trade-off is not obvious:

```text
refactor(ordering): send completed carts through WhatsApp

The business confirms orders manually, so WhatsApp provides a complete handoff
without introducing payment infrastructure prematurely.
```

For breaking changes, add `!` and a footer:

```text
feat(api)!: rename the public menu response fields

BREAKING CHANGE: clients must use categorySlug instead of category_key.
```
