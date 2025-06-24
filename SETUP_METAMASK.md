# 🦊 Configuración de MetaMask para el Proyecto DAO

## 📋 **Configuración Requerida**

### **Para Desarrollo Local (Ganache)**

1. **Abrir MetaMask** y hacer clic en el selector de red
2. **Agregar red personalizada** con los siguientes datos:

```
Nombre de la red: Ganache Local
Nueva URL de RPC: http://127.0.0.1:8545
ID de cadena: 1337
Símbolo de moneda: ETH
URL del explorador de bloques: (dejar vacío)
```

3. **Importar cuenta de Ganache:**
   - Copiar una private key de Ganache (desde la terminal)
   - En MetaMask: Clic en icono de cuenta → "Importar cuenta"
   - Pegar la private key

### **Para Testnet Sepolia**

1. **Agregar red Sepolia** (si no está disponible):
```
Nombre de la red: Sepolia Test Network
Nueva URL de RPC: https://sepolia.infura.io/v3/YOUR_INFURA_KEY
ID de cadena: 11155111
Símbolo de moneda: ETH
URL del explorador de bloques: https://sepolia.etherscan.io
```

2. **Obtener ETH de Sepolia:**
   - Faucet 1: https://sepoliafaucet.com/
   - Faucet 2: https://www.alchemy.com/faucets/ethereum-sepolia

---

## 🔧 **Cuentas de Ganache por Defecto**

Cuando ejecutas Ganache con `--deterministic`, siempre obtienes las mismas cuentas:

**Cuenta 0 (Deployer):** 
- Dirección: `0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266`
- Private Key: `0xac0974bec39a17e36ba4a6b4d238ff944bacb478cbed5efcae784d7bf4f2ff80`

**Cuenta 1:**
- Dirección: `0x70997970C51812dc3A010C7d01b50e0d17dc79C8`
- Private Key: `0x59c6995e998f97a5a0044966f0945389dc9e86dae88c7a8412f4603b6b78690d`

⚠️ **IMPORTANTE**: Estas claves son para desarrollo únicamente. Nunca las uses en mainnet.

---

## 🎯 **Direcciones de Contratos**

### **Sepolia Testnet**
```
DAO Contract: 0x73798Ab895795825d2c92ce792aeD01Ff8eeAC21
```

### **Ganache Local**
La dirección cambia en cada deploy. Verificar en:
- Salida del comando `npm run deploy:local`
- Archivo `deployment-info-local.json`

---

## 🔍 **Verificación de Configuración**

### **Verificar Red**
1. Asegúrate de estar en la red correcta en MetaMask
2. Verifica que tengas ETH en tu cuenta
3. Confirma que la dirección del contrato sea correcta

### **Verificar Conexión**
1. Abrir http://localhost:3000
2. Hacer clic en "Connect Wallet"
3. Autorizar la conexión en MetaMask
4. Verificar que aparezca tu balance

---

## 🚨 **Problemas Comunes**

### **"Wrong Network" en la DApp**
- Verificar que MetaMask esté en la red correcta
- Para local: Chain ID 1337
- Para Sepolia: Chain ID 11155111

### **"Contract not found" Error**
- Verificar que el contrato esté desplegado
- Confirmar que la dirección en App.js sea correcta
- Para local: verificar que Ganache esté corriendo

### **"Insufficient funds" Error**
- Para local: Importar cuenta de Ganache con ETH
- Para Sepolia: Obtener ETH del faucet

### **MetaMask no aparece**
- Verificar que MetaMask esté instalado
- Refrescar la página web
- Verificar que MetaMask esté desbloqueado

---

## 🎮 **Interacción con el DAO**

### **Funciones Disponibles**
1. **Comprar Tokens**: Intercambiar ETH por tokens del DAO
2. **Stakear Tokens**: Depositar tokens para obtener poder de voto
3. **Crear Propuestas**: Proponer acciones para el DAO
4. **Votar**: Participar en la gobernanza
5. **Ejecutar Propuestas**: Ejecutar propuestas aprobadas

### **Roles de Usuario**
- **Owner**: Puede configurar parámetros y mintear tokens
- **Miembro**: Puede crear propuestas y votar
- **Panic Multisig**: Puede activar/desactivar modo pánico

---

## 📱 **Uso Móvil**

MetaMask Mobile también es compatible:
1. Instalar MetaMask Mobile
2. Configurar las mismas redes
3. Usar el navegador interno de MetaMask
4. Navegar a http://localhost:3000 (solo para desarrollo)

---

**🎉 ¡MetaMask configurado y listo para usar!**
