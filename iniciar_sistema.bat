@echo off
echo Iniciando o Servidor (Backend)...
start cmd /k "cd backend && npm run dev"

echo Iniciando a Interface (Frontend)...
start cmd /k "cd frontend && npm run dev"

echo Servicos iniciados em novas janelas!
