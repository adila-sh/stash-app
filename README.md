# stash

Um cliente Git/GitHub minimalista para desktop. Sem ruído, sem janelas piscando, sem menus em cascata. Só o que importa: commits, diffs, branches.

```
   ▓▒░ stash ░▒▓
```

## O que é

`stash` é um app desktop leve construído em **Wails 3 + Go + React**, pensado para quem quer a clareza de um cliente gráfico sem abrir mão da postura tipográfica do terminal. Tudo é monoespaçado, denso e direto. As animações existem só pra dar continuidade visual — nada de splash screens.

Conheça o **Stashie**, a amebinha mascote que aparece nos estados vazios pra fazer companhia enquanto você decide qual commit revisar.

## Recursos

- **Múltiplos repositórios** — coleção persistida no backend Go, com pin, busca e fixação de favoritos.
- **Welcome screen** com seletor nativo de pasta (`⌘O`), clone direto do GitHub via OAuth e lista dos repos abertos recentemente.
- **Sidebar colapsável** que vira uma coluna de iniciais quando você precisa de mais espaço pro diff.
- **Histórico navegável** com atalhos `J`/`K` estilo vim, busca de arquivo dentro do commit, autor, data relativa e corpo da mensagem.
- **Diff viewer** baseado em `@git-diff-view/react` com modos unified/split, syntax highlighting, line wrap, ajuste de tab e tipografia configurável.
- **Branch selector** integrado ao header: troca de branch, criação local, push e abertura de Pull Request no GitHub direto pelo app.
- **Página de configurações** com painel de preview ao vivo do diff, tema (incluindo `ultra-dark`), fonte (Google Sans Code por padrão), raio de borda, opacidade da janela, tinta de destaque e modo compacto.
- **Branding ASCII com glitch** no welcome e na tela "Sobre", no espírito de quem cresceu vendo CRT.
- **Atalhos globais** com `@tanstack/react-hotkeys` e `Kbd` consistentes pelo app.
- **Janela translúcida** opcional (frosted) pra quem usa wallpaper e gosta de compor com o desktop.

## Stack

- **Backend**: Go + Wails v3 (alpha) — `gitservice.go` orquestra `git`, `github.go` faz autenticação OAuth e cria PRs, `config.go` persiste a coleção de repos.
- **Frontend**: React 19 + TypeScript + Vite 6, TanStack Router (file-based), Zustand (com `persist`), framer-motion, Tailwind v4, shadcn/ui.
- **Tipografia**: Google Sans Code como padrão, com fallback para a stack monoespaçada do sistema.

## Rodando localmente

```bash
# dev (hot reload do front e do back)
wails3 dev

# build de produção
wails3 build
```

O executável final fica em `build/`. O frontend isolado vive em `frontend/` e pode ser tocado com `bun dev` se você quiser iterar só na UI.

## Estrutura

- `main.go` — bootstrap do app Wails e registro de serviços.
- `gitservice.go` — operações de git (log, diff, checkout, branch, push).
- `github.go` — auth OAuth com GitHub, criação de PR.
- `config.go` — persistência da lista de repositórios.
- `frontend/src/routes/` — rotas (`history`, `settings`, `about`, etc.) via TanStack Router.
- `frontend/src/components/` — UI: `BranchSelector`, `DiffViewer`, `RepoSidebar`, `Mascot`, `AsciiGlitch`, etc.
- `frontend/src/lib/` — contexto de repo, store de configurações, cliente git e github gerados via Wails bindings.

## Filosofia

- **Tudo em uma janela.** Sem modais empilhados, sem painéis flutuantes — o estado mora em colunas.
- **Texto antes de ícone.** Ícones acompanham, não substituem.
- **Densidade controlada.** Configurável, mas o default já cabe muita coisa em pouco espaço.
- **Sem cerimônia.** Você abre, escolhe um repo, vê o diff. Pronto.

---

Feito com `█` e um pouco de glitch.
