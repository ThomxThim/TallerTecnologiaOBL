const hre = require("hardhat");
const fs = require('fs');

async function main() {
    console.log("🔍 Starting contract verification...");
    
    // Read the latest deployment file
    const deploymentFiles = fs.readdirSync('.').filter(file => file.startsWith('deployment-'));
    if (deploymentFiles.length === 0) {
        throw new Error("❌ No deployment file found. Deploy contract first.");
    }
    
    // Get the most recent deployment
    const latestDeployment = deploymentFiles.sort().pop();
    const deploymentInfo = JSON.parse(fs.readFileSync(latestDeployment, 'utf8'));
    
    console.log("📄 Using deployment file:", latestDeployment);
    console.log("📍 Contract address:", deploymentInfo.contractAddress);
    console.log("🌐 Network:", deploymentInfo.network);
    
    // Verify the contract
    try {
        console.log("⏳ Verifying contract on Etherscan...");
        
        await hre.run("verify:verify", {
            address: deploymentInfo.contractAddress,
            constructorArguments: deploymentInfo.constructorArgs,
        });
        
        console.log("✅ Contract verified successfully!");
        
        if (deploymentInfo.chainId === "11155111") {
            console.log("🔗 View on Etherscan:", `https://sepolia.etherscan.io/address/${deploymentInfo.contractAddress}`);
        } else if (deploymentInfo.chainId === "80001") {
            console.log("🔗 View on Polygonscan:", `https://mumbai.polygonscan.com/address/${deploymentInfo.contractAddress}`);
        }
        
    } catch (error) {
        if (error.message.includes("already verified")) {
            console.log("✅ Contract is already verified!");
        } else {
            console.error("❌ Verification failed:");
            console.error(error.message);
            console.log("\n💡 Manual verification command:");
            console.log(`npx hardhat verify --network ${deploymentInfo.network} ${deploymentInfo.contractAddress} "${deploymentInfo.constructorArgs[0]}" "${deploymentInfo.constructorArgs[1]}" "${deploymentInfo.constructorArgs[2]}"`);
        }
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error(error);
        process.exit(1);
    });
