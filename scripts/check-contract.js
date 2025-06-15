const { ethers } = require("hardhat");

async function main() {
    const DAO_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";
    
    console.log("Checking DAO contract at:", DAO_ADDRESS);
    
    const dao = await ethers.getContractAt("DAO", DAO_ADDRESS);
    
    try {
        const treasuryBalance = await dao.getTreasuryBalance();
        console.log("Treasury Balance:", ethers.formatEther(treasuryBalance), "ETH");
        
        const totalSupply = await dao.totalSupply();
        console.log("Total Supply:", ethers.formatEther(totalSupply), "DAOT");
        
        const proposalCount = await dao.getProposalCount();
        console.log("Proposal Count:", proposalCount.toString());
        
        const owner = await dao.owner();
        console.log("Owner:", owner);
        
        // Test connection to provider
        const provider = ethers.provider;
        const network = await provider.getNetwork();
        console.log("Network:", network.name, "Chain ID:", network.chainId);
        
        const blockNumber = await provider.getBlockNumber();
        console.log("Current Block Number:", blockNumber);
        
    } catch (error) {
        console.error("Error checking contract:", error.message);
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
