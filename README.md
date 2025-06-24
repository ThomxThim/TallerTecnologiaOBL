# 🏛️ DAO Governance System

Sistema de gobernanza DAO (Organización Autónoma Descentralizada) con gestión de tesorería, votaciones y tokens ERC-20.

## 🎯 **Estado del Proyecto**

✅ **Contrato desplegado en Sepolia**: `0x73798Ab895795825d2c92ce792aeD01Ff8eeAC21`  
✅ **Código verificado en Etherscan**: [Ver contrato](https://sepolia.etherscan.io/address/0x73798Ab895795825d2c92ce792aeD01Ff8eeAC21)  
✅ **Tests con 98.81% de cobertura**  
✅ **Frontend React funcional**  
✅ **Documentación completa**

---

## 📋 **Documentación Disponible**

| Documento | Descripción |
|-----------|-------------|
| [**GUIA_EJECUCION_LOCAL.md**](./GUIA_EJECUCION_LOCAL.md) | 🚀 **Guía completa para ejecutar localmente** |
| [RESUMEN_PROYECTO.md](./RESUMEN_PROYECTO.md) | 📊 Resumen ejecutivo del proyecto |
| [DOCUMENTACION_DEPLOY.md](./DOCUMENTACION_DEPLOY.md) | 📝 Documentación técnica completa |
| [CHECKLIST_PROFESOR.md](./CHECKLIST_PROFESOR.md) | ✅ Lista de verificación rápida |

---

## 🚀 **Inicio Rápido para el Profesor**

### **Opción 1: Verificar Contrato Desplegado (2 minutos)**
Visitar: https://sepolia.etherscan.io/address/0x73798Ab895795825d2c92ce792aeD01Ff8eeAC21

### **Opción 2: Ejecutar Localmente con Ganache**

```bash
# 1. Clonar repositorio
git clone [URL_REPOSITORIO]
cd TallerTecnologiaOBL

# 2. Instalar dependencias
npm run install-all

# 3. Iniciar Ganache (en terminal separada)
ganache-cli --port 8545 --networkId 1337 --deterministic

# 4. Compilar y desplegar
npm run compile
npm run deploy:local

# 5. Actualizar dirección en frontend y ejecutar
# (El script de deploy mostrará la nueva dirección)
npm run start
```

### **Opción 3: Setup Automático**
```bash
# Verificar entorno
npm run check-env

# Setup completo (después de iniciar Ganache)
npm run setup-local
```

---

## 🛠️ **Tecnologías Utilizadas**

- **Smart Contracts**: Solidity 0.8.24
- **Framework**: Hardhat
- **Frontend**: React.js + Ethers.js
- **Testing**: Hardhat + Chai
- **Redes**: Sepolia Testnet, Ganache Local
- **Estándares**: ERC-20, OpenZeppelin

---

## 📊 **Funcionalidades del DAO**

### **💰 Sistema de Tokens**
- Compra de tokens con ETH
- Staking para obtener poder de voto
- Gestión de balance y participación

### **🗳️ Sistema de Votación**
- Creación de propuestas por miembros
- Votación ponderada por tokens stakeados
- Ejecución automática de propuestas aprobadas

### **🏦 Gestión de Tesorería**
- Propuestas de gasto del tesoro
- Transferencias automáticas aprobadas
- Seguimiento de fondos transparente

### **🔒 Controles de Seguridad**
- Modo pánico con multisig
- Control de acceso granular
- Validaciones temporales

---

## 🧪 **Testing y Calidad**

```bash
# Ejecutar tests
npm test

# Cobertura de código
npm run test:coverage
```

**Métricas de Calidad:**
- ✅ 98.81% Statements
- ✅ 100% Functions  
- ✅ 100% Lines
- ✅ 93.75% Branches

---

## 📁 **Estructura del Proyecto**

```
TallerTecnologiaOBL/
├── contracts/              # Smart contracts
│   ├── DAO.sol             # Contrato principal
│   └── interface/
│       └── IDAO.sol        # Interfaz del DAO
├── scripts/                # Scripts de deployment
│   ├── deploy-local.js     # Deploy para Ganache
│   └── check-environment.js # Verificación del entorno
├── test/                   # Tests unitarios
│   └── DAO.test.js         # Tests del contrato
├── frontend/               # Aplicación React
│   ├── src/
│   │   ├── App.js          # Aplicación principal
│   │   └── index.js        # Punto de entrada
│   └── package.json        # Dependencias frontend
├── hardhat.config.js       # Configuración Hardhat
├── package.json            # Dependencias del proyecto
└── .env                    # Variables de entorno
```

---

## 🎮 **Comandos Disponibles**

| Comando | Descripción |
|---------|-------------|
| `npm run check-env` | Verificar configuración del entorno |
| `npm run install-all` | Instalar todas las dependencias |
| `npm run compile` | Compilar contratos |
| `npm test` | Ejecutar tests |
| `npm run test:coverage` | Tests con cobertura |
| `npm run deploy:local` | Deploy en Ganache |
| `npm run start` | Ejecutar frontend |
| `npm run setup-local` | Setup completo para desarrollo |

---

## 🌐 **Redes Soportadas**

| Red | Configuración | Estado |
|-----|---------------|--------|
| **Sepolia Testnet** | Producción | ✅ Desplegado |
| **Ganache Local** | Desarrollo | ✅ Configurado |
| **Hardhat Network** | Testing | ✅ Configurado |

---

## 📞 **Soporte y Recursos**

### **Enlaces Importantes**
- **Contrato en Etherscan**: https://sepolia.etherscan.io/address/0x73798Ab895795825d2c92ce792aeD01Ff8eeAC21
- **Sepolia Faucet**: https://sepoliafaucet.com/
- **Ganache Documentation**: https://trufflesuite.com/ganache/

### **Troubleshooting**
- Revisar [GUIA_EJECUCION_LOCAL.md](./GUIA_EJECUCION_LOCAL.md) para problemas comunes
- Ejecutar `npm run check-env` para diagnosticar el entorno
- Verificar que Ganache esté ejecutándose en puerto 8545

---

## 🎓 **Para el Profesor**

**Evaluación Rápida:**
1. Verificar contrato en Etherscan (2 min)
2. Ejecutar tests localmente (3 min)
3. Desplegar en Ganache (opcional)

**Documentos Clave:**
- [GUIA_EJECUCION_LOCAL.md](./GUIA_EJECUCION_LOCAL.md) - Instrucciones paso a paso
- [CHECKLIST_PROFESOR.md](./CHECKLIST_PROFESOR.md) - Verificación rápida

---

**🎉 Proyecto completo y listo para evaluación**

*Sistema DAO funcional con frontend, testing completo y deployment en testnet*
