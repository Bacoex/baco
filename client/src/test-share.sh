#!/bin/bash

# Script para executar apenas os testes relacionados ao compartilhamento de eventos
# Útil para testar rapidamente as mudanças no componente ShareEventDialog

echo "Executando testes para o componente de compartilhamento de eventos..."
npm test -- --testPathPattern=share