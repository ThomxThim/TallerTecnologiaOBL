const fs = require('fs');
const path = require('path');
const { spawn } = require('child_process');

console.log('🔍 Verificando configuración del entorno de desarrollo...\n');

// Función para verificar si un comando existe
function commandExists(command) {
  return new Promise((resolve) => {
    const child = spawn(command, ['--version'], { stdio: 'ignore' });
    child.on('close', (code) => {
      resolve(code === 0);
    });
    child.on('error', () => {
      resolve(false);
    });
  });
}

// Función para verificar conexión HTTP
function checkGanache() {
  return new Promise((resolve) => {
    const http = require('http');
    const postData = JSON.stringify({
      jsonrpc: "2.0",
      method: "net_version",
      params: [],
      id: 1
    });

    const options = {
      hostname: 'localhost',
      port: 8545,
      path: '/',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(postData)
      },
      timeout: 2000
    };

    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', (chunk) => data += chunk);
      res.on('end', () => {
        try {
          const result = JSON.parse(data);
          resolve({ running: true, networkId: result.result });
        } catch (e) {
          resolve({ running: false });
        }
      });
    });

    req.on('error', () => resolve({ running: false }));
    req.on('timeout', () => resolve({ running: false }));
    req.write(postData);
    req.end();
  });
}

async function main() {
  console.log('=== VERIFICACIÓN DE DEPENDENCIAS DEL SISTEMA ===');
  
  // Verificar Node.js
  const nodeExists = await commandExists('node');
  console.log(nodeExists ? '✅ Node.js instalado' : '❌ Node.js no instalado');
  
  // Verificar NPM
  const npmExists = await commandExists('npm');
  console.log(npmExists ? '✅ NPM instalado' : '❌ NPM no instalado');
  
  // Verificar Git
  const gitExists = await commandExists('git');
  console.log(gitExists ? '✅ Git instalado' : '❌ Git no instalado');
  
  // Verificar Ganache CLI
  const ganacheExists = await commandExists('ganache-cli');
  console.log(ganacheExists ? '✅ Ganache CLI instalado' : '❌ Ganache CLI no instalado');
  
  console.log('\n=== VERIFICACIÓN DEL PROYECTO ===');
  
  // Verificar archivos del proyecto
  const projectFiles = [
    'package.json',
    'hardhat.config.js',
    'contracts/DAO.sol',
    'frontend/package.json',
    'frontend/src/App.js'
  ];
  
  projectFiles.forEach(file => {
    const exists = fs.existsSync(file);
    console.log(exists ? `✅ ${file} existe` : `❌ ${file} no existe`);
  });
  
  console.log('\n=== VERIFICACIÓN DE DEPENDENCIAS ===');
  
  // Verificar node_modules
  const nodeModulesExists = fs.existsSync('node_modules');
  console.log(nodeModulesExists ? '✅ node_modules/ existe' : '⚠️  node_modules/ no existe - ejecutar: npm install');
  
  const frontendNodeModulesExists = fs.existsSync('frontend/node_modules');
  console.log(frontendNodeModulesExists ? '✅ frontend/node_modules/ existe' : '⚠️  frontend/node_modules/ no existe - ejecutar: cd frontend && npm install');
  
  console.log('\n=== VERIFICACIÓN DE GANACHE ===');
  
  // Verificar Ganache
  const ganacheStatus = await checkGanache();
  if (ganacheStatus.running) {
    console.log('✅ Ganache está ejecutándose en puerto 8545');
    console.log(`  Network ID: ${ganacheStatus.networkId || 'N/A'}`);
  } else {
    console.log('❌ Ganache no está ejecutándose');
    console.log('💡 Para iniciar Ganache ejecutar:');
    console.log('   ganache-cli --port 8545 --networkId 1337 --deterministic');
  }
  
  console.log('\n=== VERIFICACIÓN DE COMPILACIÓN ===');
  
  // Verificar contratos compilados
  const artifactsExists = fs.existsSync('artifacts/contracts');
  console.log(artifactsExists ? '✅ Contratos compilados' : '⚠️  Contratos no compilados - ejecutar: npm run compile');
  
  console.log('\n=== VERIFICACIÓN DE DEPLOYMENT ===');
  
  // Verificar deployment local
  const deploymentExists = fs.existsSync('deployment-info-local.json');
  if (deploymentExists) {
    console.log('✅ deployment-info-local.json existe');
    try {
      const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info-local.json', 'utf8'));
      console.log(`  Dirección del contrato: ${deploymentInfo.contractAddress}`);
    } catch (e) {
      console.log('  ⚠️  Error leyendo deployment info');
    }
  } else {
    console.log('⚠️  deployment-info-local.json no existe - ejecutar: npm run deploy:local');
  }
  
  console.log('\n=== VERIFICACIÓN DEL FRONTEND ===');
  
  // Verificar configuración del frontend
  if (fs.existsSync('frontend/src/App.js')) {
    console.log('✅ frontend/src/App.js existe');
    try {
      const appJs = fs.readFileSync('frontend/src/App.js', 'utf8');
      const addressMatch = appJs.match(/DAO_CONTRACT_ADDRESS\s*=\s*"([^"]+)"/);
      if (addressMatch) {
        const frontendAddress = addressMatch[1];
        console.log(`  Dirección configurada: ${frontendAddress}`);
        
        // Verificar si coincide con deployment
        if (deploymentExists) {
          try {
            const deploymentInfo = JSON.parse(fs.readFileSync('deployment-info-local.json', 'utf8'));
            if (frontendAddress === deploymentInfo.contractAddress) {
              console.log('✅ Dirección del frontend coincide con deployment');
            } else {
              console.log('⚠️  Dirección del frontend NO coincide con deployment');
              console.log(`💡 Actualizar App.js con: ${deploymentInfo.contractAddress}`);
            }
          } catch (e) {
            console.log('  ⚠️  Error comparando direcciones');
          }
        }
      }
    } catch (e) {
      console.log('  ⚠️  Error leyendo App.js');
    }
  } else {
    console.log('❌ frontend/src/App.js no existe');
  }
  
  console.log('\n=== COMANDOS ÚTILES ===');
  console.log('Instalación completa:     npm run install-all');
  console.log('Compilar contratos:       npm run compile');
  console.log('Ejecutar tests:           npm test');
  console.log('Deploy local:             npm run deploy:local');
  console.log('Iniciar frontend:         npm run start');
  console.log('Verificar Ganache:        npm run check-ganache');
  console.log('Setup completo:           npm run setup-local');
  
  console.log('\n=== VERIFICACIÓN COMPLETADA ===');
  console.log('Si todo está ✅, el sistema está listo para usar!');
  console.log('Si hay elementos ❌ o ⚠️, seguir las instrucciones mostradas.');
}

main().catch(console.error);
