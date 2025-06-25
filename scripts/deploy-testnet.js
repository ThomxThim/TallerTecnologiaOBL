const { ethers } = require("hardhat");

async function main() {
    console.log("🚀 Starting DAO deployment to testnet...");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("📡 Network:", network.name, "- Chain ID:", Number(network.chainId));
    
    // Get the contract factory and signers
    const [deployer] = await ethers.getSigners();
    console.log("👤 Deploying contracts with the account:", deployer.address);
    
    const balance = await ethers.provider.getBalance(deployer.address);
    console.log("💰 Account balance:", ethers.formatEther(balance), "ETH");
    
    // Check if we have enough balance
    const minBalance = ethers.parseEther("0.05"); // Minimum 0.05 ETH (reducido)
    if (balance < minBalance) {
        throw new Error(`❌ Insufficient balance. Need at least 0.05 ETH, have ${ethers.formatEther(balance)} ETH`);
    }
    
    // Deploy DAO contract
    const DAO = await ethers.getContractFactory("DAO");
    console.log("⏳ Deploying DAO contract...");
    
    const dao = await DAO.deploy(
        "DAO Governance Token", // name
        "DAOT",                 // symbol
        deployer.address        // initial owner
    );
    
    console.log("⏳ Waiting for deployment...");
    await dao.waitForDeployment();
    const daoAddress = await dao.getAddress();
    
    console.log("✅ DAO contract deployed to:", daoAddress);
    
    // Wait for a few block confirmations
    console.log("⏳ Waiting for block confirmations...");
    await dao.deploymentTransaction().wait(5);
    
    // Setup initial configuration
    console.log("⚙️ Setting up initial configuration...");
    
    // Set panic multisig (initially to deployer, can be changed later)
    const setPanicTx = await dao.setPanicMultisig(deployer.address);
    await setPanicTx.wait();
    console.log("✅ Panic multisig set to:", deployer.address);
    
    // Mint initial tokens to deployer
    const mintAmount = ethers.parseEther("1000000"); // 1M tokens
    const mintTx = await dao.mintTokens(deployer.address, mintAmount);
    await mintTx.wait();
    console.log("✅ Minted", ethers.formatEther(mintAmount), "tokens to deployer");
    
    // Add some ETH to treasury (0.005 ETH - reducido)
    const treasuryAmount = ethers.parseEther("0.005");
    const treasuryTx = await dao.buyTokens({ value: treasuryAmount });
    await treasuryTx.wait();
    console.log("✅ Added", ethers.formatEther(treasuryAmount), "ETH to treasury");
    
    // Verify contract parameters
    console.log("\n📋 === DAO Parameters ===");
    console.log("Name:", await dao.name());
    console.log("Symbol:", await dao.symbol());
    console.log("Total Supply:", ethers.formatEther(await dao.totalSupply()));
    console.log("Treasury Balance:", ethers.formatEther(await dao.getTreasuryBalance()), "ETH");
    console.log("Owner:", await dao.owner());
    console.log("Proposal Count:", (await dao.getProposalCount()).toString());
    console.log("Panic Mode:", await dao.isPanicMode());
    console.log("Panic Multisig:", await dao.panicMultisig());
    
    console.log("\n🎉 === Deployment Complete ===");
    console.log("🔗 DAO Address:", daoAddress);
    console.log("🌍 Network:", network.name);
    console.log("🆔 Chain ID:", Number(network.chainId));
    
    // Instructions for verification
    console.log("\n📝 === Next Steps ===");
    console.log("1. Update frontend with new contract address:", daoAddress);
    console.log("2. Verify contract with:");
    
    if (Number(network.chainId) === 80001) {
        console.log(`   npx hardhat verify --network mumbai ${daoAddress} "DAO Governance Token" "DAOT" "${deployer.address}"`);
        console.log("3. Check contract on PolygonScan Mumbai:", `https://mumbai.polygonscan.com/address/${daoAddress}`);
    } else if (Number(network.chainId) === 11155111) {
        console.log(`   npx hardhat verify --network sepolia ${daoAddress} "DAO Governance Token" "DAOT" "${deployer.address}"`);
        console.log("3. Check contract on Etherscan Sepolia:", `https://sepolia.etherscan.io/address/${daoAddress}`);
    }
    
    console.log("4. Get testnet tokens from faucet if needed");
    console.log("5. Create Gnosis Safe multisig for final demo");
    
    // Save deployment info
    const deploymentInfo = {
        network: network.name,
        chainId: Number(network.chainId),
        daoAddress: daoAddress,
        deployer: deployer.address,
        deploymentBlock: await ethers.provider.getBlockNumber(),
        timestamp: new Date().toISOString(),
        verificationCommand: Number(network.chainId) === 80001 
            ? `npx hardhat verify --network mumbai ${daoAddress} "DAO Governance Token" "DAOT" "${deployer.address}"`
            : `npx hardhat verify --network sepolia ${daoAddress} "DAO Governance Token" "DAOT" "${deployer.address}"`
    };
    
    console.log("\n💾 Deployment info saved for verification");
    return deploymentInfo;
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Deployment failed:", error);
        process.exit(1);
    });
