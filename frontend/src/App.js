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

const DAO_CONTRACT_ADDRESS = "0x5FbDB2315678afecb367f032d93F642f64180aa3";

function App() {
  const [account, setAccount] = useState('');
  const [provider, setProvider] = useState(null);
  const [signer, setSigner] = useState(null);
  const [contract, setContract] = useState(null);
  const [activeTab, setActiveTab] = useState('dashboard');
  const [loading, setLoading] = useState(false);  const [connectedWalletType, setConnectedWalletType] = useState('');
  const [isConnecting, setIsConnecting] = useState(false);
  const [networkError, setNetworkError] = useState('');
  const [connectionError, setConnectionError] = useState('');
  
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
  // Función mejorada para detectar wallets disponibles
  const detectWallets = () => {
    const wallets = { metamask: false, rabby: false, generic: false };
    
    if (typeof window.ethereum === 'undefined') {
      console.log('No hay ethereum provider disponible');
      return wallets;
    }

    // Si hay múltiples providers
    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      console.log('Múltiples providers detectados:', window.ethereum.providers.length);
      window.ethereum.providers.forEach((provider, index) => {
        console.log(`Provider ${index}:`, {
          isMetaMask: provider.isMetaMask,
          isRabby: provider.isRabby,
          chainId: provider.chainId
        });
        if (provider.isMetaMask) wallets.metamask = true;
        if (provider.isRabby) wallets.rabby = true;
      });
    } else {
      // Un solo provider
      console.log('Un solo provider detectado:', {
        isMetaMask: window.ethereum.isMetaMask,
        isRabby: window.ethereum.isRabby,
        chainId: window.ethereum.chainId
      });
      
      if (window.ethereum.isMetaMask) {
        wallets.metamask = true;
      } else if (window.ethereum.isRabby) {
        wallets.rabby = true;
      } else {
        wallets.generic = true;
      }
    }
    
    console.log('Wallets detectadas:', wallets);
    return wallets;
  };

  // Función mejorada para obtener el provider específico
  const getProvider = (walletType) => {
    if (typeof window.ethereum === 'undefined') {
      console.error('No hay ethereum provider disponible');
      return null;
    }

    if (window.ethereum.providers && Array.isArray(window.ethereum.providers)) {
      if (walletType === 'metamask') {
        const provider = window.ethereum.providers.find(p => p.isMetaMask);
        console.log('MetaMask provider encontrado:', !!provider);
        return provider;
      } else if (walletType === 'rabby') {
        const provider = window.ethereum.providers.find(p => p.isRabby);
        console.log('Rabby provider encontrado:', !!provider);
        return provider;
      }
    } else {
      if (walletType === 'metamask' && window.ethereum.isMetaMask) {
        console.log('MetaMask provider único encontrado');
        return window.ethereum;
      } else if (walletType === 'rabby' && window.ethereum.isRabby) {
        console.log('Rabby provider único encontrado');
        return window.ethereum;
      } else if (walletType === 'generic') {
        console.log('Provider genérico encontrado');
        return window.ethereum;
      }
    }
    
    console.error(`Provider ${walletType} no encontrado`);
    return null;
  };
  // Función mejorada para cambiar a la red de Hardhat
  const switchToHardhatNetwork = async (ethereum) => {
    if (!ethereum) {
      console.error('No hay provider disponible para cambiar red');
      return false;
    }

    try {
      console.log('Intentando cambiar a red Hardhat (chainId: 0x539)');
      
      // Verificar red actual
      const currentChainId = await ethereum.request({ method: 'eth_chainId' });
      console.log('Red actual:', currentChainId);
      
      if (currentChainId === '0x539') {
        console.log('Ya estás en la red correcta');
        return true;
      }

      // Intentar cambiar a la red
      try {
        await ethereum.request({
          method: 'wallet_switchEthereumChain',
          params: [{ chainId: '0x539' }],
        });
        console.log('Red cambiada exitosamente');
        return true;
      } catch (switchError) {
        console.log('Error al cambiar red:', switchError);
        
        // Si la red no existe (error 4902), agregarla
        if (switchError.code === 4902) {
          console.log('Agregando red Hardhat a MetaMask');
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
            console.log('Red Hardhat agregada exitosamente');
            return true;
          } catch (addError) {
            console.error('Error agregando red Hardhat:', addError);
            toast.error('Error agregando la red local de Hardhat. Asegúrate de que Hardhat esté ejecutándose en localhost:8545');
            return false;
          }
        } else if (switchError.code === 4001) {
          console.log('Usuario rechazó el cambio de red');
          toast.error('Necesitas cambiar a la red local de Hardhat para usar la aplicación');
          return false;
        } else {
          console.error('Error desconocido al cambiar red:', switchError);
          toast.error(`Error cambiando a la red local: ${switchError.message || 'Error desconocido'}`);
          return false;
        }
      }
    } catch (error) {
      console.error('Error general en switchToHardhatNetwork:', error);
      toast.error(`Error configurando la red: ${error.message || 'Error desconocido'}`);
      return false;
    }
  };
  // Función mejorada para conectar wallet específica
  const connectSpecificWallet = async (walletType) => {
    if (isConnecting) {
      console.log('Ya hay una conexión en progreso');
      return;
    }

    try {
      setIsConnecting(true);
      setConnectionError('');
      setNetworkError('');
      console.log(`Iniciando conexión con ${walletType}`);

      // Verificar disponibilidad del provider
      const ethereum = getProvider(walletType);
      if (!ethereum) {
        const errorMsg = `${walletType} no está disponible. ¿Está instalado?`;
        setConnectionError(errorMsg);
        toast.error(errorMsg);
        return;
      }

      console.log(`Provider ${walletType} encontrado`);

      // Verificar conexión a la red correcta
      const networkConfigured = await switchToHardhatNetwork(ethereum);
      if (!networkConfigured) {
        setNetworkError('Red incorrecta');
        return;
      }

      console.log('Red configurada correctamente');

      // Crear provider de ethers
      let provider;
      try {
        provider = new ethers.BrowserProvider(ethereum);
        console.log('Provider de ethers creado');
      } catch (providerError) {
        console.error('Error creando provider de ethers:', providerError);
        toast.error(`Error creando conexión: ${providerError.message}`);
        return;
      }

      // Solicitar acceso a cuentas
      let accounts;
      try {
        console.log('Solicitando acceso a cuentas...');
        accounts = await provider.send('eth_requestAccounts', []);
        console.log('Cuentas obtenidas:', accounts);
      } catch (accountError) {
        console.error('Error obteniendo cuentas:', accountError);
        if (accountError.code === 4001) {
          toast.error('Conexión rechazada por el usuario');
        } else {
          toast.error(`Error obteniendo cuentas: ${accountError.message}`);
        }
        return;
      }

      if (!accounts || accounts.length === 0) {
        toast.error('No se pudieron obtener cuentas de la wallet');
        return;
      }

      // Obtener signer
      let signer;
      try {
        console.log('Obteniendo signer...');
        signer = await provider.getSigner();
        console.log('Signer obtenido para cuenta:', await signer.getAddress());
      } catch (signerError) {
        console.error('Error obteniendo signer:', signerError);
        toast.error(`Error obteniendo signer: ${signerError.message}`);
        return;
      }

      // Crear instancia del contrato
      let contract;
      try {
        console.log('Creando instancia del contrato...');
        contract = new ethers.Contract(DAO_CONTRACT_ADDRESS, DAO_ABI, signer);
        console.log('Contrato creado:', contract.target);
      } catch (contractError) {
        console.error('Error creando contrato:', contractError);
        toast.error(`Error creando contrato: ${contractError.message}`);
        return;
      }

      // Verificar que el contrato esté desplegado
      try {
        console.log('Verificando contrato...');
        const code = await provider.getCode(DAO_CONTRACT_ADDRESS);
        if (code === '0x') {
          throw new Error('El contrato no está desplegado en esta dirección');
        }
        console.log('Contrato verificado exitosamente');
      } catch (verifyError) {
        console.error('Error verificando contrato:', verifyError);
        toast.error(`Error: ${verifyError.message}. ¿Está desplegado el contrato?`);
        return;
      }

      // Actualizar estado de la aplicación
      setProvider(provider);
      setSigner(signer);
      setAccount(accounts[0]);
      setConnectedWalletType(walletType);
      setContract(contract);
      
      console.log(`${walletType} conectada exitosamente`);
      toast.success(`${walletType} conectada exitosamente!`);

      // Cargar datos del dashboard
      try {
        await loadDashboardData(contract, accounts[0]);
      } catch (loadError) {
        console.error('Error cargando datos del dashboard:', loadError);
        toast.error(`Advertencia: Error cargando datos: ${loadError.message}`);
      }

      // Configurar listeners de eventos (solo una vez)
      setupWalletEventListeners(ethereum, contract);

    } catch (error) {
      console.error(`Error general conectando ${walletType}:`, error);
      setConnectionError(error.message);
      toast.error(`Error conectando ${walletType}: ${error.message}`);
    } finally {
      setIsConnecting(false);
    }
  };

  // Effect para detectar conexión existente al cargar la página
  useEffect(() => {
    const detectExistingConnection = async () => {
      if (typeof window.ethereum === 'undefined') {
        console.log('No hay provider de Ethereum disponible');
        return;
      }

      try {
        // Verificar si ya hay cuentas conectadas
        const accounts = await window.ethereum.request({ method: 'eth_accounts' });
        
        if (accounts && accounts.length > 0) {
          console.log('Conexión existente detectada:', accounts[0]);
          
          // Determinar tipo de wallet
          let walletType = 'generic';
          if (window.ethereum.isMetaMask) walletType = 'metamask';
          else if (window.ethereum.isRabby) walletType = 'rabby';
          
          // Intentar reconectar automáticamente
          await connectSpecificWallet(walletType);
        } else {
          console.log('No hay conexiones existentes');
        }
      } catch (error) {
        console.error('Error detectando conexión existente:', error);
      }
    };

    detectExistingConnection();
  }, []); // Solo ejecutar al montar el componente

  // Función para configurar los listeners de eventos de la wallet
  const setupWalletEventListeners = (ethereum, contractInstance) => {
    // Remover listeners existentes para evitar duplicados
    ethereum.removeAllListeners('accountsChanged');
    ethereum.removeAllListeners('chainChanged');
    ethereum.removeAllListeners('disconnect');

    // Listener para cambio de cuentas
    ethereum.on('accountsChanged', async (accounts) => {
      console.log('Cuentas cambiadas:', accounts);
      if (accounts.length === 0) {
        console.log('Todas las cuentas desconectadas');
        disconnectWallet();
      } else {
        console.log('Cambiando a cuenta:', accounts[0]);
        setAccount(accounts[0]);
        try {
          await loadDashboardData(contractInstance, accounts[0]);
        } catch (error) {
          console.error('Error recargando datos tras cambio de cuenta:', error);
          toast.error('Error recargando datos tras cambio de cuenta');
        }
      }
    });

    // Listener para cambio de red
    ethereum.on('chainChanged', (chainId) => {
      console.log('Red cambiada a:', chainId);
      if (chainId !== '0x539') {
        setNetworkError('Red incorrecta');
        toast.error('Red incorrecta. Cambia a la red local de Hardhat (localhost:8545)');
      } else {
        setNetworkError('');
        toast.success('Conectado a la red correcta');
        // Recargar la página para asegurar una conexión limpia
        window.location.reload();
      }
    });

    // Listener para desconexión
    ethereum.on('disconnect', (error) => {
      console.log('Wallet desconectada:', error);
      disconnectWallet();
    });
  };  // Función mejorada para desconectar wallet
  const disconnectWallet = async () => {
    try {
      console.log('Desconectando wallet...');
      
      // Limpiar listeners si existe ethereum
      if (window.ethereum) {
        window.ethereum.removeAllListeners('accountsChanged');
        window.ethereum.removeAllListeners('chainChanged');
        window.ethereum.removeAllListeners('disconnect');
      }

      // Resetear todos los estados
      setAccount('');
      setProvider(null);
      setSigner(null);
      setContract(null);
      setConnectedWalletType('');
      setIsConnecting(false);
      setNetworkError('');
      setConnectionError('');
      
      // Resetear datos de la aplicación
      setBalance('0');
      setStaking({ votingStake: '0', proposalStake: '0', votingUnlockTime: 0, proposalUnlockTime: 0 });
      setVotingPower('0');
      setTreasuryBalance('0');
      setProposals([]);
      setIsOwner(false);
      
      // Resetear formularios
      setBuyAmount('');
      setStakeAmount('');
      setProposalTitle('');
      setProposalDescription('');
      setTreasuryTarget('');
      setTreasuryAmount('');
      setPanicMultisigAddress('');
      setMintToAddress('');
      setMintAmount('');
      setParameterName('');
      setParameterValue('');
      setLoading(false);
      
      console.log('Wallet desconectada correctamente');
      toast.success('Wallet desconectada');
    } catch (error) {
      console.error('Error al desconectar wallet:', error);
      toast.error('Error al desconectar wallet');
    }
  };  // Función mejorada para cargar datos del dashboard
  const loadDashboardData = async (contractInstance, userAccount) => {
    if (!contractInstance || !userAccount) {
      console.error('loadDashboardData: Faltan parámetros');
      return;
    }

    try {
      setLoading(true);
      console.log('Loading dashboard data for:', userAccount);
      console.log('Contract address:', contractInstance.target);
      
      // Verificar que el contrato esté disponible
      const code = await contractInstance.runner.provider.getCode(contractInstance.target);
      if (code === '0x') {
        throw new Error('El contrato no está desplegado en esta dirección');
      }

      // Cargar balance de tokens del usuario
      let userBalance;
      try {
        userBalance = await contractInstance.getTokenBalance(userAccount);
        console.log('User balance (raw):', userBalance.toString());
      } catch (error) {
        console.error('Error obteniendo balance de usuario:', error);
        throw new Error(`Error obteniendo balance: ${error.message}`);
      }
      
      // Cargar información de staking del usuario
      let userStaking;
      try {
        userStaking = await contractInstance.getUserStaking(userAccount);
        console.log('User staking:', userStaking);
      } catch (error) {
        console.error('Error obteniendo staking de usuario:', error);
        throw new Error(`Error obteniendo staking: ${error.message}`);
      }
      
      // Cargar poder de voto del usuario
      let userVotingPower;
      try {
        userVotingPower = await contractInstance.getVotingPower(userAccount);
        console.log('User voting power:', userVotingPower.toString());
      } catch (error) {
        console.error('Error obteniendo voting power:', error);
        throw new Error(`Error obteniendo poder de voto: ${error.message}`);
      }
      
      // Cargar balance del tesoro
      let treasury;
      try {
        treasury = await contractInstance.getTreasuryBalance();
        console.log('Treasury balance (raw):', treasury.toString());
        console.log('Treasury balance (formatted):', ethers.formatEther(treasury));
      } catch (error) {
        console.error('Error obteniendo treasury balance:', error);
        throw new Error(`Error obteniendo tesoro: ${error.message}`);
      }
      
      // Actualizar estados con los datos obtenidos
      setBalance(ethers.formatEther(userBalance));
      setStaking({
        votingStake: ethers.formatEther(userStaking.votingStake),
        proposalStake: ethers.formatEther(userStaking.proposalStake),
        votingUnlockTime: Number(userStaking.votingUnlockTime),
        proposalUnlockTime: Number(userStaking.proposalUnlockTime)
      });
      setVotingPower(userVotingPower.toString());
      setTreasuryBalance(ethers.formatEther(treasury));
      
      // Verificar si el usuario es owner
      try {
        await checkOwnership();
      } catch (error) {
        console.error('Error verificando ownership:', error);
        // No es crítico, continuar sin error
      }
      
      console.log('Dashboard data loaded successfully');
      
    } catch (error) {
      console.error('Error en loadDashboardData:', error);
      const errorMessage = error.message || 'Error desconocido al cargar datos';
      toast.error(`Error al cargar datos: ${errorMessage}`);
      setConnectionError(errorMessage);
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
          proposalType: Number(proposal[9]) || 0,
          treasuryTarget: proposal[10] || '',
          treasuryAmount: proposal[11] || 0,
          executed: proposal[12] || false,
          hasVoted: hasUserVoted
        };
        
        // Debug log para verificar datos de propuesta
        console.log(`Propuesta ${i}:`, {
          id: mappedProposal.id,
          title: mappedProposal.title,
          proposalType: mappedProposal.proposalType,
          treasuryTarget: mappedProposal.treasuryTarget,
          treasuryAmount: mappedProposal.treasuryAmount
        });
        
        proposalsData.push(mappedProposal);
      }
      
      setProposals(proposalsData);
    } catch (error) {
      toast.error('Error al cargar propuestas');
    } finally {
      setLoading(false);
    }
  }, [contract, account]);  // Función mejorada para comprar tokens
  const handleBuyTokens = async (e) => {
    e.preventDefault();
    if (!contract || !buyAmount) {
      toast.error('Debes ingresar una cantidad válida de ETH');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Comprando tokens con ${buyAmount} ETH`);
      
      // Verificar que el usuario tenga suficiente ETH
      const userEthBalance = await provider.getBalance(account);
      const requiredEth = ethers.parseEther(buyAmount);
      
      if (userEthBalance < requiredEth) {
        throw new Error(`Balance de ETH insuficiente. Tienes ${ethers.formatEther(userEthBalance)} ETH`);
      }      console.log('Enviando transacción de compra...');
      const tx = await contract.buyTokens({ value: requiredEth });
      console.log('Transacción enviada, hash:', tx.hash);
      
      // Usar toast.promise o fallback
      let receipt;
      if (typeof toast.promise === 'function') {
        receipt = await toast.promise(
          tx.wait(),
          {
            loading: 'Procesando compra de tokens...',
            success: `Tokens comprados exitosamente con ${buyAmount} ETH!`,
            error: 'Error confirmando la transacción'
          }
        );
      } else {
        receipt = await handleTransactionToast(
          tx.wait(),
          {
            loading: 'Procesando compra de tokens...',
            success: `Tokens comprados exitosamente con ${buyAmount} ETH!`,
            error: 'Error confirmando la transacción'
          }
        );
      }
      console.log('Compra confirmada:', receipt);
      
      setBuyAmount('');
      
      // Recargar datos
      await loadDashboardData(contract, account);
      
    } catch (error) {
      console.error('Error en handleBuyTokens:', error);
      
      let errorMessage = 'Error al comprar tokens';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Fondos de ETH insuficientes para la transacción';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.message.includes('Balance de ETH insuficiente')) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = `Error del contrato: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  // Función mejorada para stakear tokens
  const handleStakeTokens = async (e) => {
    e.preventDefault();
    if (!contract || !stakeAmount) {
      toast.error('Debes ingresar una cantidad válida');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Iniciando staking de ${stakeAmount} tokens (tipo: ${stakeType ? 'voto' : 'propuesta'})`);
      
      // Validar que el usuario tenga suficientes tokens
      const userBalance = await contract.getTokenBalance(account);
      const requiredAmount = ethers.parseEther(stakeAmount);
      
      if (userBalance < requiredAmount) {
        throw new Error(`Balance insuficiente. Tienes ${ethers.formatEther(userBalance)} tokens`);
      }      console.log('Enviando transacción de staking...');
      const tx = await contract.stakeTokens(requiredAmount, stakeType);
      console.log('Transacción enviada, hash:', tx.hash);
      
      // Usar toast.promise para mejor UX
      const receipt = await toast.promise(
        tx.wait(),
        {
          loading: 'Procesando staking...',
          success: `Tokens stakeados exitosamente! ${stakeType ? 'Para votar' : 'Para propuestas'}`,
          error: 'Error confirmando el staking'
        }
      );
      console.log('Transacción confirmada, receipt:', receipt);
      
      setStakeAmount('');
      
      // Recargar datos
      await loadDashboardData(contract, account);
      
    } catch (error) {
      console.error('Error en handleStakeTokens:', error);
      
      // Manejo específico de errores
      let errorMessage = 'Error al stakear tokens';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para la transacción';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.message.includes('Balance insuficiente')) {
        errorMessage = error.message;
      } else if (error.reason) {
        errorMessage = `Error del contrato: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función mejorada para retirar tokens del staking
  const handleUnstake = async (amount, isVoting) => {
    if (!contract || !amount) {
      toast.error('Cantidad inválida');
      return;
    }
    
    try {
      setLoading(true);
      console.log(`Retirando ${amount} tokens del staking (${isVoting ? 'voting' : 'proposal'})`);
        const tx = await contract.unstakeTokens(ethers.parseEther(amount), isVoting);
      console.log('Transacción de unstake enviada:', tx.hash);
      
      // Usar toast.promise para mejor UX
      const receipt = await toast.promise(
        tx.wait(),
        {
          loading: 'Retirando tokens del staking...',
          success: 'Tokens retirados exitosamente!',
          error: 'Error confirmando el retiro'
        }
      );
      console.log('Unstake confirmado:', receipt);
      
      toast.success('Tokens retirados exitosamente!');
      
      // Recargar datos
      await loadDashboardData(contract, account);
      
    } catch (error) {
      console.error('Error en handleUnstake:', error);
      
      let errorMessage = 'Error al retirar tokens';
      
      if (error.message.includes('insufficient funds')) {
        errorMessage = 'Fondos insuficientes para la transacción';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.message.includes('still locked')) {
        errorMessage = 'Los tokens aún están bloqueados. Espera el tiempo mínimo.';
      } else if (error.reason) {
        errorMessage = `Error del contrato: ${error.reason}`;
      } else if (error.message) {
        errorMessage = error.message;
      }
      
      toast.error(errorMessage);
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
    switch (Number(type)) {
      case 0: return 'Propuesta Estándar';
      case 1: return 'Propuesta de Tesorería';
      default: return `Tipo Desconocido (${type})`;
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
  const debugConnection = async () => {
    console.log('=== DEBUG CONNECTION ===');
    console.log('Contract Address:', DAO_CONTRACT_ADDRESS);
    
    if (provider) {
      try {
        const network = await provider.getNetwork();
        console.log('Network:', network);
        console.log('Chain ID:', network.chainId);
        
        const blockNumber = await provider.getBlockNumber();
        console.log('Block Number:', blockNumber);
        
        if (contract) {
          const treasuryBalance = await contract.getTreasuryBalance();
          console.log('Treasury Balance (raw):', treasuryBalance);
          console.log('Treasury Balance (formatted):', ethers.formatEther(treasuryBalance));
          
          const totalSupply = await contract.totalSupply();
          console.log('Total Supply:', ethers.formatEther(totalSupply));
        }
      } catch (error) {
        console.error('Debug error:', error);
      }
    } else {
      console.log('No provider available');
    }
    console.log('=== END DEBUG ===');
  };

  // Función de debugging para verificar datos de propuestas
  const debugProposals = async () => {
    if (!contract) {
      console.log('No hay contrato disponible');
      return;
    }

    try {
      console.log('=== DEBUG PROPUESTAS ===');
      const proposalCount = await contract.getProposalCount();
      console.log('Total de propuestas:', proposalCount.toString());
      
      for (let i = 0; i < proposalCount; i++) {
        const rawProposal = await contract.getProposal(i);
        console.log(`\nPropuesta ${i} (raw data):`, rawProposal);
        console.log(`Propuesta ${i} (parsed):`, {
          id: rawProposal[0].toString(),
          title: rawProposal[1],
          description: rawProposal[2],
          proposer: rawProposal[3],
          forVotes: rawProposal[4].toString(),
          againstVotes: rawProposal[5].toString(),
          startTime: rawProposal[6].toString(),
          endTime: rawProposal[7].toString(),
          state: rawProposal[8].toString(),
          proposalType: rawProposal[9].toString(),
          treasuryTarget: rawProposal[10],
          treasuryAmount: rawProposal[11].toString(),
          executed: rawProposal[12]
        });
      }
      console.log('=== FIN DEBUG ===');
    } catch (error) {
      console.error('Error en debug:', error);
    }
  };

  // Helper function para manejar notificaciones de transacciones
  const handleTransactionToast = async (txPromise, messages) => {
    const loadingToast = toast.loading(messages.loading || 'Procesando transacción...');
    
    try {
      const result = await txPromise;
      toast.dismiss(loadingToast);
      toast.success(messages.success || 'Transacción exitosa!');
      return result;
    } catch (error) {
      toast.dismiss(loadingToast);
      toast.error(messages.error || 'Error en la transacción');
      throw error;
    }
  };

  return (
    <div className="container">
      <Toaster position="top-right" />
        <div className="header">
        <h1>🏛️ DAO Governance</h1>
        <p>Sistema de Gobernanza Descentralizada con Gestión de Tesorería</p>
      </div>

      {/* Sección de notificaciones de estado */}
      {(connectionError || networkError || isConnecting) && (
        <div className="status-notifications">
          {isConnecting && (
            <div className="status-card connecting">
              <div className="status-icon">⏳</div>
              <div className="status-content">
                <strong>Conectando wallet...</strong>
                <small>Por favor espera mientras establecemos la conexión</small>
              </div>
            </div>
          )}
          
          {networkError && (
            <div className="status-card error">
              <div className="status-icon">🚫</div>
              <div className="status-content">
                <strong>Error de Red</strong>
                <small>{networkError} - Cambia a la red local de Hardhat (localhost:8545)</small>
              </div>
            </div>
          )}
          
          {connectionError && (
            <div className="status-card error">
              <div className="status-icon">⚠️</div>
              <div className="status-content">
                <strong>Error de Conexión</strong>
                <small>{connectionError}</small>
              </div>
              <button 
                className="retry-button"
                onClick={() => {
                  setConnectionError('');
                  setNetworkError('');
                }}
              >
                Reintentar
              </button>
            </div>
          )}
        </div>
      )}

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
                filteredProposals.map((proposal) => (                  <div key={proposal.id} className="proposal">
                    <div className="proposal-header">
                      <h3 className="proposal-title">{proposal.title || 'Propuesta sin título'}</h3>
                      <div className="proposal-badges">
                        <span className={`proposal-type-badge ${proposal.proposalType === 1 ? 'treasury-type' : 'standard-type'}`}>
                          {proposal.proposalType === 1 ? '💰 TESORERÍA' : '📋 ESTÁNDAR'}
                        </span>
                        <span className={`proposal-status status-${proposal.state === 0 ? 'active' : proposal.state === 1 ? 'accepted' : 'rejected'}`}>
                          {getProposalStateText(proposal.state)}
                        </span>
                      </div>
                    </div>
                    
                    <div className="proposal-meta">
                      <span>Tipo: {getProposalTypeText(proposal.proposalType)} (Código: {proposal.proposalType})</span>
                      <span>Propuesto por: {proposal.proposer ? `${proposal.proposer.slice(0, 6)}...${proposal.proposer.slice(-4)}` : 'N/A'}</span>
                      <span>Termina: {proposal.endTime ? new Date(Number(proposal.endTime) * 1000).toLocaleString() : 'Fecha no disponible'}</span>
                    </div>
                    
                    <div className="proposal-description">
                      {proposal.description || 'Sin descripción'}
                    </div>

                    {proposal.proposalType === 1 && (
                      <div className="proposal-treasury">
                        <div className="treasury-header">
                          <strong>💰 Detalles de Transferencia de Tesorería</strong>
                        </div>
                        <div className="treasury-details">
                          <div className="treasury-row">
                            <span className="treasury-label">Dirección de destino:</span>
                            <span className="treasury-value">{proposal.treasuryTarget || 'No especificada'}</span>
                          </div>
                          <div className="treasury-row">
                            <span className="treasury-label">Cantidad a transferir:</span>
                            <span className="treasury-value">
                              {proposal.treasuryAmount ? ethers.formatEther(proposal.treasuryAmount) : '0'} ETH
                            </span>
                          </div>
                        </div>
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
                </button>              </form>
            </div>
          )}

          {activeTab === 'admin' && isOwner && (
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
