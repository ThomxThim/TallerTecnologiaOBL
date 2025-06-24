# 🚀 GUÍA COMPLETA - Ejecución Local del Sistema DAO

## 📋 **Requisitos del Sistema**
- **OS**: Ubuntu 24.04
- **Node.js**: v18.0.0 o superior
- **NPM**: v9.0.0 o superior
- **Visual Studio Code**: Para visualizar el proyecto
- **Ganache**: Para simular red Ethereum
- **Git**: Para clonar el repositorio

---

## 🛠️ **PASO 1: Instalación de Dependencias del Sistema**

### 1.1 Actualizar Sistema Ubuntu
```bash
sudo apt update && sudo apt upgrade -y
```

### 1.2 Instalar Node.js y NPM
```bash
# Instalar Node.js 18.x
curl -fsSL https://deb.nodesource.com/setup_18.x | sudo -E bash -
sudo apt-get install -y nodejs

# Verificar instalación
node --version  # Debe ser v18.x.x o superior
npm --version   # Debe ser v9.x.x o superior
```

### 1.3 Instalar Git
```bash
sudo apt install git -y
git --version
```

### 1.4 Instalar Visual Studio Code
```bash
# Descargar e instalar VS Code
wget -qO- https://packages.microsoft.com/keys/microsoft.asc | gpg --dearmor > packages.microsoft.gpg
sudo install -o root -g root -m 644 packages.microsoft.gpg /etc/apt/trusted.gpg.d/
sudo sh -c 'echo "deb [arch=amd64,arm64,armhf signed-by=/etc/apt/trusted.gpg.d/packages.microsoft.gpg] https://packages.microsoft.com/repos/code stable main" > /etc/apt/sources.list.d/vscode.list'
sudo apt update
sudo apt install code -y

# Verificar instalación
code --version
```

### 1.5 Instalar Ganache CLI
```bash
# Instalar Ganache CLI globalmente
npm install -g ganache-cli

# Verificar instalación
ganache-cli --version
```

---

## 📥 **PASO 2: Clonar y Configurar el Proyecto**

### 2.1 Clonar el Repositorio
```bash
# Clonar el proyecto
git clone [URL_DEL_REPOSITORIO]
cd TallerTecnologiaOBL

# Verificar estructura del proyecto
ls -la
```

### 2.2 Instalar Dependencias del Proyecto
```bash
# Instalar dependencias del proyecto principal (Smart Contracts)
npm install

# Instalar dependencias del frontend
cd frontend
npm install
cd ..

# O usar el script combinado
npm run install-all
```

### 2.3 Verificar Instalación
```bash
# Verificar que Hardhat esté disponible
npx hardhat --version

# Listar scripts disponibles
npm run
```

---

## 🔧 **PASO 3: Configuración de Ganache**

### 3.1 Iniciar Ganache
```bash
# Opción 1: Ganache con configuración básica
ganache-cli --port 8545 --networkId 1337 --accounts 10 --deterministic

# Opción 2: Ganache con configuración personalizada (RECOMENDADO)
ganache-cli \
  --port 8545 \
  --networkId 1337 \
  --accounts 10 \
  --deterministic \
  --mnemonic "test test test test test test test test test test test junk" \
  --balance 1000 \
  --gasLimit 12000000 \
  --gasPrice 20000000000
```

**⚠️ IMPORTANTE**: Deja esta terminal abierta. Ganache debe estar ejecutándose para que funcione el sistema.

### 3.2 Verificar Conexión con Ganache
```bash
# En una nueva terminal, verificar que Ganache esté funcionando
curl -X POST -H "Content-Type: application/json" \
  --data '{"jsonrpc":"2.0","method":"eth_accounts","params":[],"id":1}' \
  http://localhost:8545
```

**Respuesta esperada**: Lista de 10 direcciones Ethereum.

---

## 🔥 **PASO 4: Compilar y Desplegar Smart Contracts**

### 4.1 Compilar Contratos
```bash
# Compilar todos los contratos
npm run compile

# Verificar compilación exitosa
ls -la artifacts/contracts/
```

### 4.2 Ejecutar Tests (Opcional pero Recomendado)
```bash
# Ejecutar todos los tests
npm test

# Ejecutar tests con cobertura
npm run test:coverage
```

**Resultado esperado**: Tests pasando con ~98% de cobertura.

### 4.3 Desplegar Contrato en Ganache
```bash
# Desplegar el contrato DAO en la red local
npx hardhat run scripts/deploy.js --network localhost
```

**⚠️ IMPORTANTE**: Guarda la dirección del contrato que aparece en la consola. La necesitarás para el frontend.

**Ejemplo de salida:**
```
DAO deployed to: 0x5FbDB2315678afecb367f032d93F642f64180aa3
```

---

## 🎨 **PASO 5: Configurar y Ejecutar Frontend**

### 5.1 Actualizar Dirección del Contrato
```bash
# Abrir el archivo del frontend
code frontend/src/App.js
```

**Buscar la línea:**
```javascript
const DAO_CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";
```

**Cambiar por la dirección obtenida en el deploy:**
```javascript
const DAO_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3"; // Tu dirección
```

### 5.2 Ejecutar Frontend
```bash
# Desde la carpeta raíz del proyecto
cd frontend
npm start

# O usar el script desde la raíz
npm run start
```

**El frontend estará disponible en**: http://localhost:3000

---

## 🦊 **PASO 6: Configurar MetaMask**

### 6.1 Instalar MetaMask
- Descargar e instalar MetaMask desde: https://metamask.io/
- Crear una nueva wallet o importar una existente

### 6.2 Configurar Red Local
1. **Abrir MetaMask**
2. **Hacer clic en el selector de red** (arriba)
3. **Seleccionar "Agregar red"**
4. **Agregar red personalizada:**
   - **Nombre de la red**: `Ganache Local`
   - **Nueva URL de RPC**: `http://127.0.0.1:8545`
   - **ID de cadena**: `1337`
   - **Símbolo de moneda**: `ETH`
   - **URL del explorador de bloques**: (dejar vacío)

### 6.3 Importar Cuenta de Ganache
1. **En MetaMask, hacer clic en el icono de cuenta**
2. **Seleccionar "Importar cuenta"**
3. **Copiar una private key de Ganache** (desde la terminal donde corre Ganache)
4. **Pegar la clave privada y confirmar**

**Ejemplo de clave privada de Ganache:**
```
0x4f3edf983ac636a65a842ce7c78d9aa706d3b113bce9c46f30d7d21715b23b1d
```

---

## 🚀 **PASO 7: Verificar que Todo Funciona**

### 7.1 Checklist de Verificación
- [ ] **Ganache ejecutándose** en puerto 8545
- [ ] **Contratos compilados** sin errores
- [ ] **Contrato desplegado** con dirección válida
- [ ] **Frontend ejecutándose** en puerto 3000
- [ ] **MetaMask configurado** con red local
- [ ] **Cuenta con ETH** importada desde Ganache

### 7.2 Prueba de Funcionalidad
1. **Abrir http://localhost:3000**
2. **Conectar MetaMask** (debería mostrar tu balance de ETH)
3. **Probar comprar tokens** con una pequeña cantidad de ETH
4. **Verificar que la transacción se procese** correctamente

---

## 📁 **Estructura del Proyecto**

```
TallerTecnologiaOBL/
├── contracts/                 # Smart contracts
│   ├── DAO.sol               # Contrato principal del DAO
│   └── interface/
│       └── IDAO.sol          # Interfaz del DAO
├── scripts/                  # Scripts de deploy y utils
│   ├── deploy.js             # Script de deploy principal
│   ├── deploy-testnet.js     # Deploy para testnets
│   └── verify-contract.js    # Verificación en Etherscan
├── test/                     # Tests unitarios
│   └── DAO.test.js           # Tests del contrato DAO
├── frontend/                 # Aplicación React
│   ├── src/
│   │   ├── App.js            # Aplicación principal
│   │   ├── index.js          # Punto de entrada
│   │   └── index.css         # Estilos
│   ├── public/
│   └── package.json          # Dependencias del frontend
├── hardhat.config.js         # Configuración de Hardhat
├── package.json              # Dependencias del proyecto
└── .env                      # Variables de entorno
```

---

## 🔧 **Scripts NPM Disponibles**

| Script | Descripción |
|--------|-------------|
| `npm run compile` | Compilar contratos |
| `npm test` | Ejecutar tests |
| `npm run test:coverage` | Tests con cobertura |
| `npm run deploy` | Desplegar en localhost |
| `npm run start` | Ejecutar frontend |
| `npm run install-all` | Instalar todas las dependencias |

---

## 🐛 **Solución de Problemas Comunes**

### Problema: "Cannot connect to Ganache"
**Solución:**
```bash
# Verificar que Ganache esté corriendo
ps aux | grep ganache

# Si no está corriendo, iniciarlo
ganache-cli --port 8545 --networkId 1337 --deterministic
```

### Problema: "Contract not deployed"
**Solución:**
```bash
# Re-compilar y re-desplegar
npm run compile
npx hardhat run scripts/deploy.js --network localhost

# Actualizar la dirección en App.js
```

### Problema: "MetaMask connection failed"
**Solución:**
1. Verificar que MetaMask esté en la red correcta (Ganache Local)
2. Verificar que la cuenta tenga ETH
3. Refrescar la página web

### Problema: "Frontend crashes on load"
**Solución:**
```bash
# Limpiar caché y reinstalar
cd frontend
rm -rf node_modules package-lock.json
npm install
npm start
```

### Problema: "Permission denied" en Ubuntu
**Solución:**
```bash
# Configurar permisos de npm
sudo chown -R $(whoami) ~/.npm
sudo chown -R $(whoami) /usr/local/lib/node_modules
```

---

## 📊 **Comandos de Verificación Rápida**

### Verificar Estado del Sistema
```bash
# Verificar que todos los servicios estén corriendo
echo "=== VERIFICACIÓN DEL SISTEMA ==="
echo "Node.js: $(node --version)"
echo "NPM: $(npm --version)"
echo "Ganache: $(ganache-cli --version)"

# Verificar puertos
echo "=== PUERTOS ==="
netstat -tlnp | grep :8545  # Ganache
netstat -tlnp | grep :3000  # Frontend

# Verificar contratos compilados
echo "=== CONTRATOS ==="
ls -la artifacts/contracts/

# Verificar dependencias
echo "=== DEPENDENCIAS ==="
cd frontend && npm list --depth=0
```

---

## 🎯 **Flujo Completo de Ejecución**

### Terminal 1: Ganache
```bash
ganache-cli --port 8545 --networkId 1337 --deterministic
```

### Terminal 2: Deploy de Contratos
```bash
cd TallerTecnologiaOBL
npm run compile
npx hardhat run scripts/deploy.js --network localhost
# Copiar la dirección del contrato
```

### Terminal 3: Frontend
```bash
cd TallerTecnologiaOBL
# Actualizar DAO_CONTRACT_ADDRESS en frontend/src/App.js
cd frontend
npm start
```

### Navegador
```
http://localhost:3000
```

---

## 📞 **Contacto y Soporte**

Si encuentras algún problema durante la configuración:

1. **Verificar logs** en las terminales de Ganache y Frontend
2. **Consultar la documentación** de Hardhat: https://hardhat.org/docs
3. **Revisar que todas las dependencias** estén instaladas correctamente

---

**🎉 ¡Sistema listo para uso y evaluación!**

*Guía creada para Ubuntu 24.04 con Ganache*
*Última actualización: Junio 2025*
