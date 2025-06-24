#!/bin/bash

# Script de verificación del entorno de desarrollo local
echo "🔍 Verificando configuración del entorno de desarrollo..."

# Colores para output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Función para mostrar estado
check_status() {
    if [ $1 -eq 0 ]; then
        echo -e "${GREEN}✅ $2${NC}"
    else
        echo -e "${RED}❌ $2${NC}"
        return 1
    fi
}

echo -e "${BLUE}=== VERIFICACIÓN DE DEPENDENCIAS DEL SISTEMA ===${NC}"

# Verificar Node.js
node --version > /dev/null 2>&1
check_status $? "Node.js instalado: $(node --version 2>/dev/null || echo 'NO INSTALADO')"

# Verificar NPM
npm --version > /dev/null 2>&1
check_status $? "NPM instalado: $(npm --version 2>/dev/null || echo 'NO INSTALADO')"

# Verificar Git
git --version > /dev/null 2>&1
check_status $? "Git instalado: $(git --version 2>/dev/null || echo 'NO INSTALADO')"

# Verificar Ganache CLI
ganache-cli --version > /dev/null 2>&1
check_status $? "Ganache CLI instalado: $(ganache-cli --version 2>/dev/null || echo 'NO INSTALADO')"

echo -e "\n${BLUE}=== VERIFICACIÓN DEL PROYECTO ===${NC}"

# Verificar estructura del proyecto
[ -f "package.json" ]
check_status $? "package.json existe"

[ -f "hardhat.config.js" ]
check_status $? "hardhat.config.js existe"

[ -d "contracts" ]
check_status $? "Directorio contracts/ existe"

[ -f "contracts/DAO.sol" ]
check_status $? "contracts/DAO.sol existe"

[ -d "frontend" ]
check_status $? "Directorio frontend/ existe"

[ -f "frontend/package.json" ]
check_status $? "frontend/package.json existe"

echo -e "\n${BLUE}=== VERIFICACIÓN DE DEPENDENCIES ===${NC}"

# Verificar dependencias del proyecto principal
if [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ node_modules/ existe${NC}"
else
    echo -e "${YELLOW}⚠️  node_modules/ no existe. Ejecutar: npm install${NC}"
fi

# Verificar dependencias del frontend
if [ -d "frontend/node_modules" ]; then
    echo -e "${GREEN}✅ frontend/node_modules/ existe${NC}"
else
    echo -e "${YELLOW}⚠️  frontend/node_modules/ no existe. Ejecutar: cd frontend && npm install${NC}"
fi

echo -e "\n${BLUE}=== VERIFICACIÓN DE GANACHE ===${NC}"

# Verificar si Ganache está corriendo
if curl -s -X POST -H "Content-Type: application/json" \
   --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
   http://localhost:8545 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ Ganache está ejecutándose en puerto 8545${NC}"
    
    # Obtener información de Ganache
    NETWORK_ID=$(curl -s -X POST -H "Content-Type: application/json" \
                 --data '{"jsonrpc":"2.0","method":"net_version","params":[],"id":1}' \
                 http://localhost:8545 | grep -o '"result":"[^"]*"' | cut -d'"' -f4)
    
    ACCOUNTS=$(curl -s -X POST -H "Content-Type: application/json" \
               --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
               http://localhost:8545 | grep -o '"0x[^"]*"' | wc -l)
    
    echo -e "  ${BLUE}Network ID: ${NETWORK_ID:-'N/A'}${NC}"
    echo -e "  ${BLUE}Cuentas disponibles: ${ACCOUNTS:-'N/A'}${NC}"
else
    echo -e "${RED}❌ Ganache no está ejecutándose${NC}"
    echo -e "${YELLOW}💡 Para iniciar Ganache ejecutar:${NC}"
    echo -e "   ganache-cli --port 8545 --networkId 1337 --deterministic"
fi

echo -e "\n${BLUE}=== VERIFICACIÓN DE COMPILACIÓN ===${NC}"

# Verificar si los contratos están compilados
if [ -d "artifacts/contracts" ]; then
    echo -e "${GREEN}✅ Contratos compilados${NC}"
    echo -e "  ${BLUE}Archivos: $(find artifacts/contracts -name "*.json" | wc -l)${NC}"
else
    echo -e "${YELLOW}⚠️  Contratos no compilados. Ejecutar: npm run compile${NC}"
fi

echo -e "\n${BLUE}=== VERIFICACIÓN DE DEPLOYMENT ===${NC}"

# Verificar información de deployment local
if [ -f "deployment-info-local.json" ]; then
    echo -e "${GREEN}✅ deployment-info-local.json existe${NC}"
    
    CONTRACT_ADDRESS=$(grep -o '"contractAddress":"[^"]*"' deployment-info-local.json | cut -d'"' -f4)
    if [ -n "$CONTRACT_ADDRESS" ]; then
        echo -e "  ${BLUE}Dirección del contrato: ${CONTRACT_ADDRESS}${NC}"
    fi
else
    echo -e "${YELLOW}⚠️  deployment-info-local.json no existe${NC}"
    echo -e "${YELLOW}💡 Para deployar: npm run deploy:local${NC}"
fi

echo -e "\n${BLUE}=== VERIFICACIÓN DEL FRONTEND ===${NC}"

# Verificar configuración del frontend
if [ -f "frontend/src/App.js" ]; then
    echo -e "${GREEN}✅ frontend/src/App.js existe${NC}"
    
    # Verificar dirección del contrato en App.js
    FRONTEND_ADDRESS=$(grep -o 'DAO_CONTRACT_ADDRESS = "[^"]*"' frontend/src/App.js | cut -d'"' -f2)
    if [ -n "$FRONTEND_ADDRESS" ]; then
        echo -e "  ${BLUE}Dirección configurada: ${FRONTEND_ADDRESS}${NC}"
        
        # Verificar si coincide con el deployment
        if [ -f "deployment-info-local.json" ]; then
            CONTRACT_ADDRESS=$(grep -o '"contractAddress":"[^"]*"' deployment-info-local.json | cut -d'"' -f4)
            if [ "$FRONTEND_ADDRESS" = "$CONTRACT_ADDRESS" ]; then
                echo -e "${GREEN}✅ Dirección del frontend coincide con deployment${NC}"
            else
                echo -e "${YELLOW}⚠️  Dirección del frontend NO coincide con deployment${NC}"
                echo -e "${YELLOW}💡 Actualizar App.js con: ${CONTRACT_ADDRESS}${NC}"
            fi
        fi
    fi
else
    echo -e "${RED}❌ frontend/src/App.js no existe${NC}"
fi

echo -e "\n${BLUE}=== RESUMEN DE COMANDOS ÚTILES ===${NC}"
echo -e "${YELLOW}Instalación completa:${NC}     npm run install-all"
echo -e "${YELLOW}Compilar contratos:${NC}      npm run compile"
echo -e "${YELLOW}Ejecutar tests:${NC}          npm test"
echo -e "${YELLOW}Deploy local:${NC}            npm run deploy:local"
echo -e "${YELLOW}Iniciar frontend:${NC}        npm run start"
echo -e "${YELLOW}Verificar Ganache:${NC}       npm run check-ganache"
echo -e "${YELLOW}Setup completo:${NC}          npm run setup-local"

echo -e "\n${BLUE}=== VERIFICACIÓN COMPLETADA ===${NC}"
echo -e "Si todo está ${GREEN}✅${NC}, el sistema está listo para usar!"
echo -e "Si hay elementos ${RED}❌${NC} o ${YELLOW}⚠️${NC}, seguir las instrucciones mostradas."
