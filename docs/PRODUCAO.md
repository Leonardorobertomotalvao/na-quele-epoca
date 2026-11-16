# Procedimento de publicação em produção

## Estado confirmado localmente

- Branch de trabalho: `atualizacao-tcc-2026-11-16`, commit `d1cf2ff`.
- Produção Git esperada: `main` (inferido do fluxo Git/Vercel usual; precisa confirmação no painel Vercel, inacessível neste ambiente).
- Provedor do schema Prisma: PostgreSQL.
- A branch inclui migrações aditivas de Oficina/moderação e eventos de auditoria. Não executam `DROP`, `TRUNCATE`, reset nem apagam linhas.
- A migração de eventos cria tabela, índices e FKs opcionais com `ON DELETE SET NULL`; mantém eventos se autor ou sugestão forem apagados.
- A migração da Oficina cria tabelas/enums, acrescenta colunas booleanas com default e índices/FKs. A FK de autoria da Oficina usa `ON DELETE CASCADE` em exclusão futura explícita de usuário; isso não é executado pela migração.
- Compatibilidade: código antigo pode coexistir com tabelas/colunas novas. O código desta branch depende do novo schema, portanto aplicar migrações antes de ativar o deployment novo. A aprovação continua criando estado `APROVADO` consumido pela API já existente do catálogo.

## Bloqueios antes de produção

1. Obter backup nativo do provedor, com PITR/snapshot e export lógico consistente se disponível.
2. Verificar que o backup terminou, guardar identificador/data/localização protegida e executar restauração em instância separada. Backup sem restauração testada não conta como recuperável.
3. Conferir no painel da Vercel qual branch está marcada como Production Branch e se os ambientes Production têm `DATABASE_URL`, `BETTER_AUTH_URL`, `GOOGLE_CLIENT_ID` e `GOOGLE_CLIENT_SECRET` válidos. Nunca copiar valores para logs ou PR.
4. Confirmar que o fluxo de e-mail/password verifica e-mail na produção e que Google OAuth tem origem/callback correspondentes ao domínio oficial. A aplicação exige `User.emailVerified`; sem verificação real, usuários não poderão enviar sugestões. O build atual avisou que `BETTER_AUTH_URL` não estava disponível no ambiente local; isso não prova o estado da Vercel.
5. Abrir e revisar o PR para `main`; aguardar aprovação explícita antes de merge ou migração produtiva.

## Ordem recomendada, após backup testado e aprovação

1. Pausar alterações/moderação durante a janela; confirmar snapshot recuperável e estado/latência do banco.
2. Em job protegido de CI, usar secrets do ambiente Production e executar `prisma migrate deploy` uma única vez, com concorrência exclusiva. Não usar `migrate dev`, `db push` ou reset.
3. Se a migração falhar, parar o deploy e preservar logs sem URLs/segredos. Não editar `_prisma_migrations` manualmente. Avaliar rollback por restauração do snapshot/PITR com responsável pelo banco.
4. Após migração aprovada, promover o commit revisado a `main` e aguardar o deployment de produção da Vercel.
5. Fazer smoke test: login, leitura do catálogo, envio autenticado com e-mail verificado, acesso admin, aprovar/rejeitar e consultar evento. Não publicar conteúdo de teste em produção; usar uma sugestão interna real apenas com autorização.
6. Monitorar erros da aplicação, auth e banco. Manter o snapshot até terminar o período acordado de observação.

## Rollback

As migrações não têm rollback SQL automático. Como são aditivas, a reversão preferida do código é redeploy do commit anterior mantendo as tabelas/colunas adicionadas. Se houver corrupção ou necessidade de restaurar dados, restaurar o snapshot/PITR em procedimento coordenado; isso pode perder gravações posteriores ao instante escolhido e requer autorização específica. Não remover tabelas novas enquanto houver versão de código que as use.

## Evidências ainda necessárias

Este ambiente local não tem acesso de leitura ao painel de backup do PostgreSQL nem às configurações de produção da Vercel. Não é possível confirmar existência, idade, retenção ou restauração de backup; branch de produção; segredos necessários; estado real de verificação de e-mails; nem executar migração. Solicitar esses comprovantes no painel, sem compartilhar credenciais, antes da autorização final.
