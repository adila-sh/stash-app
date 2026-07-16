# Migração do Stash para o Design System Adila

Data: 2026-07-16
Status: aprovado para planejamento

## Objetivo

Adotar o design system `ds.adila.co` no frontend do Stash: tokens, componentes e
ícones. O Stash passa a parecer um produto Adila — indigo, fontes Adila, light e
dark — abandonando a identidade atual de terminal preto puro.

## Contexto

O registry `https://ds.adila.co/r/registry.json` expõe 62 itens (`adila-ui`),
construídos sobre **Base UI** (`@base-ui/react`) com ícones **Phosphor**. O Stash
hoje usa forks do shadcn sobre **Radix** com ícones **Lucide**.

Levantamento que sustenta o plano:

| Fato | Consequência |
|---|---|
| Radix só é importado dentro de `src/components/ui/*` (10 arquivos) | Migração confinada; nenhum componente de aplicação toca Radix |
| `asChild`: 20 ocorrências em `ui/`, 0 no app | Some junto com os arquivos trocados |
| Os 16 `ui/*` existem no registry | Nenhum componente órfão |
| Exports batem 1:1, exceto o tipo `ButtonProps` (uso interno) | Call sites não mudam |
| Variantes de Button do DS são superset das nossas (`+xs`) | Nenhuma variante em uso se perde |
| Lucide em 25 arquivos | Maior volume do trabalho, risco baixo |

## Decisões

1. **Tema Adila por completo.** Os blocos `ultra-*` do `globals.css` são removidos.
2. **Componentes do registry.** Migração Radix → Base UI nos 16 `ui/*`.
3. **Seletores de aparência removidos.** `theme`, `radius`, `accentTint` e
   `monoFont` saem do `settings-store` e da tela de settings.
4. **Light/dark segue o SO.** Consequência direta da decisão 3: sem seletor de
   tema, a escolha vem de `prefers-color-scheme`.
5. **Fontes servidas localmente.** O Stash é app desktop (Wails) e precisa
   funcionar offline.

## Arquitetura

### 1. Tokens (`src/globals.css`)

- Remover os blocos `[data-theme="ultra-*"]` e os `@font-face` do Google Sans Code.
- Inserir os `cssVars` do item `adila-theme` em `light` e `dark`, e o bloco
  `@theme` com `radius: 0.375rem`, `font-sans`, `font-mono` e `font-pixel`.
- Trocar o `@custom-variant dark` de `[data-theme="ultra-dark"]` para
  `&:where(.dark, .dark *)`, a convenção do shadcn/DS. A classe `.dark` no
  `<html>` passa a ser escrita por um hook que observa
  `matchMedia("(prefers-color-scheme: dark)")` — é o que liga a decisão 4 ao
  CSS, e a mesma fonte de verdade que o DiffViewer consome.

**Gap:** o DS não define os tokens de git. Mapear sobre a paleta semântica do DS
em vez de introduzir cores fora do sistema:

| Token Stash | Token DS |
|---|---|
| `--added` | `success` |
| `--deleted` | `destructive` |
| `--modified` | `warning` |
| `--untracked` | `primary` |

### 2. Fontes

O `adila-theme` traz `@import "https://assets.adila.co/adila-fonts.css"`, que
carrega woff2 do R2 por rede. Offline, isso degrada silenciosamente para o
fallback do sistema.

Baixar os woff2 de Adila Std (10 arquivos), Adila Code (12) e Adila Pixel (1)
para `public/fonts/` e declarar os `@font-face` localmente, sem o `@import`
remoto. A quarta família do CSS remoto, "Adila Code Proportional" (12 arquivos),
fica de fora: nenhum token do tema a referencia.

### 3. Componentes

- Instalar `@base-ui/react` (1.6.0) e `@phosphor-icons/react` (2.1.10).
- Substituir os 16 `ui/*` pelo conteúdo de `https://ds.adila.co/r/<nome>.json`.
- Remover os 7 pacotes `@radix-ui/*` e `radix-ui` do `package.json`.

**Correção ao "fora de escopo":** o fecho transitivo do registry exige dois
componentes que não temos hoje — `menubar` importa `dropdown-menu` e `command`
importa `input-group`. Ambos entram por necessidade, não por escolha. O fecho
completo é 18 componentes (16 nossos + 2) mais o hook `use-mobile`, que já
existe em `src/hooks/use-mobile.ts`.

Ordem por superfície crescente, para falhar cedo e barato:

1. `skeleton`, `separator`, `kbd`, `card`, `input`, `textarea`
2. `button`, `checkbox`, `tabs`, `tooltip`, `scroll-area`
3. `dialog`, `sheet`, `command`, `menubar`, `sidebar`

### 4. Ícones

25 arquivos migram de Lucide para Phosphor. Nomes mudam (`ChevronRight` →
`CaretRight`) e o peso é prop (`weight`), não variante de import.

### 5. Settings

`src/lib/settings-store.ts`:

- Remover os tipos `Theme`, `MonoFont`, `Radius`, `AccentTint`.
- Remover `MONO_STACKS`, `MONO_FONT_LABELS`, `ACCENT_TINTS`.
- Em `applySettings`, remover a escrita de `--font-sans`, `--font-mono`,
  `--radius` e `--accent`, e o `root.dataset.theme`. Preservar
  `--window-bg-alpha`, `--window-blur` e `data-reduce-motion`.
- Bump do `persist` para `version: 5`, com `migrate` descartando as quatro
  chaves removidas do estado persistido.

Permanecem: `windowOpacity`, `windowBlur`, `reduceMotion`, `diffFontSize`,
`diffStyle`, `showLineNumbers`, `wrapLines`, `syntaxHighlight`, `tabWidth`,
`showFileHeader`, `compactMode`.

`src/routes/_layout/settings.tsx`: remover as seções de tema, fonte mono, radius
e accent tint.

**Efeito colateral esperado e desejado:** hoje `applySettings` sobrescreve
`--font-sans` com a stack **mono**, então a UI inteira é monoespaçada. Removendo
essa linha, a UI passa a usar Adila Std e só o código continua mono. É a mudança
visual mais perceptível do trabalho.

### 6. DiffViewer

`src/components/DiffViewer.tsx:217` deriva o tema do diff de
`settings.theme === "ultra-dark"`. Substituir por um hook `useColorScheme` que
lê `matchMedia("(prefers-color-scheme: dark)")` e reage a mudanças.

## Verificação

- `tsc -b` e `oxlint .` ao fim de cada onda de componentes.
- Rodar o app e conferir, em light e dark: welcome, changes, history, detalhe de
  PR (incluindo a aba de commits), diff e settings.
- Conferir as fontes com a rede desligada.

## Fora de escopo

- Componentes do registry fora do fecho transitivo (combobox, popover, sonner,
  empty, item, field, spinner, chart...). Entram quando houver necessidade real.
  `dropdown-menu` e `input-group` **não** estão aqui: são exigidos pelo fecho.
- Redesenho de telas. Este trabalho troca a base visual, não a composição.
