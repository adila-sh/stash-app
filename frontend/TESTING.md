# Mapa de testes do frontend

Este documento mapeia a superfície funcional do aplicativo e aponta onde cada comportamento é validado. Componentes primitivos do design system, bindings gerados pelo Wails, bootstrap e o shim de syntax highlight não entram na métrica de cobertura; eles são infraestrutura ou código externo/gerado.

## Funcionalidades mapeadas

| Área                | Funções e fluxos validados                                                                                  | Testes                                                                                   |
| ------------------- | ----------------------------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------- |
| Repositórios        | hidratação, seleção, abertura por pasta, clone GitHub, remoção e estado ativo                               | `routes/-routes.smoke.test.tsx`, `lib/adapters.test.ts`                                  |
| Organização         | criar, renomear, excluir e reordenar coleções; mover, fixar, limpar referências e recolher sidebar          | `routes/-routes.smoke.test.tsx`, `lib/stores.test.ts`                                    |
| Working tree        | status, stage/unstage, descarte de tracked/untracked, commit, stash, push e estados vazios                  | `routes/-routes.smoke.test.tsx`, `components/interface.test.tsx`, `lib/adapters.test.ts` |
| Branches            | listar, buscar, checkout, criar, publicar e detectar árvore suja                                            | `routes/-routes.smoke.test.tsx`, `components/interface.test.tsx`, `lib/core.test.ts`     |
| Histórico           | carregar log, navegar por teclado, selecionar commit e obter diff                                           | `routes/-routes.smoke.test.tsx`, `lib/adapters.test.ts`                                  |
| Diff                | texto, split/unified, vazio, loading, lockfile, binário, imagens, marcação, comentários e contagens         | `components/diff-and-auth.test.tsx`, `components/content.test.tsx`, `lib/core.test.ts`   |
| GitHub Auth         | hidratação, eventos, device flow, cópia/abertura, cancelamento, erros e logout                              | `hooks/hooks.test.tsx`, `components/diff-and-auth.test.tsx`                              |
| Pull requests       | autenticação, listagem/filtros, detalhe, conversa, comentários, reviews, commits, arquivos, merge e criação | `routes/-routes.smoke.test.tsx`, `components/content.test.tsx`                           |
| Configurações       | leitura/gravação/reset no Wails, persistência Zustand e efeitos no documento                                | `lib/adapters.test.ts`, `lib/stores.test.ts`, `routes/-routes.smoke.test.tsx`            |
| Janela Wails        | minimizar, maximizar/restaurar, fechar, menu, links externos e eventos                                      | `components/interface.test.tsx`, `components/content.test.tsx`                           |
| Responsividade/tema | breakpoint móvel, mudanças do sistema e classe dark                                                         | `hooks/hooks.test.tsx`                                                                   |
| Utilitários         | mensagens de erro, tempo relativo, parsing e contagem de diff, erros GitHub                                 | `lib/core.test.ts`                                                                       |
| Adaptadores backend | todas as operações públicas de Config, Git e GitHub e seus argumentos/defaults                              | `lib/adapters.test.ts`, `lib/github-adapter.test.ts`                                     |

## Comandos

- `bun run test`: suíte completa.
- `bun run test:coverage`: suíte com relatório V8 e limites mínimos.
- `bun run test:watch`: desenvolvimento guiado por testes.
- `bun run lint`: análise estática com Oxlint.
- `bun run format:check`: validação com Oxfmt.

Os testes de rota são executados com router em memória e mocks das APIs Wails v3. Os adaptadores continuam sendo validados separadamente para garantir os nomes, IDs, argumentos e valores default enviados ao backend.
