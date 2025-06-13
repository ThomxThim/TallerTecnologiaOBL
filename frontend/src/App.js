import React, { useState, useEffect, useCallback } from 'react';
import { ethers } from 'ethers';
import toast, { Toaster } from 'react-hot-toast';
import './index.css';

const DAO_ABI = [
  "function getTokenBalance(address user) external view returns (uint256)",
  "function getUserStaking(address user) external view returns (tuple(uint256 votingStake, uint256 proposalStake, uint256 votingUnlockTime, uint256 proposalUnlockTime))",
  "function getProposal(uint256 proposalId) external view returns (tuple(uint256 id, string title, string description, address proposer, uint256 forVotes, uint256 againstVotes, uint256 startTime, uint256 endTime, uint8 state, uint8 proposalType, address treasuryTarget, uint256 treasuryAmount, bool executed))",
  "function getProposalCount() external view returns (uint256)",
  "function getVotingPower(address user) external view returns (uint256)",
  "function hasVoted(uint256 proposalId, address user) external view returns (bool)",
  "function getParameter(bytes32 param) external view returns (uint256)",
  "function getTreasuryBalance() external view returns (uint256)",
  "function buyTokens() external payable",
  "function stakeTokens(uint256 amount, bool forVoting) external",
  "function unstakeTokens(uint256 amount, bool forVoting) external",
  "function createProposal(string memory title, string memory description) external returns (uint256)",
  "function createTreasuryProposal(string memory title, string memory description, address target, uint256 amount) external returns (uint256)",
  "function vote(uint256 proposalId, bool support) external",
  "function executeProposal(uint256 proposalId) external",
  "function owner() external view returns (address)",
  "function mintTokens(address to, uint256 amount) external",
  "function setParameter(bytes32 param, uint256 value) external",
  "function setPanicMultisig(address _panicMultisig) external",
  "function panic() external",
  "function tranquility() external",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint8 proposalType)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower)",
  "event ProposalExecuted(uint256 indexed proposalId, uint8 result)"
];

const DAO_CONTRACT_ADDRESS = "0xDc64a140Aa3E981100a9becA4E685f962f0cF6C9";

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);
  const [connectedWalletType, setConnectedWalletType] = useState('');
  
  const [balance, setBalance] = useState('0');
  const [staking, setStaking] = useState({ votingStake: '0', proposalStake: '0', votingUnlockTime: 0, proposalUnlockTime: 0 });
  const [votingPower, setVotingPower] = useState('0');
  const [treasuryBalance, setTreasuryBalance] = useState('0');
  const [proposals, setProposals] = useState([]);
  const [proposalFilter, setProposalFilter] = useState('all');
  const [buyAmount, setBuyAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeType, setStakeType] = useState(true);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalType, setProposalType] = useState('standard');
  const [treasuryTarget, setTreasuryTarget] = useState('');
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [panicMultisigAddress, setPanicMultisigAddress] = useState('');
  const [mintToAddress, setMintToAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');
  const [parameterName, setParameterName] = useState('');
  const [parameterValue, setParameterValue] = useState('');
  const [isOwner, setIsOwner] = useState(false);

  const detectWallets = () => {
    const wallets = { metamask: false, rabby: false, generic: false };
    if (typeof window.ethereum !== 'undefined') {
      if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
        window.ethereum.providers.forEach(provider => {
          if (provider.isMetaMask) wallets.metamask = true;
          if (provider.isRabby) wallets.rabby = true;
        });
      } else {
        if (window.ethereum.isMetaMask) {
          wallets.metamask = true;
        } else if (window.ethereum.isRabby) {
          wallets.rabby = true;
        } else {
          wallets.generic = true;
        }
      }
    }
    return wallets;
  };

  const getProvider = (walletType) => {
    if (typeof window.ethereum === 'undefined') return null;
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      if (walletType === 'metamask') {
        return window.ethereum.providers.find(provider => provider.isMetaMask);
      } else if (walletType === 'rabby') {
        return window.ethereum.providers.find(provider => provider.isRabby);
      }
    } else {
      if (walletType === 'metamask' && window.ethereum.isMetaMask) {
        return window.ethereum;
      } else if (walletType === 'rabby' && window.ethereum.isRabby) {
        return window.ethereum;
      } else if (walletType === 'generic') {
        return window.ethereum;
      }
    }
    return null;
  };

  const switchToHardhatNetwork = async (ethereum) => {
    try {
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }],
        });
        return true;
      } catch (switchError) {
        if (switchError.code === 4902) {
          try {
            await ethereum.request({
              method: 'wallet_addEthereumChain',
              params: [{
                chainId: '0x539',
                chainName: 'Hardhat Local',
                nativeCurrency: { name: 'Ethereum', symbol: 'ETH', decimals: 18 },
                rpcUrls: ['http://127.0.0.1:8545'],
                blockExplorerUrls: null,
              }],
            });
            return true;
          } catch (addError) {
            toast.error('Error configurando la red local de Hardhat');
            return false;
          }
        } else {
          toast.error('Error cambiando a la red local de Hardhat');
          return false;
        }
      }
    } catch (error) {
      toast.error('Error configurando la red');
      return false;
    }
  };

  const connectSpecificWallet = async (walletType) => {
    try {
      const ethereum = getProvider(walletType);
      
      if (!ethereum) {
        toast.error(`${walletType} no está disponible`);
        return;
      }

      const networkConfigured = await switchToHardhatNetwork(ethereum);
      if (!networkConfigured) {
        toast.error('Necesitas estar en la red local de Hardhat (localhost:8545)');
        return;
      }

      const provider = new ethers.BrowserProvider(ethereum);
      const accounts = await provider.send('eth_requestAccounts', []);
      const signer = await provider.getSigner();
      
      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setConnectedWalletType(walletType);
      
      const contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);
      setContract(contract);
      
      toast.success(`${walletType} conectada exitosamente!`);
      loadDashboardData(contract, accounts[0]);

      ethereum.on('accountsChanged', (accounts) => {
        if (accounts.length === 0) {
          disconnectWallet();
        } else {
          setAccount(accounts[0]);
          loadDashboardData(contract, accounts[0]);
        }
      });

      ethereum.on('chainChanged', () => {
        window.location.reload();
      });

    } catch (error) {
      toast.error(`Error conectando ${walletType}: ${error.message}`);
    }
  };  const disconnectWallet = async () => {
    try {
      setAccount('');
      setProvider(null);
      setSigner(null);
      setContract(null);
      setConnectedWalletType('');
      setBalance('0');
      setStaking({ votingStake: '0', proposalStake: '0', votingUnlockTime: 0, proposalUnlockTime: 0 });
      setVotingPower('0');
      setTreasuryBalance('0');
      setProposals([]);
      setBuyAmount('');
      setStakeAmount('');
      setProposalTitle('');
      setProposalDescription('');
      setTreasuryTarget('');
      setTreasuryAmount('');
      setLoading(false);
      toast.success('Wallet desconectada');
    } catch (error) {
      toast.error('Error al desconectar wallet');
    }
  };

  const loadDashboardData = async (contractInstance, userAccount) => {
    try {
      setLoading(true);
      
      const userBalance = await contractInstance.getTokenBalance(userAccount);
      const userStaking = await contractInstance.getUserStaking(userAccount);
      const userVotingPower = await contractInstance.getVotingPower(userAccount);
      const treasury = await contractInstance.getTreasuryBalance();
      
      setBalance(ethers.formatEther(userBalance));
      setStaking({
        votingStake: ethers.formatEther(userStaking.votingStake),
        proposalStake: ethers.formatEther(userStaking.proposalStake),
        votingUnlockTime: Number(userStaking.votingUnlockTime),
        proposalUnlockTime: Number(userStaking.proposalUnlockTime)
      });
      setVotingPower(userVotingPower.toString());
      setTreasuryBalance(ethers.formatEther(treasury));
      
      checkOwnership();
      
    } catch (error) {
      toast.error(`Error al cargar datos: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  const loadProposals = useCallback(async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const proposalCount = await contract.getProposalCount();
      const proposalsData = [];
      
      for (let i = 0; i < proposalCount; i++) {
        const proposal = await contract.getProposal(i);
        const hasUserVoted = await contract.hasVoted(i, account);
        
        const mappedProposal = {
          id: proposal[0] || i,
          title: proposal[1] || '',
          description: proposal[2] || '',
          proposer: proposal[3] || '',
          forVotes: proposal[4] || 0,
          againstVotes: proposal[5] || 0,
          startTime: proposal[6] || 0,
          endTime: proposal[7] || 0,
          state: proposal[8] || 0,
          proposalType: proposal[9] || 0,
          treasuryTarget: proposal[10] || '',
          treasuryAmount: proposal[11] || 0,
          executed: proposal[12] || false,
          hasVoted: hasUserVoted
        };
        
        proposalsData.push(mappedProposal);
      }
      
      setProposals(proposalsData);
    } catch (error) {
      toast.error('Error al cargar propuestas');
    } finally {
      setLoading(false);
    }
  }, [contract, account]);
  const handleBuyTokens = async (e) => {
    e.preventDefault();
    if (!contract || !buyAmount) return;
    
    try {
      setLoading(true);
      const tx = await contract.buyTokens({ value: ethers.parseEther(buyAmount) });
      await tx.wait();
      
      toast.success('Tokens comprados exitosamente!');
      setBuyAmount('');
      loadDashboardData(contract, account);
    } catch (error) {
      toast.error('Error al comprar tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleStakeTokens = async (e) => {
    e.preventDefault();
    if (!contract || !stakeAmount) return;
    
    try {
      setLoading(true);
      const tx = await contract.stakeTokens(ethers.parseEther(stakeAmount), stakeType);
      await tx.wait();
      
      toast.success('Tokens stakeados exitosamente!');
      setStakeAmount('');
      loadDashboardData(contract, account);
    } catch (error) {
      toast.error('Error al stakear tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleUnstake = async (amount, isVoting) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const tx = await contract.unstakeTokens(ethers.parseEther(amount), isVoting);
      await tx.wait();
      
      toast.success('Tokens retirados exitosamente!');
      loadDashboardData(contract, account);
    } catch (error) {
      toast.error('Error al retirar tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateProposal = async (e) => {
    e.preventDefault();
    if (!contract || !proposalTitle || !proposalDescription) return;
    
    try {
      setLoading(true);
      let tx;
      
      if (proposalType === 'treasury') {
        if (!treasuryTarget || !treasuryAmount) {
          toast.error('Complete todos los campos para propuesta de tesorería');
          return;
        }
        tx = await contract.createTreasuryProposal(
          proposalTitle,
          proposalDescription,
          treasuryTarget,
          ethers.parseEther(treasuryAmount)
        );
      } else {
        tx = await contract.createProposal(proposalTitle, proposalDescription);
      }
      
      await tx.wait();
      
      toast.success('Propuesta creada exitosamente!');
      setProposalTitle('');
      setProposalDescription('');
      setTreasuryTarget('');
      setTreasuryAmount('');
      loadProposals();
    } catch (error) {
      toast.error('Error al crear propuesta');
    } finally {
      setLoading(false);
    }
  };

  const handleVote = async (proposalId, support) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const tx = await contract.vote(proposalId, support);
      await tx.wait();
      
      toast.success(`Voto ${support ? 'a favor' : 'en contra'} registrado!`);
      loadProposals();
      loadDashboardData(contract, account);
    } catch (error) {
      toast.error('Error al votar');
    } finally {
      setLoading(false);
    }
  };

  const handleExecuteProposal = async (proposalId) => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const tx = await contract.executeProposal(proposalId);
      await tx.wait();
      
      toast.success('Propuesta ejecutada exitosamente!');
      loadProposals();
      loadDashboardData(contract, account);
    } catch (error) {
      toast.error('Error al ejecutar propuesta');
    } finally {
      setLoading(false);
    }
  };

  const checkOwnership = async () => {
    if (!contract || !account) return;
    
    try {
      const owner = await contract.owner();
      const isCurrentUserOwner = owner.toLowerCase() === account.toLowerCase();
      setIsOwner(isCurrentUserOwner);
    } catch (error) {
      setIsOwner(false);
    }
  };
  const handleSetPanicMultisig = async (e) => {
    e.preventDefault();
    if (!contract || !panicMultisigAddress) return;
    
    try {
      setLoading(true);
      const tx = await contract.setPanicMultisig(panicMultisigAddress);
      await tx.wait();
      
      toast.success('Panic multisig configurado exitosamente!');
      setPanicMultisigAddress('');
    } catch (error) {
      toast.error('Error al configurar panic multisig');
    } finally {
      setLoading(false);
    }
  };

  const handleMintTokens = async (e) => {
    e.preventDefault();
    if (!contract || !mintToAddress || !mintAmount) return;
    
    try {
      setLoading(true);
      const tx = await contract.mintTokens(mintToAddress, ethers.parseEther(mintAmount));
      await tx.wait();
      
      toast.success('Tokens minteados exitosamente!');
      setMintToAddress('');
      setMintAmount('');
      loadDashboardData(contract, account);
    } catch (error) {
      toast.error('Error al mintear tokens');
    } finally {
      setLoading(false);
    }
  };

  const handleSetParameter = async (e) => {
    e.preventDefault();
    if (!contract || !parameterName || !parameterValue) return;
    
    try {
      setLoading(true);
      const paramBytes32 = ethers.encodeBytes32String(parameterName);
      const tx = await contract.setParameter(paramBytes32, parameterValue);
      await tx.wait();
      
      toast.success(`Parámetro ${parameterName} configurado exitosamente!`);
      setParameterName('');
      setParameterValue('');
    } catch (error) {
      toast.error('Error al configurar parámetro');
    } finally {
      setLoading(false);
    }
  };

  const handlePanic = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const tx = await contract.panic();
      await tx.wait();
      
      toast.success('Modo pánico activado!');
    } catch (error) {
      toast.error('Error al activar pánico');
    } finally {
      setLoading(false);
    }
  };

  const handleTranquility = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const tx = await contract.tranquility();
      await tx.wait();
      
      toast.success('Modo tranquilidad activado!');
    } catch (error) {
      toast.error('Error al activar tranquilidad');
    } finally {
      setLoading(false);
    }
  };

  const filteredProposals = proposals.filter(proposal => {
    if (proposalFilter === 'all') return true;
    if (proposalFilter === 'active') return proposal.state === 0;
    if (proposalFilter === 'accepted') return proposal.state === 1;
    if (proposalFilter === 'rejected') return proposal.state === 2;
    return true;
  });

  const getProposalStateText = (state) => {
    switch (state) {
      case 0: return 'Activa';
      case 1: return 'Aceptada';
      case 2: return 'Rechazada';
      default: return 'Desconocido';
    }
  };

  const getProposalTypeText = (type) => {
    switch (type) {
      case 0: return 'Estándar';
      case 1: return 'Tesorería';
      default: return 'Desconocido';
    }
  };

  const isProposalExpired = (endTime) => {
    return Date.now() / 1000 > Number(endTime);
  };

  useEffect(() => {
    if (activeTab === 'proposals' && contract) {
      loadProposals();
    }
  }, [activeTab, contract, loadProposals]);
  return (
    <div className="container">
      <Toaster position="top-right" />
      
      <div className="header">
        <h1>🏛️ DAO Governance</h1>
        <p>Sistema de Gobernanza Descentralizada con Gestión de Tesorería</p>
      </div>

      <div className="wallet-section">
        {!account ? (
          <>
            <div className="wallet-grid">
              <div className="wallet-option">
                <button 
                  className="connect-button metamask-btn" 
                  onClick={() => connectSpecificWallet('metamask')}
                  disabled={loading}
                >
                  <div className="wallet-icon">🦊</div>
                  <div className="wallet-info">
                    <strong>MetaMask</strong>
                    <small>Wallet de navegador más popular</small>
                  </div>
                </button>
                {!detectWallets().metamask && (
                  <small className="install-hint">
                    <a href="https://metamask.io" target="_blank" rel="noopener noreferrer">
                      📥 Instalar MetaMask
                    </a>
                  </small>
                )}
              </div>

              <div className="wallet-option">
                <button 
                  className="connect-button rabby-btn" 
                  onClick={() => connectSpecificWallet('rabby')}
                  disabled={loading}
                >
                  <div className="wallet-icon">🐰</div>
                  <div className="wallet-info">
                    <strong>Rabby Wallet</strong>
                    <small>Wallet avanzada para DeFi</small>
                  </div>
                </button>
                {!detectWallets().rabby && (
                  <small className="install-hint">
                    <a href="https://rabby.io" target="_blank" rel="noopener noreferrer">
                      📥 Instalar Rabby
                    </a>
                  </small>
                )}
              </div>

              {detectWallets().generic && (
                <div className="wallet-option">
                  <button 
                    className="connect-button generic-btn" 
                    onClick={() => connectSpecificWallet('generic')}
                    disabled={loading}
                  >
                    <div className="wallet-icon">💼</div>
                    <div className="wallet-info">
                      <strong>Otra Wallet</strong>
                      <small>Conectar wallet detectada</small>
                    </div>
                  </button>
                </div>
              )}
            </div>

            <div className="wallet-help">
              <details>
                <summary>❓ ¿Necesitas ayuda para conectar tu wallet?</summary>
                <div className="help-content">
                  <h4>Para wallets de escritorio:</h4>
                  <ul>
                    <li>Instala la extensión del navegador</li>
                    <li>Crea o importa tu wallet</li>
                    <li>Haz clic en el botón correspondiente arriba</li>
                  </ul>
                  
                  <h4>Wallets recomendadas:</h4>
                  <ul>
                    <li><strong>Principiantes:</strong> MetaMask</li>
                    <li><strong>Móvil:</strong> Rainbow, MetaMask Mobile</li>
                    <li><strong>Avanzados:</strong> Rabby, Frame, Trezor Suite</li>
                  </ul>
                </div>
              </details>
            </div>
          </>
        ) : (
          <div className="wallet-info">
            <div className="wallet-details">
              <div className="wallet-avatar">
                {connectedWalletType === 'metamask' && '🦊'}
                {connectedWalletType === 'rabby' && '🐰'}
                {connectedWalletType === 'generic' && '💼'}
              </div>
              <div className="wallet-text">
                <strong>
                  {connectedWalletType === 'metamask' && 'MetaMask'}
                  {connectedWalletType === 'rabby' && 'Rabby Wallet'}
                  {connectedWalletType === 'generic' && 'Wallet Conectada'}
                </strong>
                <span className="wallet-address">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'N/A'}</span>
              </div>
            </div>
            <button className="disconnect-button" onClick={disconnectWallet}>
              Desconectar
            </button>
          </div>
        )}
      </div>

      {account && (
        <>
          <div className="nav-tabs">
            <button 
              className={`nav-tab ${activeTab === 'dashboard' ? 'active' : ''}`}
              onClick={() => setActiveTab('dashboard')}
            >
              Dashboard
            </button>
            <button 
              className={`nav-tab ${activeTab === 'buy' ? 'active' : ''}`}
              onClick={() => setActiveTab('buy')}
            >
              Comprar Tokens
            </button>
            <button 
              className={`nav-tab ${activeTab === 'stake' ? 'active' : ''}`}
              onClick={() => setActiveTab('stake')}
            >
              Staking
            </button>
            <button 
              className={`nav-tab ${activeTab === 'proposals' ? 'active' : ''}`}
              onClick={() => setActiveTab('proposals')}
            >
              Propuestas
            </button>
            <button 
              className={`nav-tab ${activeTab === 'create' ? 'active' : ''}`}
              onClick={() => setActiveTab('create')}
            >
              Crear Propuesta
            </button>
            {isOwner && (
              <button 
                className={`nav-tab ${activeTab === 'admin' ? 'active' : ''}`}
                onClick={() => setActiveTab('admin')}
              >
                👑 Admin
              </button>
            )}
          </div>

          {loading && <div className="loading">Cargando...</div>}          {activeTab === 'dashboard' && (
            <div className="card">
              <h2>📊 Dashboard</h2>
              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(balance).toFixed(2)}</div>
                  <div className="stat-label">Tokens Disponibles</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(staking.votingStake).toFixed(2)}</div>
                  <div className="stat-label">Tokens Stakeados (Voto)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(staking.proposalStake).toFixed(2)}</div>
                  <div className="stat-label">Tokens Stakeados (Propuestas)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{votingPower}</div>
                  <div className="stat-label">Poder de Voto</div>
                </div>
              </div>
              
              <div className="stake-section">
                <h3>💰 Información de Staking</h3>
                <div className="stake-info">
                  <div className="stake-item">
                    <h4>Staking para Voto</h4>
                    <p>{parseFloat(staking.votingStake).toFixed(2)} tokens</p>
                    {parseFloat(staking.votingStake) > 0 && (
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleUnstake(staking.votingStake, true)}
                        disabled={Date.now() / 1000 < staking.votingUnlockTime}
                      >
                        {Date.now() / 1000 < staking.votingUnlockTime ? 'Bloqueado' : 'Retirar'}
                      </button>
                    )}
                  </div>
                  <div className="stake-item">
                    <h4>Staking para Propuestas</h4>
                    <p>{parseFloat(staking.proposalStake).toFixed(2)} tokens</p>
                    {parseFloat(staking.proposalStake) > 0 && (
                      <button 
                        className="btn btn-danger"
                        onClick={() => handleUnstake(staking.proposalStake, false)}
                        disabled={Date.now() / 1000 < staking.proposalUnlockTime}
                      >
                        {Date.now() / 1000 < staking.proposalUnlockTime ? 'Bloqueado' : 'Retirar'}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              <div className="card">
                <h3>🏦 Tesorería de la DAO</h3>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(treasuryBalance).toFixed(4)} ETH</div>
                  <div className="stat-label">Balance de Tesorería</div>
                </div>
              </div>

              <div className="account-info">
                <h3>👤 Información de Cuenta</h3>
                <p><strong>Cuenta Conectada:</strong> <code>{account}</code></p>
                <p><strong>Red:</strong> Hardhat Local (Chain ID: 1337)</p>
                <p><strong>Contrato:</strong> <code>{DAO_CONTRACT_ADDRESS}</code></p>
              </div>
            </div>
          )}          {activeTab === 'buy' && (
            <div className="card">
              <h2>💰 Comprar Tokens</h2>
              <form onSubmit={handleBuyTokens}>
                <div className="form-group">
                  <label>Cantidad de ETH a invertir:</label>
                  <input
                    type="number"
                    step="0.001"
                    className="form-control"
                    value={buyAmount}
                    onChange={(e) => setBuyAmount(e.target.value)}
                    placeholder="0.1"
                    required
                  />
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Comprar Tokens
                </button>
              </form>
            </div>
          )}          {activeTab === 'stake' && (
            <div className="card">
              <h2>🔒 Stakear Tokens</h2>
              <form onSubmit={handleStakeTokens}>
                <div className="form-group">
                  <label>Cantidad de tokens a stakear:</label>
                  <input
                    type="number"
                    step="0.01"
                    className="form-control"
                    value={stakeAmount}
                    onChange={(e) => setStakeAmount(e.target.value)}
                    placeholder="1000"
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Tipo de staking:</label>
                  <select 
                    className="form-control"
                    value={stakeType}
                    onChange={(e) => setStakeType(e.target.value === 'true')}
                  >
                    <option value="true">Para Votar</option>
                    <option value="false">Para Crear Propuestas</option>
                  </select>
                </div>
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Stakear Tokens
                </button>
              </form>
            </div>
          )}          {activeTab === 'proposals' && (
            <div className="card">
              <h2>📋 Propuestas</h2>
              
              <div className="filter-section">
                <button 
                  className={`filter-btn ${proposalFilter === 'all' ? 'active' : ''}`}
                  onClick={() => setProposalFilter('all')}
                >
                  Todas
                </button>
                <button 
                  className={`filter-btn ${proposalFilter === 'active' ? 'active' : ''}`}
                  onClick={() => setProposalFilter('active')}
                >
                  Activas
                </button>
                <button 
                  className={`filter-btn ${proposalFilter === 'accepted' ? 'active' : ''}`}
                  onClick={() => setProposalFilter('accepted')}
                >
                  Aceptadas
                </button>
                <button 
                  className={`filter-btn ${proposalFilter === 'rejected' ? 'active' : ''}`}
                  onClick={() => setProposalFilter('rejected')}
                >
                  Rechazadas
                </button>
              </div>

              {filteredProposals.length === 0 ? (
                <p>No hay propuestas disponibles.</p>
              ) : (
                filteredProposals.map((proposal) => (
                  <div key={proposal.id} className="proposal">
                    <div className="proposal-header">
                      <h3 className="proposal-title">{proposal.title || 'Propuesta sin título'}</h3>
                      <span className={`proposal-status status-${proposal.state === 0 ? 'active' : proposal.state === 1 ? 'accepted' : 'rejected'}`}>
                        {getProposalStateText(proposal.state)}
                      </span>
                    </div>
                    
                    <div className="proposal-meta">
                      <span>Tipo: {getProposalTypeText(proposal.proposalType)}</span>
                      <span>Propuesto por: {proposal.proposer ? `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}` : 'N/A'}</span>
                      <span>Termina: {proposal.endTime ? new Date(Number(proposal.endTime) * 1000).toLocaleString() : 'Fecha no disponible'}</span>
                    </div>
                    
                    <div className="proposal-description">
                      {proposal.description || 'Sin descripción'}
                    </div>

                    {proposal.proposalType === 1 && proposal.treasuryTarget && proposal.treasuryAmount && (
                      <div className="proposal-treasury">
                        <strong>💰 Propuesta de Tesorería:</strong>
                        <p>Destino: {proposal.treasuryTarget}</p>
                        <p>Cantidad: {ethers.formatEther(proposal.treasuryAmount)} ETH</p>
                      </div>
                    )}
                    
                    <div className="vote-results">
                      <span className="vote-count vote-for">
                        ✅ A favor: {proposal.forVotes ? proposal.forVotes.toString() : '0'}
                      </span>
                      <span className="vote-count vote-against">
                        ❌ En contra: {proposal.againstVotes ? proposal.againstVotes.toString() : '0'}
                      </span>
                    </div>
                    
                    {proposal.state === 0 && !isProposalExpired(proposal.endTime) && !proposal.hasVoted && (
                      <div className="vote-section">
                        <button 
                          className="btn btn-success"
                          onClick={() => handleVote(proposal.id, true)}
                          disabled={loading}
                        >
                          Votar A Favor
                        </button>
                        <button 
                          className="btn btn-danger"
                          onClick={() => handleVote(proposal.id, false)}
                          disabled={loading}
                        >
                          Votar En Contra
                        </button>
                      </div>
                    )}
                    
                    {proposal.state === 0 && isProposalExpired(proposal.endTime) && !proposal.executed && (
                      <button 
                        className="btn btn-primary"
                        onClick={() => handleExecuteProposal(proposal.id)}
                        disabled={loading}
                      >
                        Ejecutar Propuesta
                      </button>
                    )}
                    
                    {proposal.hasVoted && (
                      <p className="success">✅ Ya has votado en esta propuesta</p>
                    )}
                  </div>
                ))
              )}
            </div>
          )}          {activeTab === 'create' && (
            <div className="card">
              <h2>➕ Crear Nueva Propuesta</h2>
              <form onSubmit={handleCreateProposal}>
                <div className="form-group">
                  <label>Tipo de propuesta:</label>
                  <select 
                    className="form-control"
                    value={proposalType}
                    onChange={(e) => setProposalType(e.target.value)}
                  >
                    <option value="standard">Propuesta Estándar</option>
                    <option value="treasury">Propuesta de Tesorería</option>
                  </select>
                </div>
                
                <div className="form-group">
                  <label>Título:</label>
                  <input
                    type="text"
                    className="form-control"
                    value={proposalTitle}
                    onChange={(e) => setProposalTitle(e.target.value)}
                    placeholder="Título de la propuesta"
                    required
                  />
                </div>
                
                <div className="form-group">
                  <label>Descripción:</label>
                  <textarea
                    className="form-control"
                    rows="4"
                    value={proposalDescription}
                    onChange={(e) => setProposalDescription(e.target.value)}
                    placeholder="Descripción detallada de la propuesta"
                    required
                  />
                </div>

                {proposalType === 'treasury' && (
                  <>
                    <div className="form-group">
                      <label>Dirección de destino:</label>
                      <input
                        type="text"
                        className="form-control"
                        value={treasuryTarget}
                        onChange={(e) => setTreasuryTarget(e.target.value)}
                        placeholder="0x..."
                        required
                      />
                    </div>
                    
                    <div className="form-group">
                      <label>Cantidad de ETH:</label>
                      <input
                        type="number"
                        step="0.001"
                        className="form-control"
                        value={treasuryAmount}
                        onChange={(e) => setTreasuryAmount(e.target.value)}
                        placeholder="1.0"
                        required
                      />
                    </div>
                  </>
                )}
                
                <button type="submit" className="btn btn-primary" disabled={loading}>
                  Crear Propuesta
                </button>
              </form>
            </div>          )}          {activeTab === 'admin' && isOwner && (
            <div className="card">
              <h2>👑 Funciones de Administración</h2>
              <p style={{color: 'rgba(255,255,255,0.8)', marginBottom: '20px'}}>
                Solo disponible para el owner del contrato
              </p>

              <div className="admin-section">
                <h3>🚨 Configurar Panic Multisig</h3>
                <form onSubmit={handleSetPanicMultisig}>
                  <input
                    type="text"
                    placeholder="Dirección del panic multisig"
                    value={panicMultisigAddress}
                    onChange={(e) => setPanicMultisigAddress(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Set Panic Multisig
                  </button>
                </form>
              </div>

              <div className="admin-section">
                <h3>💰 Mintear Tokens</h3>
                <form onSubmit={handleMintTokens}>
                  <input
                    type="text"
                    placeholder="Dirección destino"
                    value={mintToAddress}
                    onChange={(e) => setMintToAddress(e.target.value)}
                    required
                  />
                  <input
                    type="number"
                    placeholder="Cantidad de tokens"
                    value={mintAmount}
                    onChange={(e) => setMintAmount(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Mint Tokens
                  </button>
                </form>
              </div>

              <div className="admin-section">
                <h3>⚙️ Cambiar Parámetros</h3>
                <form onSubmit={handleSetParameter}>
                  <input
                    type="text"
                    placeholder="Nombre del parámetro (ej: TOKEN_PRICE)"
                    value={parameterName}
                    onChange={(e) => setParameterName(e.target.value)}
                    required
                  />
                  <input
                    type="text"
                    placeholder="Nuevo valor"
                    value={parameterValue}
                    onChange={(e) => setParameterValue(e.target.value)}
                    required
                  />
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    Set Parameter
                  </button>
                </form>
                <small style={{color: 'rgba(255,255,255,0.6)', marginTop: '10px', display: 'block'}}>
                  Parámetros disponibles: TOKEN_PRICE, VOTING_DURATION, STAKING_LOCK_TIME
                </small>
              </div>

              <div className="admin-section">
                <h3>🚨 Control de Pánico</h3>
                <div style={{display: 'flex', gap: '10px'}}>
                  <button 
                    className="btn btn-danger" 
                    onClick={handlePanic}
                    disabled={loading}
                  >
                    🚨 Panic
                  </button>
                  <button 
                    className="btn btn-success" 
                    onClick={handleTranquility}
                    disabled={loading}
                  >
                    😌 Tranquility
                  </button>
                </div>
                <small style={{color: 'rgba(255,255,255,0.6)', marginTop: '10px', display: 'block'}}>
                  Panic suspende todas las operaciones. Tranquility solo puede ser ejecutado por panic multisig.
                </small>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
