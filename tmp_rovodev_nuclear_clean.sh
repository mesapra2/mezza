#!/bin/bash

echo "🚨 LIMPEZA NUCLEAR DO GIT - REMOVENDO HISTÓRICO COMPLETO"

# Fazer backup das alterações atuais
echo "📦 Fazendo backup das alterações..."
git stash push -m "backup-before-nuclear-clean"

# Criar nova branch órfã (sem histórico)
echo "🆕 Criando nova branch sem histórico..."
git checkout --orphan clean-main

# Adicionar todos os arquivos atuais (limpos)
echo "📁 Adicionando arquivos limpos..."
git add .

# Commit inicial limpo
echo "💾 Criando commit inicial limpo..."
git commit -m "Initial clean commit - removed all sensitive data"

# Deletar a branch main antiga
echo "🗑️ Removendo branch main com histórico contaminado..."
git branch -D main

# Renomear a nova branch para main
echo "🔄 Renomeando branch limpa para main..."
git branch -m main

# Force push (vai sobrescrever completamente o repositório)
echo "🚀 Enviando branch limpa (FORÇA)..."
git push -f origin main

echo ""
echo "✅ LIMPEZA NUCLEAR CONCLUÍDA!"
echo "🔥 Todo o histórico foi removido"
echo "📋 Apenas o commit atual (limpo) existe agora"
echo ""
echo "⚠️ IMPORTANTE: Avise a equipe que o histórico foi reescrito!"