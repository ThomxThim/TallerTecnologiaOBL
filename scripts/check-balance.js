const { ethers } = require("hardhat");

async function main() {
    console.log("💰 Checking Sepolia balance...");
    
    // Get network info
    const network = await ethers.provider.getNetwork();
    console.log("📡 Network:", network.name, "- Chain ID:", Number(network.chainId));
    
    // Get signer
    const [deployer] = await ethers.getSigners();
    console.log("👤 Wallet address:", deployer.address);
    
    // Get balance
    const balance = await ethers.provider.getBalance(deployer.address);
    const balanceInEth = ethers.formatEther(balance);
    
    console.log("💰 Current balance:", balanceInEth, "ETH");
    console.log("💰 Balance in WEI:", balance.toString());
    
    // Check if enough for deployment
    const minRequired = ethers.parseEther("0.1");
    const hasEnough = balance >= minRequired;
    
    console.log("\n📊 Deployment Requirements:");
    console.log("✅ Minimum required: 0.1 ETH");
    console.log(hasEnough ? "✅ You have enough!" : "❌ Need more ETH");
    
    if (!hasEnough) {
        const needed = ethers.formatEther(minRequired - balance);
        console.log("💡 Need", needed, "more ETH");
        console.log("🔗 Get Sepolia ETH at:");
        console.log("   - https://sepoliafaucet.com/");
        console.log("   - https://sepolia-faucet.pk910.de/");
        console.log("   - https://www.infura.io/faucet/sepolia");
    } else {
        console.log("🚀 Ready to deploy!");
        console.log("💡 Run: npm run deploy:sepolia");
    }
}

main()
    .then(() => process.exit(0))
    .catch((error) => {
        console.error("❌ Error checking balance:");
        console.error(error.message);
        process.exit(1);
    });
