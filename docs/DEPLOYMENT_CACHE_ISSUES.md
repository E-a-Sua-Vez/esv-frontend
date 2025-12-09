# Problemas de Cache e 404 após Deploy

## Erro Observado

```
Failed to load resource: the server responded with a status of 404
/assets/js/form-B46WmFlF.js
/assets/js/BusinessTracing-De-BoBEx.js

TypeError: Failed to fetch dynamically imported module
```

## Causa do Problema

Este erro ocorre quando:

1. **Novo build realizado**: Um novo deploy foi feito com novos hashes nos arquivos JavaScript
2. **Cache do navegador**: O navegador ainda tem em cache um `index.html` antigo que referencia arquivos com hashes antigos
3. **Arquivos removidos**: Os arquivos JavaScript antigos não existem mais no servidor
4. **Desincronização**: O HTML foi atualizado mas o navegador tenta carregar arquivos do cache antigo

## Soluções Imediatas (Para o Usuário)

### 1. Hard Refresh do Navegador
- **Windows/Linux**: `Ctrl + Shift + R` ou `Ctrl + F5`
- **Mac**: `Cmd + Shift + R`
- **Chrome DevTools**: Abrir DevTools (F12) → Clicar com botão direito no botão de refresh → "Empty Cache and Hard Reload"

### 2. Limpar Cache do Site
1. Abrir DevTools (F12)
2. Ir para a aba **Application** (ou **Armazenamento**)
3. Clicar em **Clear Storage** (ou **Limpar armazenamento**)
4. Marcar todas as opções
5. Clicar em **Clear site data** (ou **Limpar dados do site**)

### 3. Navegação Privada
Abrir o site em uma janela anônima/privada para testar sem cache

## Soluções de Longo Prazo (Para o Servidor/Deploy)

### 1. Verificar Deploy Completo

Certificar-se de que **todos os arquivos** do build foram deployados:

```bash
# Verificar se os arquivos existem no servidor
ls -la dist/assets/js/

# Verificar se o index.html referencia os arquivos corretos
grep -E "assets/js/" dist/index.html
```

### 2. Headers de Cache Otimizados

A configuração atual do Nginx está correta, mas podemos melhorar:

```nginx
# Assets com hash podem ter cache longo (seguro)
location ~* \.(js|css)$ {
    # Verificar se o arquivo tem hash no nome
    if ($request_uri ~* "[a-f0-9]{8}\.(js|css)$") {
        expires 1y;
        add_header Cache-Control "public, immutable";
    }
    # Sem hash = sem cache (arquivos que podem mudar)
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
}

# HTML nunca deve ter cache longo
location ~* \.html$ {
    expires -1;
    add_header Cache-Control "no-cache, no-store, must-revalidate";
    add_header Pragma "no-cache";
}
```

### 3. Service Worker (Opcional)

Se estiver usando Service Worker, certificar-se de que ele atualiza corretamente após novos deploys.

### 4. Versionamento de Assets

O Vite já gera hashes automaticamente. Certificar-se de que:

1. ✅ O build gera hashes únicos: `[name]-[hash].js`
2. ✅ O `index.html` é gerado com as referências corretas
3. ✅ Ambos são deployados juntos atomicamente

### 5. Estratégia de Deploy Atômico

Idealmente, o deploy deve ser **atômico** (todos os arquivos ou nenhum):

```bash
# Exemplo de deploy atômico
1. Build completo: npm run build:br
2. Upload para diretório temporário: /tmp/dist-new/
3. Verificar integridade
4. Mover atomicamente: mv /tmp/dist-new/* /usr/share/nginx/html/
```

## Verificações no Código

### Build Configuration

Verificar que o Vite está configurado corretamente:

```javascript
// vite.config-br.js
build: {
  rollupOptions: {
    output: {
      chunkFileNames: 'assets/js/[name]-[hash].js',
      entryFileNames: 'assets/js/[name]-[hash].js',
    },
  },
}
```

### Dynamic Imports

Os componentes são carregados dinamicamente via lazy loading:

```javascript
// src/router/interno/commerce.js
const BusinessTracing = () => import('@/views/business/BusinessTracing.vue');
```

Isso está correto. O problema não é o código, mas o cache/deploy.

## Monitoramento

### Verificar no Navegador

1. Abrir DevTools → Network
2. Verificar status das requisições:
   - ✅ 200: Arquivo encontrado
   - ❌ 404: Arquivo não encontrado (problema de cache/deploy)

### Verificar no Servidor

```bash
# Verificar arquivos no servidor
ls -la /usr/share/nginx/html/assets/js/

# Verificar logs do Nginx
tail -f /var/log/nginx/error.log
```

## Checklist de Deploy

Antes de fazer deploy:

- [ ] Build completo executado: `npm run build:br`
- [ ] Verificar que `dist/` contém todos os arquivos
- [ ] Verificar que `dist/index.html` existe e está atualizado
- [ ] Verificar que arquivos `dist/assets/js/*.js` existem
- [ ] Deploy de todos os arquivos juntos
- [ ] Verificar no servidor que os arquivos foram deployados
- [ ] Testar em navegação privada após deploy

Após deploy:

- [ ] Testar hard refresh
- [ ] Verificar console do navegador para erros 404
- [ ] Monitorar logs do servidor

## Contato e Suporte

Se o problema persistir após tentar todas as soluções:

1. Verificar logs do servidor
2. Verificar que o build foi completo
3. Verificar que todos os arquivos foram deployados
4. Verificar configuração do Nginx
5. Considerar adicionar headers `no-cache` temporariamente durante deploys





