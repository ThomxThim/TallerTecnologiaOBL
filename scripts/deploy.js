const { ethers } = require("hardhat");

async function main() {
    console.log("Starting DAO deployment...");
    
    // Get the contract factory and signers
    const [deployer] = await ethers.getSigners();
    console.log("Deploying contracts with the account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("Account balance:", ethers.formatEther(balance), "ETH");
    
    // Deploy DAO contract
    const DAO = await ethers.getContractFactory("DAO");
    console.log("Deploying DAO contract...");
    
    const dao = await DAO.deploy(
        "DAO Governance Token", // name
        "DAOT",                 // symbol
        deployer.address        // initial owner
    );
    
    await dao.waitForDeployment();
    const daoAddress = await dao.getAddress();
    
    console.log("DAO contract deployed to:", daoAddress);
    
    // Setup initial configuration
    console.log("Setting up initial configuration...");
    
    // Set panic multisig (using deployer for demo purposes)
    // In production, this should be a proper multisig wallet
    await dao.setPanicMultisig(deployer.address);
    console.log("Panic multisig set to:", deployer.address);
    
    // Mint some initial tokens for testing
    const initialSupply = ethers.parseEther("1000000"); // 1M tokens
    await dao.mintTokens(deployer.address, initialSupply);
    console.log("Minted", ethers.formatEther(initialSupply), "tokens to deployer");
    
    // Add some ETH to treasury for testing
    const treasuryAmount = ethers.parseEther("10");
    await deployer.sendTransaction({
        to: daoAddress,
        value: treasuryAmount
    });
    console.log("Added", ethers.formatEther(treasuryAmount), "ETH to treasury");
      // Display contract parameters
    console.log("\n=== DAO Parameters ===");
    console.log("Name:", await dao.name());
    console.log("Symbol:", await dao.symbol());
    console.log("Total Supply:", ethers.formatEther(await dao.totalSupply()));
    console.log("Treasury Balance:", ethers.formatEther(await ethers.provider.getBalance(daoAddress)), "ETH");
    console.log("Owner:", await dao.owner());
    console.log("Proposal Count:", await dao.getProposalCount());
    console.log("Panic Mode:", await dao.isPanicMode());
    console.log("Panic Multisig:", await dao.panicMultisig());
    
    // Save deployment info
    const deploymentInfo = {
        network: "localhost",
        chainId: (await ethers.provider.getNetwork()).chainId,
        daoAddress: daoAddress,
        deployer: deployer.address,
        deploymentTime: new Date().toISOString(),
        blockNumber: await ethers.provider.getBlockNumber()
    };
    
    console.log("\n=== Deployment Complete ===");
    console.log("DAO Address:", daoAddress);
    console.log("Save this address for frontend configuration!");
    
    return daoAddress;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
