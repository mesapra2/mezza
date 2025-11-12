#!/bin/bash
# 🔒 Script SIMPLES para corrigir commit com .history/

set -e

echo "🚨 ============================================"
echo "   CORRIGINDO COMMIT - Removendo .history/"
echo "============================================"
echo ""

# Cores
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# 1. Desfazer último commit (mantendo alterações)
echo -e "${YELLOW}1️⃣  Desfazendo último commit...${NC}"
git reset --soft HEAD~1
echo -e "${GREEN}✅ Feito!${NC}"
echo ""

# 2. Remover APENAS .history/
echo -e "${YELLOW}2️⃣  Removendo .history/ do Git...${NC}"
git rm -r --cached .history/ 2>/dev/null || echo "  .history/ já foi removida"
echo -e "${GREEN}✅ Feito!${NC}"
echo ""

# 3. Adicionar proteção no .gitignore
echo -e "${YELLOW}3️⃣  Adicionando proteção ao .gitignore...${NC}"

# Verificar se já tem a proteção
if ! grep -q ".history/" .gitignore 2>/dev/null; then
    echo "" >> .gitignore
    echo "# ============================================" >> .gitignore
    echo "# 🔒 HISTÓRICO DO VSCODE" >> .gitignore
    echo "# ============================================" >> .gitignore
    echo ".history/" >> .gitignore
    echo ".history/**/*" >> .gitignore
    echo "**/.history/" >> .gitignore
    echo -e "${GREEN}✅ .gitignore atualizado!${NC}"
else
    echo -e "${GREEN}✅ .gitignore já tem a proteção!${NC}"
fi
echo ""

# 4. Adicionar tudo de novo
echo -e "${YELLOW}4️⃣  Adicionando arquivos ao commit...${NC}"
git add .
echo ""

# Mostrar o que será commitado
echo -e "${GREEN}📋 Arquivos que serão commitados:${NC}"
git status --short
echo ""

# 5. Commitar
echo -e "${YELLOW}5️⃣  Fazendo commit...${NC}"
git commit -m "masterupdate5"
echo -e "${GREEN}✅ Commit feito!${NC}"
echo ""

# 6. Push
echo -e "${YELLOW}6️⃣  Fazendo push...${NC}"
git push --set-upstream origin main

echo ""
echo -e "${GREEN}🎉 ============================================"
echo "   PRONTO! Push realizado com sucesso!"
echo "============================================${NC}"
echo ""