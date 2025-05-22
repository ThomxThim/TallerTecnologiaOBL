require('@nomiclabs/hardhat-ethers');
require('hardhat-contract-sizer');
require('solidity-coverage');
require('dotenv').config();
require("@nomicfoundation/hardhat-chai-matchers");

module.exports = {
  solidity: "0.8.24",
  paths: {
    sources: "./src",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },
  networks: {
    /*sepolia: {
      url: `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}`,
      accounts: [`0x${process.env.DEPLOYER_PRIVATE_KEY}`],
    },*/
  },
};