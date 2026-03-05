---
applyTo: "**/*.tsx"
---

# TSX Component Rules

- Define React components using this pattern:
  - `const ComponentName: React.FC<Props> = ({ ... }) => { ... };`
- Export components after declaration:
  - `export default ComponentName;`
- Avoid function declaration style for React components in `.tsx` files.
- Allow only single-level ternary expressions.
- Do not use nested ternary operators; use `if / else if / else` for multi-branch logic.
