const { ethers } = require("hardhat");

async function main() {
  const DAO_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
  
  // Conectar al contrato
  const provider = new ethers.JsonRpcProvider("http://localhost:8545");
  const DAO = await ethers.getContractFactory("DAO");
  const dao = DAO.attach(DAO_ADDRESS).connect(provider);
  
  console.log("=== VERIFICACIÓN DE PARÁMETROS DE LA DAO ===");
  console.log("Dirección del contrato:", DAO_ADDRESS);
  
  const parameters = [
    'TOKEN_PRICE',
    'MIN_VOTING_STAKE', 
    'MIN_PROPOSAL_STAKE',
    'VOTING_DURATION',
    'STAKING_LOCK_TIME',
    'TOKENS_PER_VOTE'
  ];
  
  console.log("\n📊 PARÁMETROS ACTUALES:");
  
  for (const param of parameters) {
    try {
      const paramBytes32 = ethers.keccak256(ethers.toUtf8Bytes(param));
      const value = await dao.getParameter(paramBytes32);
      
      let formattedValue = value.toString();
      if (param === 'TOKEN_PRICE') {
        formattedValue = `${ethers.formatEther(value)} ETH (${value.toString()} WEI)`;
      } else if (param.includes('STAKE') || param.includes('TOKENS_PER')) {
        formattedValue = `${ethers.formatEther(value)} tokens (${value.toString()} unidades)`;
      } else if (param.includes('TIME') || param.includes('DURATION')) {
        const seconds = Number(value);
        const minutes = Math.floor(seconds / 60);
        const hours = Math.floor(minutes / 60);
        const days = Math.floor(hours / 24);
        formattedValue = `${seconds}s`;
        if (days > 0) formattedValue += ` (${days} días)`;
        else if (hours > 0) formattedValue += ` (${hours} horas)`;
        else if (minutes > 0) formattedValue += ` (${minutes} minutos)`;
      }
      
      console.log(`  ${param}: ${formattedValue}`);
    } catch (error) {
      console.log(`  ${param}: ERROR - ${error.message}`);
    }
  }
  
  console.log("\n=== FIN DE VERIFICACIÓN ===");
}

main()
  .then(() => process.exit(0))
  .catch((error) => {
    console.error(error);
    process.exit(1);
  });
