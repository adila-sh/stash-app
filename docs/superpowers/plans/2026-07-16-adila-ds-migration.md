# Migração do Stash para o Design System Adila — Plano de Implementação

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Substituir tokens, componentes e ícones do frontend do Stash pelos do design system `ds.adila.co`.

**Architecture:** Cinco frentes em ordem de dependência: tokens e fontes primeiro (mudam a aparência sem tocar em código React), depois os componentes `ui/*` de Radix para Base UI em três ondas de superfície crescente, depois os ícones de Lucide para Phosphor, e por fim a limpeza dos settings que colidem com o tema. Cada onda termina com `tsc -b` + `oxlint` verdes e um commit.

**Tech Stack:** React 19, Vite 8, Tailwind 4, TypeScript 6, Base UI 1.6.0, Phosphor Icons 2.1.10, Bun, Wails 3.

## Global Constraints

- Gerenciador de pacotes: **`bun`**. O `pnpm-lock.yaml` está obsoleto e é ignorado — nunca rodar `pnpm`.
- Diretório de trabalho de todos os comandos: `/home/sousa/work/adila/stash/frontend`.
- Registry: `https://ds.adila.co/r/<nome>.json`. Índice: `https://ds.adila.co/r/registry.json`.
- Pacote do Base UI é `@base-ui/react` (1.6.0), **não** `@base-ui-components/react` (que existe no npm mas é o nome antigo, parado em `1.0.0-rc.0`).
- Nenhum recurso remoto em runtime: o Stash é app desktop Wails e roda offline. Fontes servidas de `public/fonts/`.
- Nenhum componente de aplicação importa Radix nem usa `asChild` — está tudo confinado a `src/components/ui/`. Se um passo revelar o contrário, pare e reporte.
- Idioma de commits e comentários: pt-br, conforme o repositório.
- Lint/format: `bunx oxlint .` e `bunx oxfmt`. O pre-commit roda ambos nos arquivos staged.
- Sem framework de testes no projeto. A verificação de cada tarefa é `tsc -b` + `oxlint` + inspeção visual do app rodando (`task dev`). Não invente Vitest/Jest neste plano.

## Mapa de arquivos

**Criar:**
- `frontend/public/fonts/adila-std/*.woff2` (10), `adila-code/*.woff2` (12), `adila-pixel/*.woff2` (1)
- `frontend/src/hooks/use-color-scheme.ts` — única fonte de verdade de light/dark
- `frontend/src/components/ui/dropdown-menu.tsx` — exigido por `menubar`
- `frontend/src/components/ui/input-group.tsx` — exigido por `command`

**Modificar:**
- `frontend/src/globals.css` (373 linhas) — troca completa dos blocos de tema e `@font-face`
- `frontend/src/components/ui/*.tsx` (16 arquivos) — substituídos pelo registry
- `frontend/src/lib/settings-store.ts` — remoção de 4 settings e da lógica associada
- `frontend/src/routes/_layout/settings.tsx` — remoção de 4 seções de UI
- `frontend/src/components/DiffViewer.tsx:217,222` — passa a usar `use-color-scheme`
- 25 arquivos com ícones Lucide
- `frontend/package.json` — entram 2 deps, saem 8

**Remover:**
- `frontend/public/Google_Sans_Code/` — a fonte deixa de ser referenciada

---

### Task 1: Fontes locais

**Files:**
- Create: `frontend/public/fonts/adila-fonts.css`
- Create: `frontend/public/fonts/{adila-std,adila-code,adila-pixel}/*.woff2`
- Delete: `frontend/public/Google_Sans_Code/`

**Interfaces:**
- Produces: `public/fonts/adila-fonts.css`, importável via `@import "/fonts/adila-fonts.css"` a partir do `globals.css`. Declara as famílias `"Adila Std"`, `"Adila Code"` e `"Adila Pixel"`.

- [ ] **Step 1: Baixar os woff2 das três famílias**

A família "Adila Code Proportional" fica de fora de propósito: nenhum token do tema a referencia.

```bash
cd /home/sousa/work/adila/stash/frontend
mkdir -p public/fonts/{adila-std,adila-code,adila-pixel}

curl -sL https://assets.adila.co/adila-fonts.css \
  | grep -oP '(?<=url\(")[^"]+' \
  | grep -v 'Proportional' \
  | while read -r url; do
      rel="${url#https://assets.adila.co/fonts/}"
      mkdir -p "public/fonts/$(dirname "$rel")"
      curl -sL --fail "$url" -o "public/fonts/$rel" \
        && echo "ok  $rel" || echo "FALHOU $url"
    done
```

O path de origem é preservado inteiro (`adila-std/woff2/AdilaStd-Light.woff2`), **não** achatado. O Step 3 só reescreve o domínio do CSS e mantém o resto do path, então disco e CSS precisam ter exatamente a mesma estrutura. Achatar aqui deixa as 23 URLs órfãs e as fontes caem silenciosamente para o fallback do sistema.

- [ ] **Step 2: Conferir que baixou 23 arquivos e nenhum falhou**

```bash
cd /home/sousa/work/adila/stash/frontend
find public/fonts -name '*.woff2' | wc -l
find public/fonts -name '*.woff2' -size -1k
```

Esperado: `23` na primeira linha, e **nenhuma saída** na segunda (arquivo abaixo de 1k é erro HTML salvo como fonte).

- [ ] **Step 3: Gerar o CSS local com URLs reescritas**

Os nomes de arquivo têm `%20` (ex.: `AdilaStd-Light%20Italic.woff2`). Manter o `%20` na URL do CSS e no nome do arquivo em disco — o `curl -o` grava literalmente `AdilaStd-Light%20Italic.woff2`, e é assim que o Vite vai servir.

```bash
cd /home/sousa/work/adila/stash/frontend
curl -sL https://assets.adila.co/adila-fonts.css \
  | sed 's|https://assets.adila.co/fonts/|/fonts/|g' \
  > public/fonts/adila-fonts.css
```

- [ ] **Step 4: Remover os blocos da família Proportional do CSS gerado**

Como os woff2 dela não foram baixados, os `@font-face` correspondentes apontariam para 404.

```bash
cd /home/sousa/work/adila/stash/frontend
python3 - << 'EOF'
import re
p = "public/fonts/adila-fonts.css"
css = open(p).read()
blocos = re.findall(r'@font-face\s*\{[^}]*\}', css, re.S)
mantidos = [b for b in blocos if 'Proportional' not in b]
head = css.split('@font-face')[0]
open(p, 'w').write(head + '\n'.join(mantidos) + '\n')
print(f"blocos: {len(blocos)} -> {len(mantidos)}")
EOF
grep -c 'Proportional' public/fonts/adila-fonts.css || echo "0 referências a Proportional — ok"
```

Esperado: `blocos: 35 -> 23` e nenhuma referência a Proportional.

- [ ] **Step 4b: Provar que cada URL do CSS resolve para um arquivo real**

Esta é a única verificação que comprova a task. Contar arquivos e contar blocos não substitui: uma URL órfã não dá erro, a fonte só cai calada para o fallback do sistema — que é precisamente o bug que esta task existe para evitar.

```bash
cd /home/sousa/work/adila/stash/frontend
ok=0; bad=0
while read -r u; do
  if [ -f "public${u}" ]; then ok=$((ok+1)); else bad=$((bad+1)); echo "  ÓRFÃ: $u"; fi
done < <(grep -oP '(?<=url\(")[^"]+' public/fonts/adila-fonts.css)
echo "resolvem: $ok | órfãs: $bad"
```

Esperado: `resolvem: 23 | órfãs: 0`. Qualquer órfã bloqueia o commit.

- [ ] **Step 5: Remover a fonte antiga**

```bash
cd /home/sousa/work/adila/stash/frontend
rm -rf public/Google_Sans_Code
```

- [ ] **Step 6: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/public/fonts frontend/public/Google_Sans_Code
git commit -m "feat: servir fontes Adila localmente e remover Google Sans Code"
```

---

### Task 2: Hook de color scheme

**Files:**
- Create: `frontend/src/hooks/use-color-scheme.ts`

**Interfaces:**
- Produces:
  - `useColorScheme(): "light" | "dark"` — hook React, reage a mudanças do SO.
  - `initColorScheme(): void` — efeito colateral em `document.documentElement`, chamado uma vez no módulo. Escreve/remove a classe `.dark`.

Este hook é a única fonte de verdade de light/dark depois que o setting `theme` sumir (Task 8). A classe `.dark` é o que o `@custom-variant dark` do `globals.css` (Task 3) observa.

- [ ] **Step 1: Escrever o hook**

```ts
import { useSyncExternalStore } from "react";

const QUERY = "(prefers-color-scheme: dark)";

export type ColorScheme = "light" | "dark";

function mql(): MediaQueryList | null {
  return typeof window === "undefined" ? null : window.matchMedia(QUERY);
}

function subscribe(onChange: () => void): () => void {
  const m = mql();
  if (!m) return () => {};
  m.addEventListener("change", onChange);
  return () => m.removeEventListener("change", onChange);
}

function getSnapshot(): ColorScheme {
  return mql()?.matches ? "dark" : "light";
}

/** Reflete o esquema do SO na classe `.dark` do <html>, que o Tailwind observa. */
function apply(scheme: ColorScheme): void {
  document.documentElement.classList.toggle("dark", scheme === "dark");
}

export function useColorScheme(): ColorScheme {
  return useSyncExternalStore(subscribe, getSnapshot, () => "dark");
}

export function initColorScheme(): void {
  if (typeof document === "undefined") return;
  apply(getSnapshot());
  subscribe(() => apply(getSnapshot()));
}
```

- [ ] **Step 2: Chamar `initColorScheme` no bootstrap**

Em `frontend/src/main.tsx`, adicionar o import e a chamada **antes** do `createRoot`, para a classe existir no primeiro paint e não haver flash de tema errado.

```ts
import { initColorScheme } from "@/hooks/use-color-scheme";

initColorScheme();
```

- [ ] **Step 3: Verificar tipos**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx tsc -b && bunx oxlint src/hooks/use-color-scheme.ts src/main.tsx
```

Esperado: sem erros.

- [ ] **Step 4: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src/hooks/use-color-scheme.ts frontend/src/main.tsx
git commit -m "feat: hook use-color-scheme como fonte de verdade de light/dark"
```

---

### Task 3: Tokens do tema Adila

**Files:**
- Modify: `frontend/src/globals.css`

**Interfaces:**
- Consumes: `public/fonts/adila-fonts.css` (Task 1), classe `.dark` escrita por `initColorScheme` (Task 2).
- Produces: tokens `--background`, `--foreground`, `--primary`, `--secondary`, `--muted`, `--accent`, `--destructive`, `--warning`, `--success`, `--border`, `--input`, `--ring`, `--chart-1..5`, `--sidebar*`, `--added`, `--modified`, `--deleted`, `--untracked` em light e dark; `--radius: 0.375rem`; `--font-sans`, `--font-mono`, `--font-pixel`.

- [ ] **Step 1: Substituir o topo do arquivo — imports, fontes e variante dark**

Trocar as linhas 1-21 de `frontend/src/globals.css` (os dois `@import`, os dois `@font-face` do Google Sans Code e o `@custom-variant`) por:

```css
@import "tailwindcss";
@import "tw-animate-css";
@import "/fonts/adila-fonts.css";

@custom-variant dark (&:where(.dark, .dark *));

@theme {
  --radius: 0.375rem;
  --font-sans: "Adila Std", "SF Pro Text", "Segoe UI", system-ui, sans-serif;
  --font-mono: "Adila Code", "JetBrains Mono", "Fira Code", Consolas, monospace;
  --font-pixel: "Adila Pixel", "Adila Code", monospace;
}
```

- [ ] **Step 2: Substituir todos os blocos de tema por light/dark do Adila**

Remover **todos** os blocos `:root`, `[data-theme="ultra-dark"]`, `[data-theme="ultra-deep"]`, `[data-theme="ultra-white"]`, `[data-theme="off-white"]` e `[data-theme="ultra-aqua"]`, e colocar no lugar:

```css
:root {
  --background: oklch(1 0 0);
  --foreground: oklch(0.2101 0 0);
  --card: oklch(1 0 0);
  --card-foreground: oklch(0.2101 0 0);
  --popover: oklch(1 0 0);
  --popover-foreground: oklch(0.2101 0 0);
  --primary: oklch(0.5060 0.2298 270.42);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.9764 0 0);
  --secondary-foreground: oklch(0.2101 0 0);
  --muted: oklch(0.9764 0 0);
  --muted-foreground: oklch(0.5510 0 0);
  --accent: oklch(0.9764 0 0);
  --accent-foreground: oklch(0.2101 0 0);
  --destructive: oklch(0.5915 0.2078 25.33);
  --destructive-foreground: oklch(1 0 0);
  --warning: oklch(0.7686 0.1647 70.08);
  --warning-foreground: oklch(0.2101 0 0);
  --success: oklch(0.5385 0.1491 162.48);
  --success-foreground: oklch(1 0 0);
  --border: oklch(0.9276 0 0);
  --input: oklch(0.9276 0 0);
  --ring: oklch(0.5060 0.2298 270.42);
  --chart-1: oklch(0.5060 0.2298 270.42);
  --chart-2: oklch(0.6368 0.2078 25.33);
  --chart-3: oklch(0.7686 0.1647 70.08);
  --chart-4: oklch(0.5510 0 0);
  --chart-5: oklch(0.6959 0.1491 162.48);
  --sidebar: oklch(0.9821 0 0);
  --sidebar-foreground: oklch(0.2101 0 0);
  --sidebar-primary: oklch(0.5060 0.2298 270.42);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.9764 0 0);
  --sidebar-accent-foreground: oklch(0.2101 0 0);
  --sidebar-border: oklch(0.9276 0 0);
  --sidebar-ring: oklch(0.5060 0.2298 270.42);

  /* tokens de git — mapeados sobre a paleta semântica do DS */
  --added: var(--success);
  --modified: var(--warning);
  --deleted: var(--destructive);
  --untracked: var(--primary);
}

.dark {
  --background: oklch(0.1450 0 0);
  --foreground: oklch(0.9445 0 0);
  --card: oklch(0.2200 0 0);
  --card-foreground: oklch(0.9445 0 0);
  --popover: oklch(0.2000 0 0);
  --popover-foreground: oklch(0.9445 0 0);
  --primary: oklch(0.5500 0.2298 270.42);
  --primary-foreground: oklch(1 0 0);
  --secondary: oklch(0.2700 0 0);
  --secondary-foreground: oklch(0.9445 0 0);
  --muted: oklch(0.2700 0 0);
  --muted-foreground: oklch(0.7715 0 0);
  --accent: oklch(0.2700 0 0);
  --accent-foreground: oklch(0.9445 0 0);
  --destructive: oklch(0.5870 0.1661 22.22);
  --destructive-foreground: oklch(1 0 0);
  --warning: oklch(0.8369 0.1644 84.43);
  --warning-foreground: oklch(0.2101 0 0);
  --success: oklch(0.5360 0.1535 163.22);
  --success-foreground: oklch(1 0 0);
  --border: oklch(0.2800 0 0);
  --input: oklch(0.3200 0 0);
  --ring: oklch(0.7080 0.2298 270.42);
  --chart-1: oklch(0.5500 0.2298 270.42);
  --chart-2: oklch(0.7106 0.1661 22.22);
  --chart-3: oklch(0.8369 0.1644 84.43);
  --chart-4: oklch(0.6527 0 0);
  --chart-5: oklch(0.7729 0.1535 163.22);
  --sidebar: oklch(0.1750 0 0);
  --sidebar-foreground: oklch(0.9445 0 0);
  --sidebar-primary: oklch(0.5500 0.2298 270.42);
  --sidebar-primary-foreground: oklch(1 0 0);
  --sidebar-accent: oklch(0.2700 0 0);
  --sidebar-accent-foreground: oklch(0.9445 0 0);
  --sidebar-border: oklch(0.2800 0 0);
  --sidebar-ring: oklch(0.7080 0.2298 270.42);

  --added: var(--success);
  --modified: var(--warning);
  --deleted: var(--destructive);
  --untracked: var(--primary);
}
```

- [ ] **Step 2b: Auditar o resto do arquivo**

O `globals.css` tem 373 linhas; os blocos de tema são só uma parte. Ler o restante e conferir cada regra que referencia um token removido ou `[data-theme=...]`.

```bash
cd /home/sousa/work/adila/stash/frontend
grep -n 'data-theme\|ultra-\|off-white\|Google Sans Code' src/globals.css
```

Esperado: **nenhuma saída**. Se aparecer algo, é uma regra órfã dos temas antigos — remover ou reescrever para os tokens novos antes de seguir.

- [ ] **Step 3: Conferir que os tokens do DS estão registrados no `@theme` do Tailwind**

Tokens como `--warning` e `--success` não existiam antes e precisam estar expostos como utilitários (`bg-warning`, `text-success`). Conferir se o `@theme inline` do arquivo já os mapeia; se não, adicionar ao bloco existente:

```css
@theme inline {
  --color-warning: var(--warning);
  --color-warning-foreground: var(--warning-foreground);
  --color-success: var(--success);
  --color-success-foreground: var(--success-foreground);
}
```

- [ ] **Step 4: Subir o app e olhar**

```bash
cd /home/sousa/work/adila/stash
task dev
```

Esperado: a UI ainda está monoespaçada e com radius 0 — o `applySettings` continua sobrescrevendo `--font-sans` e `--radius` em runtime, e só some na Task 8. O que deve mudar aqui é **cor**: fundo claro/escuro do Adila no lugar do preto puro, e indigo nos elementos primários. Se as cores não mudaram, o `.dark`/`:root` não está sendo aplicado — investigar antes de commitar.

- [ ] **Step 5: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src/globals.css
git commit -m "feat: adotar tokens light/dark do design system Adila"
```

---

### Task 4: Dependências dos componentes

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Produces: `@base-ui/react@^1.6.0` e `@phosphor-icons/react@^2.1.10` disponíveis para as Tasks 5-9.

Radix e Lucide **não saem aqui** — o código ainda os usa. Saem na Task 10, depois que o último import morrer.

- [ ] **Step 1: Instalar**

```bash
cd /home/sousa/work/adila/stash/frontend
bun add @base-ui/react@^1.6.0 @phosphor-icons/react@^2.1.10
```

- [ ] **Step 2: Conferir a versão instalada**

```bash
cd /home/sousa/work/adila/stash/frontend
bun pm ls | grep -E 'base-ui|phosphor'
```

Esperado: `@base-ui/react@1.6.x` e `@phosphor-icons/react@2.1.x`. Se vier `1.0.0-rc.0`, o pacote errado foi instalado — ver Global Constraints.

- [ ] **Step 3: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/package.json frontend/bun.lock
git commit -m "chore: adicionar Base UI e Phosphor Icons"
```

---

### Task 5: Componentes — onda 1 (folhas)

**Files:**
- Modify: `frontend/src/components/ui/{skeleton,separator,kbd,card,input,textarea}.tsx`

**Interfaces:**
- Produces: mesmos exports de hoje. Verificado contra o registry: os exports batem 1:1 nestes seis.

Onda de menor superfície: sem portal, sem estado, sem contexto. Se algo estrutural estiver errado na abordagem, falha aqui e barato.

- [ ] **Step 1: Puxar os seis do registry**

O `components.json` já aponta `ui` para `@/components/ui` e `css` para `src/globals.css`, então o CLI escreve no lugar certo. Ele vai perguntar antes de sobrescrever — confirmar.

```bash
cd /home/sousa/work/adila/stash/frontend
bunx shadcn@latest add -o \
  https://ds.adila.co/r/skeleton.json \
  https://ds.adila.co/r/separator.json \
  https://ds.adila.co/r/kbd.json \
  https://ds.adila.co/r/card.json \
  https://ds.adila.co/r/input.json \
  https://ds.adila.co/r/textarea.json
```

- [ ] **Step 2: Conferir que o CLI não mexeu no `globals.css`**

O item `adila-theme` não está sendo instalado, mas o CLI pode tentar injetar `cssVars` mesmo assim. A Task 3 já cravou os tokens à mão e não pode ser desfeita.

```bash
cd /home/sousa/work/adila/stash
git diff --stat frontend/src/globals.css
```

Esperado: **nenhuma saída**. Se o CSS mudou, `git checkout frontend/src/globals.css` e seguir.

- [ ] **Step 3: Verificar tipos e lint**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx tsc -b && bunx oxlint src/components/ui/
```

Esperado: sem erros. Um erro provável é `ButtonProps` — o tipo não existe no DS, mas só some na Task 6; se aparecer agora, é porque algum destes seis o importava, o que não deveria acontecer.

- [ ] **Step 4: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src/components/ui
git commit -m "refactor: migrar componentes folha para Base UI (onda 1)"
```

---

### Task 6: Componentes — onda 2 (interativos)

**Files:**
- Modify: `frontend/src/components/ui/{button,checkbox,tabs,tooltip,scroll-area}.tsx`

**Interfaces:**
- Consumes: `@base-ui/react` (Task 4).
- Produces: `Button`, `buttonVariants`, `Checkbox`, `Tabs`, `TabsList`, `TabsTrigger`, `TabsContent`, `Tooltip`, `TooltipTrigger`, `TooltipContent`, `TooltipProvider`, `ScrollArea`, `ScrollBar`.
- **Deixa de produzir:** o tipo `ButtonProps`.

- [ ] **Step 1: Puxar os cinco do registry**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx shadcn@latest add -o \
  https://ds.adila.co/r/button.json \
  https://ds.adila.co/r/checkbox.json \
  https://ds.adila.co/r/tabs.json \
  https://ds.adila.co/r/tooltip.json \
  https://ds.adila.co/r/scroll-area.json
```

- [ ] **Step 2: Conferir que o `globals.css` não foi tocado**

```bash
cd /home/sousa/work/adila/stash
git diff --stat frontend/src/globals.css
```

Esperado: nenhuma saída. Se mudou, `git checkout frontend/src/globals.css`.

- [ ] **Step 3: Achar quem importa `ButtonProps`**

```bash
cd /home/sousa/work/adila/stash/frontend
grep -rn "ButtonProps" src
```

Para cada ocorrência, trocar o tipo por `React.ComponentProps<typeof Button>`. Se a saída for vazia, seguir.

- [ ] **Step 4: Verificar tipos e lint**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx tsc -b && bunx oxlint src/
```

Esperado: sem erros.

- [ ] **Step 5: Subir e exercitar**

```bash
cd /home/sousa/work/adila/stash
task dev
```

Conferir: botões (as 4 variantes em uso são `ghost`, `secondary`, `outline`, `destructive`), checkbox de stage na tela de changes, tabs de changes/history, tooltips da sidebar e scroll das listas. Base UI e Radix convivem neste ponto — é esperado.

- [ ] **Step 6: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src
git commit -m "refactor: migrar componentes interativos para Base UI (onda 2)"
```

---

### Task 7: Componentes — onda 3 (portais e compostos)

**Files:**
- Modify: `frontend/src/components/ui/{dialog,sheet,command,menubar,sidebar}.tsx`
- Create: `frontend/src/components/ui/dropdown-menu.tsx`
- Create: `frontend/src/components/ui/input-group.tsx`

**Interfaces:**
- Consumes: `Button`, `Input`, `Separator`, `Sheet`, `Skeleton`, `Tooltip`, `Textarea` (Tasks 5-6); hook `use-mobile` em `src/hooks/use-mobile.ts`.
- Produces: além dos exports atuais de `dialog`, `sheet`, `command`, `menubar` e `sidebar` (que batem 1:1 com o registry), os novos `DropdownMenu*` e `InputGroup*`.

`dropdown-menu` e `input-group` não existem hoje: `menubar` importa o primeiro e `command` o segundo. É dependência transitiva do registry, não escolha.

- [ ] **Step 1: Puxar os sete do registry**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx shadcn@latest add -o \
  https://ds.adila.co/r/dropdown-menu.json \
  https://ds.adila.co/r/input-group.json \
  https://ds.adila.co/r/dialog.json \
  https://ds.adila.co/r/sheet.json \
  https://ds.adila.co/r/command.json \
  https://ds.adila.co/r/menubar.json \
  https://ds.adila.co/r/sidebar.json
```

- [ ] **Step 2: Conferir que o `globals.css` não foi tocado**

```bash
cd /home/sousa/work/adila/stash
git diff --stat frontend/src/globals.css
```

Esperado: nenhuma saída. Se mudou, `git checkout frontend/src/globals.css`.

- [ ] **Step 3: Conferir que o `use-mobile` do registry não sobrescreveu o nosso**

O `sidebar` depende de `use-mobile`, que já existe em `src/hooks/use-mobile.ts`. O CLI pode ter reescrito.

```bash
cd /home/sousa/work/adila/stash
git diff frontend/src/hooks/use-mobile.ts
```

Se mudou, ler o diff: se a versão do registry for equivalente, aceitar; se quebrar quem já usa o hook, reverter com `git checkout`.

- [ ] **Step 4: Confirmar que Radix sumiu de `ui/`**

```bash
cd /home/sousa/work/adila/stash/frontend
grep -rn '@radix-ui\|from "radix-ui"' src/
```

Esperado: **nenhuma saída**. Este é o passo que autoriza a Task 10 a remover os pacotes.

- [ ] **Step 5: Verificar tipos e lint**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx tsc -b && bunx oxlint src/
```

Esperado: sem erros.

- [ ] **Step 6: Subir e exercitar os portais**

```bash
cd /home/sousa/work/adila/stash
task dev
```

Conferir um a um, porque portal e foco são onde Base UI mais diverge de Radix: dialog de clone de repo, dialog de criar PR, dialog de árvore suja, command palette (abrir, filtrar, navegar com setas, Esc), menubar da janela (submenus), sidebar de repos (colapsar/expandir) e sheet.

- [ ] **Step 7: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src
git commit -m "refactor: migrar dialogs, command, menubar e sidebar para Base UI (onda 3)"
```

---

### Task 8: Limpeza dos settings

**Files:**
- Modify: `frontend/src/lib/settings-store.ts`
- Modify: `frontend/src/routes/_layout/settings.tsx:96-240`
- Modify: `frontend/src/components/DiffViewer.tsx:217,222`

**Interfaces:**
- Consumes: `useColorScheme` de `@/hooks/use-color-scheme` (Task 2).
- Produces: `Settings` sem `theme`, `monoFont`, `radius` e `accentTint`. `persist` na `version: 5`.
- **Deixa de produzir:** tipos `Theme`, `MonoFont`, `Radius`, `AccentTint`; consts `MONO_FONT_LABELS`, `MONO_STACKS`, `ACCENT_TINTS`.

Esta é a tarefa que faz o tema Adila realmente aparecer: enquanto `applySettings` sobrescrever `--font-sans`, `--font-mono`, `--radius` e `--accent` em runtime, os tokens da Task 3 ficam encobertos.

- [ ] **Step 1: `settings-store.ts` — remover os tipos e tabelas**

Remover as declarações dos tipos `Theme`, `MonoFont`, `Radius` e `AccentTint`, e as consts `MONO_STACKS`, `MONO_FONT_LABELS` e `ACCENT_TINTS`. Manter `DiffStyle`, `FontSize`, `TabWidth`, `WindowOpacity` e `WindowBlur`.

- [ ] **Step 2: `settings-store.ts` — encolher `Settings` e `DEFAULTS`**

```ts
export interface Settings {
  windowOpacity: WindowOpacity;
  windowBlur: WindowBlur;
  reduceMotion: boolean;
  diffFontSize: FontSize;
  diffStyle: DiffStyle;
  showLineNumbers: boolean;
  wrapLines: boolean;
  syntaxHighlight: boolean;
  tabWidth: TabWidth;
  showFileHeader: boolean;
  compactMode: boolean;
}

const DEFAULTS: Settings = {
  windowOpacity: 0.85,
  windowBlur: 24,
  reduceMotion: false,
  diffFontSize: 12,
  diffStyle: "unified",
  showLineNumbers: true,
  wrapLines: false,
  syntaxHighlight: true,
  tabWidth: 2,
  showFileHeader: true,
  compactMode: false,
};
```

- [ ] **Step 3: `settings-store.ts` — enxugar `applySettings`**

O tema, a fonte, o radius e o accent agora vêm do CSS. Sobra só o que é de janela e de movimento:

```ts
function applySettings(s: Settings) {
  const root = document.documentElement;
  root.style.setProperty("--window-bg-alpha", String(s.windowOpacity));
  root.style.setProperty("--window-blur", `${s.windowBlur}px`);
  root.dataset.reduceMotion = s.reduceMotion ? "true" : "false";
}
```

- [ ] **Step 4: `settings-store.ts` — migração do estado persistido**

Quem já usa o Stash tem `theme: "ultra-dark"` gravado em `localStorage` sob `stash:settings`. Sem migração, `partialize` já filtraria as chaves órfãs, mas a migração explícita deixa a intenção clara e evita que `...rest` reintroduza lixo.

Trocar o bloco `version`/`migrate` por:

```ts
      name: "stash:settings",
      version: 5,
      migrate: (persisted, fromVersion) => {
        if (!persisted || typeof persisted !== "object") return DEFAULTS;
        if (fromVersion < 5) {
          const {
            theme: _theme,
            monoFont: _monoFont,
            radius: _radius,
            accentTint: _accentTint,
            sansFont: _sansFont,
            uiFontSize: _uiFontSize,
            ...rest
          } = persisted as Record<string, unknown>;
          return { ...DEFAULTS, ...rest } as Settings;
        }
        return persisted as Settings;
      },
```

As migrações antigas (`fromVersion < 2` e `< 4`) somem: a de v5 já cobre qualquer estado anterior, porque parte de `DEFAULTS` e descarta toda chave removida.

- [ ] **Step 5: `settings-store.ts` — encolher o seletor `useSettings`**

Remover `theme`, `monoFont`, `radius` e `accentTint` do objeto do `useShallow`, deixando as onze chaves restantes.

- [ ] **Step 6: `DiffViewer.tsx` — trocar a fonte de verdade do tema**

A linha 217 é `file.initTheme(settings.theme === "ultra-dark" ? "dark" : "light");` e a 222 tem `settings.theme` no array de dependências. Adicionar o import, chamar o hook no corpo do componente e trocar as duas:

```ts
import { useColorScheme } from "@/hooks/use-color-scheme";

// no corpo do componente, junto dos outros hooks:
const scheme = useColorScheme();

// linha 217:
file.initTheme(scheme);

// array de dependências da linha 222:
}, [diff, scheme, settings.diffStyle]);
```

`useColorScheme` já retorna exatamente `"dark" | "light"`, então o ternário some.

- [ ] **Step 7: `settings.tsx` — remover as quatro seções**

Remover os blocos de UI de tema (≈96-150), fonte mono (≈152-165), radius (≈166-175) e accent tint (≈220-240), junto dos imports que ficarem órfãos (`MONO_FONT_LABELS` e afins). Manter as seções de opacidade de janela, blur, movimento reduzido e as de diff.

Os números de linha são aproximados e vão andar conforme os blocos saem — guiar-se pelo conteúdo, não pela linha.

- [ ] **Step 8: Verificar tipos e lint**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx tsc -b && bunx oxlint src/
```

Esperado: sem erros. O `tsc` é o que pega qualquer consumidor restante dos settings removidos.

- [ ] **Step 9: Subir e conferir a virada visual**

```bash
cd /home/sousa/work/adila/stash
task dev
```

Agora é onde a aparência muda de verdade. Esperado: a UI deixa de ser monoespaçada e passa a Adila Std, só código/diff continua em Adila Code; cantos passam a ter 6px de raio; o accent vira indigo. Conferir também que a tela de settings não tem mais os quatro seletores e que os que sobraram (opacidade, blur, movimento) ainda funcionam.

Testar a migração com estado antigo: abrir o DevTools, `localStorage.setItem("stash:settings", JSON.stringify({state:{theme:"ultra-dark",radius:0,monoFont:"google",accentTint:"warm",windowOpacity:0.5},version:4}))`, recarregar. Esperado: app sobe sem erro, tema Adila aplicado, `windowOpacity` preservado em 0.5.

- [ ] **Step 10: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src
git commit -m "refactor: remover seletores de tema, fonte, radius e accent dos settings"
```

---

### Task 9: Ícones — Lucide para Phosphor

**Files:**
- Modify: os 25 arquivos que importam de `lucide-react`

**Interfaces:**
- Consumes: `@phosphor-icons/react` (Task 4).

São 34 ícones distintos. Phosphor renomeia a família "chevron" para "caret" e usa `weight` em vez de variantes de import. O tamanho continua vindo do CSS (`[&_svg]:size-4` nos componentes), então não é preciso passar `size`.

Tabela de tradução — usar exatamente estes nomes:

| Lucide | Phosphor |
|---|---|
| `AlertCircle` | `WarningCircle` |
| `AlertTriangle` | `Warning` |
| `Archive` | `Archive` |
| `Check`, `CheckIcon` | `Check` |
| `ChevronRightIcon` | `CaretRight` |
| `CircleIcon` | `Circle` |
| `Cloud` | `Cloud` |
| `Copy` | `Copy` |
| `ExternalLink` | `ArrowSquareOut` |
| `FileDiff` | `FileText` |
| `Folder` | `Folder` |
| `FolderGit2` | `GitBranch` |
| `FolderOpen` | `FolderOpen` |
| `FolderSearch` | `FolderSimpleUser` |
| `GitBranch` | `GitBranch` |
| `GitCommit` | `GitCommit` |
| `GitFork` | `GitFork` |
| `GitPullRequest` | `GitPullRequest` |
| `Loader2` | `CircleNotch` |
| `Lock` | `Lock` |
| `LogOut` | `SignOut` |
| `Menu` | `List` |
| `Minus` | `Minus` |
| `PanelLeftIcon` | `SidebarSimple` |
| `RotateCcw` | `ArrowCounterClockwise` |
| `Search`, `SearchIcon` | `MagnifyingGlass` |
| `Square` | `Square` |
| `SquareStack` | `Stack` |
| `Star` | `Star` |
| `Trash2` | `Trash` |
| `X`, `XIcon` | `X` |

- [ ] **Step 1: Listar os arquivos a tocar**

```bash
cd /home/sousa/work/adila/stash/frontend
grep -rl 'lucide-react' src/
```

- [ ] **Step 2: Migrar arquivo por arquivo**

Para cada arquivo da lista: trocar o `from "lucide-react"` por `from "@phosphor-icons/react"`, renomear os ícones pela tabela acima e ajustar o JSX. Fazer um arquivo por vez e rodar `bunx tsc -b` a cada poucos — o compilador pega nome inexistente na hora.

Onde dois nomes Lucide viram o mesmo Phosphor (`Check`/`CheckIcon` → `Check`), o import pode ficar duplicado no mesmo arquivo. Nesse caso, importar uma vez e ajustar os usos.

- [ ] **Step 3: Tratar o caso `Loader2`**

`Loader2` é usado com `animate-spin`. `CircleNotch` é o equivalente e mantém a mesma classe:

```tsx
<CircleNotch className="size-4 animate-spin" />
```

- [ ] **Step 4: Confirmar que Lucide sumiu**

```bash
cd /home/sousa/work/adila/stash/frontend
grep -rn 'lucide-react' src/
```

Esperado: **nenhuma saída**.

- [ ] **Step 5: Verificar tipos e lint**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx tsc -b && bunx oxlint src/
```

Esperado: sem erros.

- [ ] **Step 6: Subir e varrer as telas atrás de ícone faltando**

```bash
cd /home/sousa/work/adila/stash
task dev
```

Conferir welcome, sidebar de repos, changes, history, detalhe de PR e settings. Ícone errado não quebra o build — só olhando.

- [ ] **Step 7: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/src
git commit -m "refactor: migrar ícones de Lucide para Phosphor"
```

---

### Task 10: Remover Radix e Lucide

**Files:**
- Modify: `frontend/package.json`

**Interfaces:**
- Consumes: as Tasks 7 e 9 já garantiram que nenhum import restou.

- [ ] **Step 1: Confirmar que nada importa mais**

```bash
cd /home/sousa/work/adila/stash/frontend
grep -rn '@radix-ui\|from "radix-ui"\|lucide-react' src/
```

Esperado: **nenhuma saída**. Se aparecer qualquer coisa, parar e voltar à task correspondente.

- [ ] **Step 2: Remover os oito pacotes**

```bash
cd /home/sousa/work/adila/stash/frontend
bun remove \
  @radix-ui/react-checkbox \
  @radix-ui/react-scroll-area \
  @radix-ui/react-separator \
  @radix-ui/react-slot \
  @radix-ui/react-tabs \
  radix-ui \
  lucide-react
```

São 7 no `bun remove`; o oitavo, `tw-animate-css`, **fica** — o tema Adila depende dele.

- [ ] **Step 3: Build de produção limpo**

```bash
cd /home/sousa/work/adila/stash/frontend
rm -rf node_modules/.vite && bun install && bun run build
```

Esperado: build verde. É a prova de que nenhuma dependência removida era usada em runtime.

- [ ] **Step 4: Commit**

```bash
cd /home/sousa/work/adila/stash
git add frontend/package.json frontend/bun.lock
git commit -m "chore: remover Radix e Lucide"
```

---

### Task 11: Verificação final

**Files:** nenhum — tarefa de verificação.

- [ ] **Step 1: Build completo do app**

```bash
cd /home/sousa/work/adila/stash
task build
```

Esperado: binário gerado em `bin/stash` sem erro.

- [ ] **Step 2: Teste offline das fontes**

O motivo de ter vendorizado as fontes. Desligar a rede e subir o app:

```bash
cd /home/sousa/work/adila/stash
./bin/stash
```

Esperado: a UI aparece em Adila Std e o diff em Adila Code, sem rede. Se cair para fonte de sistema, algum `@font-face` ainda aponta para `assets.adila.co` — conferir com `grep -rn 'assets.adila.co' frontend/public frontend/src`, que deve retornar vazio.

- [ ] **Step 3: Varredura das telas em light e dark**

Alternar o tema do SO e conferir cada tela nos dois modos: welcome, sidebar de repos, changes (stage/unstage, commit, push), history, detalhe de PR (incluindo a aba de commits), diff (unified e split), command palette, menubar e settings.

Atenção especial aos tokens de git no diff e na lista de changes: added em verde (`success`), deleted em vermelho (`destructive`), modified em âmbar (`warning`) e untracked em indigo (`primary`). Untracked ficar da mesma cor dos elementos primários é conhecido e aceito — está registrado no spec.

- [ ] **Step 4: Lint e format do repositório**

```bash
cd /home/sousa/work/adila/stash/frontend
bunx oxlint . && bunx oxfmt --check
```

Esperado: sem erros. Se o `oxfmt` reclamar, rodar `bunx oxfmt` e commitar.

- [ ] **Step 5: Commit final se houver formatação**

```bash
cd /home/sousa/work/adila/stash
git add -A frontend
git commit -m "chore: formatação após migração para o DS Adila" || echo "nada a commitar"
```
