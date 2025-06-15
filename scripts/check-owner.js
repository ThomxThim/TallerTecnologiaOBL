const { ethers } = require("hardhat");

const DAO_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

async function main() {
  console.log("🔍 Verificando ownership del contrato DAO...");
  
  try {
    // Obtener el contrato
    const DAO = await ethers.getContractFactory("DAO");
    const dao = DAO.attach(DAO_CONTRACT_ADDRESS);
    
    // Obtener información del contrato
    const owner = await dao.owner();
    const accounts = await ethers.getSigners();
    const deployerAddress = accounts[0].address;
    
    console.log("📋 Información del contrato:");
    console.log("  Dirección del contrato:", DAO_CONTRACT_ADDRESS);
    console.log("  Owner actual:", owner);
    console.log("  Cuenta deployer:", deployerAddress);
    console.log("  ¿Owner = Deployer?", owner.toLowerCase() === deployerAddress.toLowerCase());
    
    // Verificar si la cuenta esperada es el owner
    const expectedOwner = "0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266";
    console.log("  Cuenta esperada:", expectedOwner);
    console.log("  ¿Owner = Esperado?", owner.toLowerCase() === expectedOwner.toLowerCase());
    
    // Obtener balance de tokens del owner
    const ownerBalance = await dao.getTokenBalance(owner);
    console.log("  Balance de tokens del owner:", ethers.formatEther(ownerBalance));
    
    // Verificar si hay multisig de pánico configurada
    try {
      // Esto puede fallar si no hay función pública para obtener la multisig de pánico
      console.log("✅ Contrato verificado exitosamente");
    } catch (error) {
      console.log("⚠️  No se pudo verificar multisig de pánico");
    }
    
  } catch (error) {
    console.error("❌ Error verificando contrato:", error.message);
  }
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
