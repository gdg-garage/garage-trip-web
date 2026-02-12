# Agent Coding Rules

## Code Style Guidelines

### Avoid Nested Ternary Operators

**Rule:** Do not use nested ternary operators as they reduce code readability and maintainability.

**Why:** Nested ternaries are difficult to parse visually and can lead to errors when conditions become complex.

**Bad:**
```tsx
const status = 
  value === 'yes' 
    ? 'registered;' 
    : value === 'no'
      ? 'NOT registered;' 
      : 'awaiting response;';
```

**Good - Use object/map lookup:**
```tsx
const statusMap: Record<string, string> = {
  yes: 'registered;',
  no: 'NOT registered;',
  awaiting: 'awaiting response;',
};
const status = statusMap[value];
```

**Good - Use if/else or switch for complex logic:**
```tsx
let status: string;
if (value === 'yes') {
  status = 'registered;';
} else if (value === 'no') {
  status = 'NOT registered;';
} else {
  status = 'awaiting response;';
}
```

**Exception:** Simple, single-level ternaries are acceptable:
```tsx
const className = isActive ? 'active' : 'inactive'; // ✓ OK
```
