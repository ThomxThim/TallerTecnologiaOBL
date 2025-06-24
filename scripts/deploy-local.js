const hre = require("hardhat");

async function main() {
  console.log("🚀 Deploying DAO contract to local network...");
  
  // Obtener el deployer (primera cuenta de Ganache)
  const [deployer] = await hre.ethers.getSigners();
  console.log("📋 Deploying with account:", deployer.address);
  
  // Verificar balance del deployer
  const balance = await deployer.provider.getBalance(deployer.address);
  console.log("💰 Account balance:", hre.ethers.formatEther(balance), "ETH");
  
  if (balance < hre.ethers.parseEther("1")) {
    console.warn("⚠️  Warning: Low balance. Make sure Ganache is running with sufficient ETH per account.");
  }
  
  // Verificar que estamos en la red correcta
  const network = await hre.ethers.provider.getNetwork();
  console.log("🌐 Network:", network.name, "- Chain ID:", network.chainId.toString());
  
  if (network.chainId !== 1337n) {
    console.error("❌ Wrong network! Expected Chain ID: 1337, Got:", network.chainId.toString());
    console.log("💡 Make sure Ganache is running on port 8545 with network ID 1337");
    process.exit(1);
  }
  
  // Verificar conexión con la red
  try {
    const blockNumber = await hre.ethers.provider.getBlockNumber();
    console.log("📊 Current block number:", blockNumber);
  } catch (error) {
    console.error("❌ Cannot connect to network:", error.message);
    console.log("💡 Make sure Ganache is running: ganache-cli --port 8545 --networkId 1337");
    process.exit(1);
  }
  
  console.log("\n⏳ Deploying DAO contract...");
  
  // Deploy del contrato DAO
  const DAO = await hre.ethers.getContractFactory("DAO");
  
  // Parámetros del constructor: tokenName, tokenSymbol, initialOwner
  const dao = await DAO.deploy(
    "DAO Governance Token",
    "DAOT", 
    deployer.address
  );
  
  // Esperar confirmación
  await dao.waitForDeployment();
  
  const contractAddress = await dao.getAddress();
  
  console.log("\n✅ DAO contract deployed successfully!");
  console.log("📍 Contract address:", contractAddress);
  console.log("👤 Owner:", deployer.address);
  
  // Verificar que el contrato se desplegó correctamente
  try {
    const owner = await dao.owner();
    const tokenName = await dao.name();
    const tokenSymbol = await dao.symbol();
    
    console.log("\n🔍 Contract verification:");
    console.log("  - Token Name:", tokenName);
    console.log("  - Token Symbol:", tokenSymbol);
    console.log("  - Contract Owner:", owner);
    console.log("  - Owner matches deployer:", owner === deployer.address);
    
  } catch (error) {
    console.error("⚠️  Warning: Could not verify contract deployment:", error.message);
  }
  
  // Guardar información del deployment
  const deploymentInfo = {
    network: network.name,
    chainId: network.chainId.toString(),
    contractAddress: contractAddress,
    deployer: deployer.address,
    deployedAt: new Date().toISOString(),
    blockNumber: await hre.ethers.provider.getBlockNumber(),
    transactionHash: dao.deploymentTransaction()?.hash || "N/A"
  };
  
  const fs = require('fs');
  fs.writeFileSync(
    'deployment-info-local.json', 
    JSON.stringify(deploymentInfo, null, 2)
  );
  
  console.log("\n📝 Deployment info saved to: deployment-info-local.json");
  
  // Instrucciones para el frontend
  console.log("\n🎨 NEXT STEPS:");
  console.log("1. Update frontend/src/App.js:");
  console.log(`   const DAO_CONTRACT_ADDRESS = "${contractAddress}";`);
  console.log("\n2. Start the frontend:");
  console.log("   cd frontend && npm start");
  console.log("\n3. Configure MetaMask:");
  console.log("   - Network: Ganache Local");
  console.log("   - RPC URL: http://127.0.0.1:8545");
  console.log("   - Chain ID: 1337");
  console.log("   - Import account with Ganache private key");
  
  console.log("\n🎉 Deployment completed successfully!");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error("❌ Deployment failed:", error);
    process.exit(1);
  });
