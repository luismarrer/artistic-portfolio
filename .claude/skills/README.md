# Agent skills

Claude Code loads every folder here that contains a `SKILL.md` as a project skill.

## Vendored from emilkowalski/skills

These six skills are unmodified copies of [emilkowalski/skills](https://github.com/emilkowalski/skills/tree/2d228630ba1446365f614a108cb8252f1feda202/skills) at commit `2d228630ba1446365f614a108cb8252f1feda202` (2026-10-11). They were read in full before being added: plain Markdown, with no scripts, hooks or `allowed-tools`.

| Skill | What it does | How it runs |
| --- | --- | --- |
| `emil-design-eng` | Applies Emil Kowalski's philosophy on UI polish and animation | When relevant, or `/emil-design-eng` |
| `animate` | Builds a new animation, deciding first whether it should animate at all | When relevant, or `/animate` |
| `animation-performance` | Finds why an animation drops frames and swaps in cheaper properties | When relevant, or `/animation-performance` |
| `review-animations` | Reviews motion code against a strict craft bar | Only with `/review-animations` |
| `mobile-native` | Removes the details that make a site feel like a website on a phone | When relevant, or `/mobile-native` |
| `break-ui` | Stress-tests a component with worst-case data behind a dev-only toggle | When relevant, or `/break-ui` |

Some of them mention sibling skills that are not installed here: `improve-animations`, `find-animation-opportunities`, `pick-ui-library`, `prototype` and `animate-expo`.

The pinned design rules in [AGENTS.md](../../AGENTS.md) take precedence over these skills. The hero's scroll hint, for example, keeps its production timing and endless bounce even though the skills keep UI animations under 300ms.

## Updating

Don't edit the copies in place. To update, read the new upstream revision in full, replace these folders with its copies and change the commit above. Avoid `npx skills@latest add`: it runs an unpinned installer and always takes the latest upstream.

## License

The vendored skills are distributed under the MIT License:

```text
MIT License

Copyright (c) 2026 Emil Kowalski

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```
