require("@nomicfoundation/hardhat-toolbox");
require('dotenv').config();
require('solidity-coverage');

module.exports = {  solidity: {
    version: "0.8.24",
    settings: {
      optimizer: {
        enabled: true,
        runs: 200,
      },
      viaIR: true,
    },
  },
  paths: {
    sources: "./contracts",
    tests: "./test",
    cache: "./cache",
    artifacts: "./artifacts"
  },  networks: {
    hardhat: {
      chainId: 1337
    },
    localhost: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      accounts: {
        // Usar las mismas cuentas determinísticas que Ganache
        mnemonic: "test test test test test test test test test test test junk",
        count: 10,
        initialIndex: 0,
        path: "m/44'/60'/0'/0"
      }
    },
    ganache: {
      url: "http://127.0.0.1:8545",
      chainId: 1337,
      gasLimit: 12000000,
      gasPrice: 20000000000
    },
    sepolia: {
      url: process.env.INFURA_PROJECT_ID ? `https://sepolia.infura.io/v3/${process.env.INFURA_PROJECT_ID}` : "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 11155111
    },
    polygon_mumbai: {
      url: process.env.INFURA_PROJECT_ID ? `https://polygon-mumbai.infura.io/v3/${process.env.INFURA_PROJECT_ID}` : "",
      accounts: process.env.DEPLOYER_PRIVATE_KEY ? [process.env.DEPLOYER_PRIVATE_KEY] : [],
      chainId: 80001
    }
  },
  gasReporter: {
    enabled: process.env.REPORT_GAS !== undefined,
    currency: "USD",
  },
  etherscan: {
    apiKey: process.env.ETHERSCAN_API_KEY,
  },
};
