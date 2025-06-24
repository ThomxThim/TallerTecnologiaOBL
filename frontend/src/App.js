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
  "function transferOwnership(address newOwner) external",
  "function panic() external",
  "function tranquility() external",
  "function panicMultisig() external view returns (address)",
  "function isPanicMode() external view returns (bool)",
  "event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, uint8 proposalType)",
  "event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower)",
  "event ProposalExecuted(uint256 indexed proposalId, uint8 result)"
];

const DAO_CONTRACT_ADDRESS = "0x73798Ab895795825d2c92ce792aeD01Ff8eeAC21"; // Sepolia Testnet

// Funciones de conversión entre ETH y Tokens
const getTokenPrice = async (contractInstance) => {
  try {
    if (!contractInstance) return null;
    const tokenPriceBytes32 = ethers.keccak256(ethers.toUtf8Bytes('TOKEN_PRICE'));
    const tokenPriceWei = await contractInstance.getParameter(tokenPriceBytes32);
    return ethers.formatEther(tokenPriceWei); // Convierte de WEI a ETH
  } catch (error) {
    console.error('Error obteniendo precio del token:', error);
    return 0.001; // Valor por defecto
  }
};

const convertEthToTokens = (ethAmount, tokenPrice) => {
  if (!ethAmount || !tokenPrice || tokenPrice <= 0) return 0;
  return parseFloat(ethAmount) / parseFloat(tokenPrice);
};

const convertTokensToEth = (tokenAmount, tokenPrice) => {
  if (!tokenAmount || !tokenPrice || tokenPrice <= 0) return 0;
  return parseFloat(tokenAmount) * parseFloat(tokenPrice);
};

const formatDualValue = (ethValue, tokenValue, isEthPrimary = true) => {
  if (isEthPrimary) {
    return `${parseFloat(ethValue).toFixed(4)} ETH (≈ ${parseFloat(tokenValue).toFixed(2)} tokens)`;
  } else {
    return `${parseFloat(tokenValue).toFixed(2)} tokens (≈ ${parseFloat(ethValue).toFixed(4)} ETH)`;
  }
};

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
  const [ethBalance, setEthBalance] = useState('0'); // Balance de ETH de la cuenta
  const [staking, setStaking] = useState({ votingStake: '0', proposalStake: '0', votingUnlockTime: 0, proposalUnlockTime: 0 });
  const [votingPower, setVotingPower] = useState('0');
  const [treasuryBalance, setTreasuryBalance] = useState('0');
  const [proposals, setProposals] = useState([]);
  const [tokenPrice, setTokenPrice] = useState('0.001'); // Precio del token en ETH
  const [proposalFilter, setProposalFilter] = useState('all');
  const [buyAmount, setBuyAmount] = useState('');
  const [stakeAmount, setStakeAmount] = useState('');
  const [stakeType, setStakeType] = useState(true);
  const [proposalTitle, setProposalTitle] = useState('');
  const [proposalDescription, setProposalDescription] = useState('');
  const [proposalType, setProposalType] = useState('standard');
  const [treasuryTarget, setTreasuryTarget] = useState('');
  const [treasuryAmount, setTreasuryAmount] = useState('');
  const [panicMultisigAddress, setPanicMultisigAddress] = useState('');  const [mintToAddress, setMintToAddress] = useState('');
  const [mintAmount, setMintAmount] = useState('');  const [parameterName, setParameterName] = useState('');
  const [parameterValue, setParameterValue] = useState('');
  const [isOwner, setIsOwner] = useState(false);
  const [selectedParameter, setSelectedParameter] = useState('');
  const [currentParameters, setCurrentParameters] = useState({});  // Estados para nuevas funciones admin
  const [newOwnerAddress, setNewOwnerAddress] = useState('');
  const [isPanicMultisig, setIsPanicMultisig] = useState(false);
  const [panicModeActive, setPanicModeActive] = useState(false);// Definición de parámetros de la DAO con sus nombres legibles
  const daoParameters = {
    'TOKEN_PRICE': {
      name: 'Precio del Token',
      description: 'Cuánto ETH cuesta comprar 1 token (ingresa en ETH, ej: 0.001)',
      currentValue: '',
      unit: 'ETH',
      example: '0.001 (se convertirá automáticamente a WEI)'
    },
    'MIN_VOTING_STAKE': {
      name: 'Tokens Mínimos para Votar',
      description: 'Cantidad mínima de tokens que hay que stakear para poder votar (ingresa en tokens, ej: 1000)',
      currentValue: '',
      unit: 'Tokens',
      example: '1000 (se convertirá automáticamente a unidades del contrato)'
    },
    'MIN_PROPOSAL_STAKE': {
      name: 'Tokens Mínimos para Propuestas',
      description: 'Cantidad mínima de tokens que hay que stakear para crear propuestas (ingresa en tokens, ej: 2000)',
      currentValue: '',
      unit: 'Tokens',
      example: '2000 (se convertirá automáticamente a unidades del contrato)'
    },
    'STAKING_LOCK_TIME': {
      name: 'Tiempo de Bloqueo de Staking',
      description: 'Tiempo en segundos que los tokens quedan bloqueados después del staking',
      currentValue: '',
      unit: 'Segundos',
      example: '300 (5 minutos)'
    },
    'VOTING_DURATION': {
      name: 'Duración de Propuestas',
      description: 'Tiempo en segundos que dura una propuesta activa',
      currentValue: '',
      unit: 'Segundos',
      example: '604800 (7 días)'
    },
    'TOKENS_PER_VOTE': {
      name: 'Tokens por Poder de Voto',
      description: 'Cuántos tokens stakeados equivalen a 1 punto de poder de voto (ingresa en tokens, ej: 1000)',
      currentValue: '',
      unit: 'Tokens',
      example: '1000 (se convertirá automáticamente a unidades del contrato)'
    }
  };

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
        return provider;      } else if (walletType === 'rabby') {
        const provider = window.ethereum.providers.find(p => p.isRabby);
        console.log('Rabby provider encontrado:', !!provider);
        if (!provider) {
          console.log('Rabby providers disponibles:', window.ethereum.providers.map(p => ({
            isRabby: p.isRabby,
            isMetaMask: p.isMetaMask,
            chainId: p.chainId
          })));
        }
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
      console.log(`Iniciando conexión con ${walletType}`);      // Verificar disponibilidad del provider
      const ethereum = getProvider(walletType);
      if (!ethereum) {
        let errorMsg;
        if (walletType === 'rabby') {
          errorMsg = 'Rabby Wallet no detectado. Asegúrate de que:\n1. Rabby esté instalado\n2. Estés en la red "Hardhat Local" (Chain ID: 1337)\n3. Tengas la red configurada en Rabby';
        } else {
          errorMsg = `${walletType} no está disponible. ¿Está instalado?`;
        }
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
        return;      }

      // Verificar que el contrato esté desplegado
      try {
        console.log('Verificando contrato en dirección:', DAO_CONTRACT_ADDRESS);
        
        // Verificar la red actual
        const network = await provider.getNetwork();
        console.log('Red actual:', network);        console.log('Chain ID:', network.chainId);
        
        // Verificar si estamos en la red correcta (1337 = Hardhat local)
        // Convertir a número para manejar BigInt
        const chainIdNumber = Number(network.chainId);
        if (chainIdNumber !== 1337) {
          console.warn('Red incorrecta. Esperado: 1337, Actual:', chainIdNumber);
          toast.error('Por favor cambia a la red local de Hardhat (Chain ID: 1337)');
          return;
        }
        
        const code = await provider.getCode(DAO_CONTRACT_ADDRESS);
        console.log('Código del contrato (primeros 100 chars):', code.substring(0, 100));
        console.log('Longitud del código:', code.length);
        
        if (code === '0x') {
          throw new Error('El contrato no está desplegado en esta dirección');
        }
        console.log('Contrato verificado exitosamente');
      } catch (verifyError) {
        console.error('Error verificando contrato:', verifyError);
        toast.error(`Error: ${verifyError.message}. ¿Está desplegado el contrato en la red local?`);
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
      setConnectionError('');      // Resetear datos de la aplicación
      setBalance('0');
      setEthBalance('0');
      setStaking({ votingStake: '0', proposalStake: '0', votingUnlockTime: 0, proposalUnlockTime: 0 });
      setVotingPower('0');      setTreasuryBalance('0');
      setTokenPrice('0.001');
      setProposals([]);
      setIsOwner(false);
      setIsPanicMultisig(false);
      setPanicModeActive(false);
      
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
        // Cargar precio del token
      let currentTokenPrice;
      try {
        currentTokenPrice = await getTokenPrice(contractInstance);
        console.log('Token price:', currentTokenPrice);
      } catch (error) {
        console.error('Error obteniendo precio del token:', error);
        currentTokenPrice = '0.001'; // Valor por defecto
      }
      
      // Cargar balance de ETH del usuario
      let userEthBalance;
      try {
        userEthBalance = await contractInstance.runner.provider.getBalance(userAccount);
        console.log('User ETH balance (raw):', userEthBalance.toString());
        console.log('User ETH balance (formatted):', ethers.formatEther(userEthBalance));
      } catch (error) {
        console.error('Error obteniendo balance de ETH:', error);
        userEthBalance = '0';
      }      // Actualizar estados con los datos obtenidos
      setBalance(ethers.formatEther(userBalance));
      setEthBalance(ethers.formatEther(userEthBalance));
      setStaking({
        votingStake: ethers.formatEther(userStaking.votingStake),
        proposalStake: ethers.formatEther(userStaking.proposalStake),
        votingUnlockTime: Number(userStaking.votingUnlockTime),
        proposalUnlockTime: Number(userStaking.proposalUnlockTime)
      });
      setVotingPower(userVotingPower.toString());
      setTreasuryBalance(ethers.formatEther(treasury));
      setTokenPrice(currentTokenPrice);
        // Verificar si el usuario es owner
      try {
        await checkOwnership();
          // Verificar directamente panic multisig aquí
        const panicMultisigAddress = await contractInstance.panicMultisig();
        const isPanic = userAccount.toLowerCase() === panicMultisigAddress.toLowerCase();
        setIsPanicMultisig(isPanic);
        console.log('=== PANIC MULTISIG CHECK ===');
        console.log('User account:', userAccount);
        console.log('Panic multisig address:', panicMultisigAddress);
        console.log('User is panic multisig:', isPanic);
        
        // Verificar directamente panic mode aquí
        const panicMode = await contractInstance.isPanicMode();
        setPanicModeActive(panicMode);
        console.log('=== PANIC MODE CHECK ===');
        console.log('Panic mode from contract:', panicMode);
        console.log('Setting panicModeActive to:', panicMode);
        
      } catch (error) {
        console.error('Error verificando ownership/panic:', error);
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
    if (!contract || !account) {
      console.log('checkOwnership: No hay contrato o cuenta', { contract: !!contract, account });
      return;
    }
    
    try {
      console.log('checkOwnership: Verificando ownership...');
      const owner = await contract.owner();
      console.log('checkOwnership: Owner del contrato:', owner);
      console.log('checkOwnership: Cuenta actual:', account);
      
      const isCurrentUserOwner = owner.toLowerCase() === account.toLowerCase();
      console.log('checkOwnership: ¿Es owner?', isCurrentUserOwner);      setIsOwner(isCurrentUserOwner);
      
      if (isCurrentUserOwner) {
        console.log('✅ Usuario confirmado como owner del contrato');
      } else {
        console.log('❌ Usuario NO es owner del contrato');
      }
    } catch (error) {
      console.error('Error verificando ownership:', error);
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
  // Función mejorada para cambiar parámetros usando el selector
  const handleSetParameter = async (e) => {
    e.preventDefault();
    if (!contract || !selectedParameter || !parameterValue) {
      toast.error('Selecciona un parámetro e ingresa un valor');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Cambiando parámetro:', selectedParameter, 'a valor:', parameterValue);
        // Convertir el nombre del parámetro a bytes32
      const paramBytes32 = ethers.keccak256(ethers.toUtf8Bytes(selectedParameter));
      
      // Validar que el valor sea numérico
      if (isNaN(parameterValue) || parameterValue <= 0) {
        throw new Error('El valor debe ser un número positivo');
      }
      
      // Convertir el valor según el tipo de parámetro
      let convertedValue;
      
      if (selectedParameter === 'TOKEN_PRICE') {
        // Para TOKEN_PRICE, convertir de ETH a WEI
        convertedValue = ethers.parseEther(parameterValue.toString());
        console.log(`Convirtiendo ${parameterValue} ETH a ${convertedValue} WEI`);      } else if (selectedParameter === 'MIN_VOTING_STAKE' || 
                 selectedParameter === 'MIN_PROPOSAL_STAKE' || 
                 selectedParameter === 'TOKENS_PER_VOTE') {
        // Para parámetros de tokens, convertir a unidades de 18 decimales
        convertedValue = ethers.parseEther(parameterValue.toString());
        console.log(`Convirtiendo ${parameterValue} tokens a ${convertedValue} unidades (18 decimales)`);      } else {
        // Para otros parámetros (tiempos, etc.), usar el valor directo como entero
        convertedValue = ethers.getBigInt(Math.floor(Number(parameterValue)));
        console.log(`Usando valor directo: ${convertedValue}`);
      }
      
      const tx = await contract.setParameter(paramBytes32, convertedValue);
      await tx.wait();
      
      const paramInfo = daoParameters[selectedParameter];
      toast.success(`Parámetro "${paramInfo.name}" cambiado exitosamente!`);
      
      // Limpiar formulario
      setSelectedParameter('');
      setParameterValue('');
      
      // Recargar parámetros para mostrar el nuevo valor
      await loadCurrentParameters();
      
    } catch (error) {
      console.error('Error configurando parámetro:', error);
      let errorMessage = 'Error al configurar parámetro';
      
      if (error.message.includes('valor debe ser un número')) {
        errorMessage = error.message;
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.reason) {
        errorMessage = `Error del contrato: ${error.reason}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };
  const handlePanic = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      console.log('Activando modo pánico...');
      const tx = await contract.panic();
      await tx.wait();
      
      // Forzar actualización del estado después de la transacción
      const newPanicMode = await contract.isPanicMode();
      setPanicModeActive(newPanicMode);
      console.log('Pánico activado, nuevo estado:', newPanicMode);
      
      toast.success('Modo pánico activado!');
    } catch (error) {
      console.error('Error al activar pánico:', error);
      toast.error('Error al activar pánico');
    } finally {
      setLoading(false);
    }
  };

  const handleTranquility = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      console.log('Activando tranquilidad...');
      const tx = await contract.tranquility();
      await tx.wait();
      
      // Forzar actualización del estado después de la transacción
      const newPanicMode = await contract.isPanicMode();
      setPanicModeActive(newPanicMode);
      console.log('Tranquilidad activada, nuevo estado:', newPanicMode);
      
      toast.success('Modo tranquilidad activado!');
    } catch (error) {
      console.error('Error al activar tranquilidad:', error);
      toast.error('Error al activar tranquilidad');
    } finally {
      setLoading(false);
    }
  };

  // Nueva función para transferir ownership
  const handleTransferOwnership = async (e) => {
    e.preventDefault();
    if (!contract || !newOwnerAddress) {
      toast.error('Ingresa una dirección válida');
      return;
    }
    
    try {
      setLoading(true);
      console.log('Transfiriendo ownership a:', newOwnerAddress);
      
      // Validar que sea una dirección válida
      if (!ethers.isAddress(newOwnerAddress)) {
        throw new Error('Dirección inválida');
      }
      
      const tx = await contract.transferOwnership(newOwnerAddress);
      await tx.wait();
      
      toast.success('Ownership transferido exitosamente!');
      setNewOwnerAddress('');
      
      // Recargar datos para actualizar isOwner
      await loadDashboardData(contract, account);
      
    } catch (error) {
      console.error('Error transfiriendo ownership:', error);
      let errorMessage = 'Error al transferir ownership';
      
      if (error.message.includes('Dirección inválida')) {
        errorMessage = 'Dirección inválida';
      } else if (error.message.includes('user rejected')) {
        errorMessage = 'Transacción rechazada por el usuario';
      } else if (error.reason) {
        errorMessage = `Error del contrato: ${error.reason}`;
      }
      
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  // Función para verificar si el usuario es la panic multisig
  const checkPanicMultisig = async () => {
    if (!contract || !account) return;
    
    try {
      const panicMultisigAddress = await contract.panicMultisig();
      const isPanic = account.toLowerCase() === panicMultisigAddress.toLowerCase();
      setIsPanicMultisig(isPanic);
      console.log('Is panic multisig:', isPanic);
    } catch (error) {
      console.error('Error verificando panic multisig:', error);
      setIsPanicMultisig(false);
    }
  };

  // Función para verificar estado de pánico
  const checkPanicMode = async () => {
    if (!contract) return;
    
    try {
      const panicMode = await contract.isPanicMode();
      setPanicModeActive(panicMode);
      console.log('Panic mode active:', panicMode);
    } catch (error) {
      console.error('Error verificando panic mode:', error);
      setPanicModeActive(false);
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

  // Función para debug del estado de ownership
  const debugOwnership = () => {
    console.log('=== DEBUG OWNERSHIP ===');
    console.log('Account:', account);
    console.log('Contract:', contract?.target);
    console.log('IsOwner:', isOwner);
    console.log('Expected Owner Address:', '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266');
    console.log('Current Account Match:', account?.toLowerCase() === '0xf39Fd6e51aad88F6F4ce6aB8827279cffFb92266'.toLowerCase());
    
    if (contract) {
      contract.owner().then(owner => {
        console.log('Contract Owner from blockchain:', owner);
        console.log('Addresses match:', owner.toLowerCase() === account?.toLowerCase());
      }).catch(err => {
        console.error('Error getting owner from contract:', err);
      });
    }
    console.log('=== END DEBUG ===');
  };

  // Effect para verificar ownership cuando cambie la cuenta o contrato
  useEffect(() => {
    if (contract && account) {
      console.log('Account o Contract cambió, verificando ownership...');
      checkOwnership();
    }
  }, [contract, account]);

  // Función para cargar los valores actuales de los parámetros
  const loadCurrentParameters = async () => {
    if (!contract) return;
    
    try {
      setLoading(true);
      const updatedParameters = { ...currentParameters };
      
      for (const [key, param] of Object.entries(daoParameters)) {
        try {
          // Convertir el nombre del parámetro a bytes32
          const paramBytes32 = ethers.keccak256(ethers.toUtf8Bytes(key));
          const value = await contract.getParameter(paramBytes32);
            // Formatear el valor según el tipo de parámetro
          let formattedValue = value.toString();
          if (key === 'TOKEN_PRICE') {
            const ethValue = ethers.formatEther(value);
            formattedValue = `${ethValue} ETH`;
          } else if (key === 'MIN_VOTING_STAKE' || key === 'MIN_PROPOSAL_STAKE' || key === 'TOKENS_PER_VOTE') {
            const tokenValue = ethers.formatEther(value);
            formattedValue = `${tokenValue} tokens`;
          } else if (key.includes('TIME') || key.includes('DURATION')) {
            const seconds = Number(value);
            const minutes = Math.floor(seconds / 60);
            const hours = Math.floor(minutes / 60);
            const days = Math.floor(hours / 24);
            formattedValue = `${seconds}s`;
            if (days > 0) formattedValue += ` (${days} días)`;
            else if (hours > 0) formattedValue += ` (${hours} horas)`;
            else if (minutes > 0) formattedValue += ` (${minutes} minutos)`;
          }
          
          updatedParameters[key] = {
            ...param,
            currentValue: formattedValue,
            rawValue: value.toString()
          };
        } catch (error) {
          console.error(`Error cargando parámetro ${key}:`, error);
          updatedParameters[key] = {
            ...param,
            currentValue: 'Error al cargar',
            rawValue: '0'
          };
        }
      }
      
      setCurrentParameters(updatedParameters);
    } catch (error) {
      console.error('Error cargando parámetros:', error);
      toast.error('Error cargando parámetros de la DAO');
    } finally {
      setLoading(false);
    }
  };

  // Effect para cargar parámetros cuando se conecte el contrato
  useEffect(() => {
    if (contract && isOwner) {
      loadCurrentParameters();
    }
  }, [contract, isOwner]);

  // Effect para actualizar estados cuando cambia la cuenta o contrato
  useEffect(() => {
    const updateStates = async () => {
      if (contract && account) {
        console.log('=== USEEFFECT: ACTUALIZANDO ESTADOS ===');
        try {
          // Verificar panic mode
          const panicMode = await contract.isPanicMode();
          console.log('UseEffect - Panic mode:', panicMode);
          setPanicModeActive(panicMode);
          
          // Verificar panic multisig
          const panicMultisigAddress = await contract.panicMultisig();
          const isPanic = account.toLowerCase() === panicMultisigAddress.toLowerCase();
          console.log('UseEffect - Is panic multisig:', isPanic);
          setIsPanicMultisig(isPanic);
          
        } catch (error) {
          console.error('Error en useEffect actualizando estados:', error);
        }
      }
    };
    
    updateStates();
  }, [contract, account]); // Se ejecuta cuando cambia contract o account

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
              </div>              <div className="wallet-text">
                <strong>
                  {connectedWalletType === 'metamask' && 'MetaMask'}
                  {connectedWalletType === 'rabby' && 'Rabby Wallet'}
                  {connectedWalletType === 'generic' && 'Wallet Conectada'}
                </strong>
                <span className="wallet-address">{account ? `${account.slice(0, 6)}...${account.slice(-4)}` : 'N/A'}</span>
                <div className="wallet-balances">
                  <span className="balance-item">💰 {parseFloat(ethBalance).toFixed(4)} ETH</span>
                  <span className="balance-item">🪙 {parseFloat(balance).toFixed(2)} tokens</span>
                </div>
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
              </button>            )}
          </div>

          {/* Botones de debug temporales */}
          {account && (
            <div className="debug-section" style={{background: '#f3f4f6', padding: '10px', margin: '10px 0', borderRadius: '5px'}}>
              <strong>🔧 Debug Tools:</strong>
              <button onClick={debugOwnership} style={{margin: '5px', padding: '5px 10px', background: '#3b82f6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                Debug Ownership
              </button>
              <button onClick={debugProposals} style={{margin: '5px', padding: '5px 10px', background: '#10b981', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                Debug Propuestas
              </button>              <button onClick={() => checkOwnership()} style={{margin: '5px', padding: '5px 10px', background: '#f59e0b', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                Re-check Owner
              </button>              <button onClick={async () => {
                console.log('=== PANIC MULTISIG DEBUG ===');
                console.log('Account:', account);
                if (contract) {
                  try {
                    const panicAddr = await contract.panicMultisig();
                    const panicMode = await contract.isPanicMode();
                    console.log('Panic Multisig Address:', panicAddr);
                    console.log('Current Account:', account);
                    console.log('Is Same?', account.toLowerCase() === panicAddr.toLowerCase());
                    console.log('Panic Mode from contract:', panicMode);
                    console.log('isPanicMultisig state:', isPanicMultisig);
                    console.log('panicModeActive state:', panicModeActive);
                    
                    // Forzar actualización
                    setIsPanicMultisig(account.toLowerCase() === panicAddr.toLowerCase());
                    setPanicModeActive(panicMode);
                    
                    console.log('=== ESTADOS ACTUALIZADOS ===');
                  } catch (error) {
                    console.error('Error en debug:', error);
                  }
                }
              }} style={{margin: '5px', padding: '5px 10px', background: '#8b5cf6', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                Debug Panic
              </button>              <button onClick={async () => {
                console.log('=== VERIFICACIÓN EMERGENCIA PANIC MODE ===');
                if (contract) {
                  try {
                    const realPanicMode = await contract.isPanicMode();
                    console.log('Estado REAL del contrato - isPanicMode:', realPanicMode);
                    console.log('Estado actual del frontend:', panicModeActive);
                    
                    // Forzar la actualización
                    setPanicModeActive(realPanicMode);
                    console.log('Estado forzado a:', realPanicMode);
                    
                    toast.info(`Estado real: ${realPanicMode ? 'PÁNICO ACTIVO' : 'NORMAL'}`);
                  } catch (error) {
                    console.error('Error verificando estado real:', error);
                  }
                }
              }} style={{margin: '5px', padding: '5px 10px', background: '#dc2626', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer'}}>
                🚨 Verificar Estado Real
              </button>
              <span style={{margin: '0 10px', fontSize: '0.9rem'}}>
                IsOwner: <strong style={{color: isOwner ? 'green' : 'red'}}>{isOwner ? 'SÍ' : 'NO'}</strong>
                | PanicMultisig: <strong style={{color: isPanicMultisig ? 'green' : 'red'}}>{isPanicMultisig ? 'SÍ' : 'NO'}</strong>
                | PanicMode: <strong style={{color: panicModeActive ? 'red' : 'green'}}>{panicModeActive ? 'ACTIVO' : 'INACTIVO'}</strong>
              </span>
            </div>
          )}

          {loading && <div className="loading">Cargando...</div>}          {/* Panel de Pánico para Panic Multisig (visible fuera del admin) */}
          {isPanicMultisig && (
            <div className="panic-control-panel">
              <div className={`card ${panicModeActive ? 'panic-card' : 'panic-ready-card'}`}>
                {panicModeActive ? (
                  <>
                    <h2>🚨 MODO PÁNICO ACTIVO</h2>
                    <p>Eres la multisig de pánico. La DAO está suspendida. Puedes restaurar la operación normal.</p>
                    <button 
                      className="btn btn-success btn-large" 
                      onClick={handleTranquility}
                      disabled={loading}
                    >
                      😌 Restaurar Tranquilidad
                    </button>
                  </>
                ) : (
                  <>
                    <h3>🛡️ PANIC MULTISIG</h3>
                    <p>Eres la multisig de pánico. La DAO está operando normalmente.</p>
                    <div className="status-indicator panic-inactive">
                      ✅ Sistema Normal
                    </div>
                    <small style={{display: 'block', marginTop: '10px', opacity: 0.8}}>
                      Podrás restaurar la tranquilidad si el owner activa el modo pánico.
                    </small>
                  </>
                )}
              </div>
            </div>
          )}{activeTab === 'dashboard' && (
            <div className="card">
              <h2>📊 Dashboard</h2>              <div className="stats-grid">
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(ethBalance).toFixed(4)} ETH</div>
                  <div className="stat-conversion">≈ {convertEthToTokens(ethBalance, tokenPrice).toFixed(2)} tokens</div>
                  <div className="stat-label">Balance de ETH</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(balance).toFixed(2)} tokens</div>
                  <div className="stat-conversion">≈ {convertTokensToEth(balance, tokenPrice).toFixed(4)} ETH</div>
                  <div className="stat-label">Tokens Disponibles</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(staking.votingStake).toFixed(2)} tokens</div>
                  <div className="stat-conversion">≈ {convertTokensToEth(staking.votingStake, tokenPrice).toFixed(4)} ETH</div>
                  <div className="stat-label">Tokens Stakeados (Voto)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(staking.proposalStake).toFixed(2)} tokens</div>
                  <div className="stat-conversion">≈ {convertTokensToEth(staking.proposalStake, tokenPrice).toFixed(4)} ETH</div>
                  <div className="stat-label">Tokens Stakeados (Propuestas)</div>
                </div>
                <div className="stat-card">
                  <div className="stat-value">{votingPower} votos</div>
                  <div className="stat-conversion">Precio actual: {parseFloat(tokenPrice).toFixed(4)} ETH/token</div>
                  <div className="stat-label">Poder de Voto</div>
                </div>
              </div>
                <div className="stake-section">
                <h3>💰 Información de Staking</h3>
                <div className="stake-info">
                  <div className="stake-item">
                    <h4>Staking para Voto</h4>
                    <p>
                      {parseFloat(staking.votingStake).toFixed(2)} tokens
                      <span className="conversion-text"> (≈ {convertTokensToEth(staking.votingStake, tokenPrice).toFixed(4)} ETH)</span>
                    </p>
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
                    <p>
                      {parseFloat(staking.proposalStake).toFixed(2)} tokens
                      <span className="conversion-text"> (≈ {convertTokensToEth(staking.proposalStake, tokenPrice).toFixed(4)} ETH)</span>
                    </p>
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
              </div>              <div className="card">
                <h3>🏦 Tesorería de la DAO</h3>
                <div className="stat-card">
                  <div className="stat-value">{parseFloat(treasuryBalance).toFixed(4)} ETH</div>
                  <div className="stat-conversion">≈ {convertEthToTokens(treasuryBalance, tokenPrice).toFixed(2)} tokens al precio actual</div>
                  <div className="stat-label">Balance de Tesorería</div>
                </div>
              </div>              <div className="account-info">
                <h3>👤 Información de Cuenta</h3>
                <p><strong>Cuenta Conectada:</strong> <code>{account}</code></p>
                <p><strong>Balance ETH:</strong> {parseFloat(ethBalance).toFixed(4)} ETH</p>
                <p><strong>Balance Tokens:</strong> {parseFloat(balance).toFixed(2)} tokens</p>
                <p><strong>Red:</strong> Hardhat Local (Chain ID: 1337)</p>
                <p><strong>Contrato:</strong> <code>{DAO_CONTRACT_ADDRESS}</code></p>
              </div>
            </div>
          )}          {activeTab === 'buy' && (
            <div className="card">
              <h2>💰 Comprar Tokens</h2>
              <div className="conversion-info">
                <p><strong>Precio actual:</strong> {parseFloat(tokenPrice).toFixed(4)} ETH por token</p>
                {buyAmount && (
                  <p><strong>Recibirás:</strong> ≈ {convertEthToTokens(buyAmount, tokenPrice).toFixed(2)} tokens por {buyAmount} ETH</p>
                )}
              </div>
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
              <div className="conversion-info">
                <p><strong>Balance disponible:</strong> {parseFloat(balance).toFixed(2)} tokens (≈ {convertTokensToEth(balance, tokenPrice).toFixed(4)} ETH)</p>
                {stakeAmount && (
                  <p><strong>Valor a stakear:</strong> {stakeAmount} tokens (≈ {convertTokensToEth(stakeAmount, tokenPrice).toFixed(4)} ETH)</p>
                )}
              </div>
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
          )}{activeTab === 'proposals' && (
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
                    </div>                    {proposal.proposalType === 1 && (
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
                              <span className="conversion-text">
                                {proposal.treasuryAmount && ` (≈ ${convertEthToTokens(ethers.formatEther(proposal.treasuryAmount), tokenPrice).toFixed(2)} tokens)`}
                              </span>
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
                </div>                {proposalType === 'treasury' && (
                  <>
                    <div className="conversion-info">
                      <p><strong>Balance actual de tesorería:</strong> {parseFloat(treasuryBalance).toFixed(4)} ETH</p>
                      {treasuryAmount && (
                        <p><strong>Solicitando:</strong> {treasuryAmount} ETH (≈ {convertEthToTokens(treasuryAmount, tokenPrice).toFixed(2)} tokens al precio actual)</p>
                      )}
                    </div>
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
              </div>              <div className="admin-section">
                <h3>⚙️ Parámetros de la DAO</h3>
                
                {/* Mostrar parámetros actuales */}
                <div className="parameters-display">
                  <h4>📊 Valores Actuales:</h4>
                  <button 
                    onClick={loadCurrentParameters} 
                    className="btn btn-secondary"
                    disabled={loading}
                    style={{marginBottom: '15px'}}
                  >
                    🔄 Recargar Parámetros
                  </button>
                  
                  <div className="parameters-grid">
                    {Object.entries(currentParameters).map(([key, param]) => (
                      <div key={key} className="parameter-card">
                        <div className="parameter-name">{param.name}</div>
                        <div className="parameter-value">{param.currentValue || 'Cargando...'}</div>
                        <div className="parameter-description">{param.description}</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Formulario para cambiar parámetros */}
                <div className="parameter-change-form">
                  <h4>✏️ Cambiar Parámetro:</h4>
                  <form onSubmit={handleSetParameter}>
                    <div className="form-group">
                      <label>Seleccionar Parámetro:</label>
                      <select
                        value={selectedParameter}
                        onChange={(e) => setSelectedParameter(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          marginBottom: '10px',
                          borderRadius: '5px',
                          border: '1px solid #ddd'
                        }}
                      >
                        <option value="">-- Selecciona un parámetro --</option>
                        {Object.entries(daoParameters).map(([key, param]) => (
                          <option key={key} value={key}>
                            {param.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {selectedParameter && (
                      <div className="parameter-info">
                        <div className="info-card">
                          <strong>📝 {daoParameters[selectedParameter].name}</strong>
                          <p>{daoParameters[selectedParameter].description}</p>
                          <p><strong>Unidad:</strong> {daoParameters[selectedParameter].unit}</p>
                          <p><strong>Ejemplo:</strong> {daoParameters[selectedParameter].example}</p>
                          {currentParameters[selectedParameter] && (
                            <p><strong>Valor actual:</strong> {currentParameters[selectedParameter].currentValue}</p>
                          )}
                        </div>
                      </div>
                    )}

                    <div className="form-group">
                      <label>Nuevo Valor:</label>
                      <input
                        type="text"
                        placeholder="Ingresa el nuevo valor (en la unidad base)"
                        value={parameterValue}
                        onChange={(e) => setParameterValue(e.target.value)}
                        required
                        style={{
                          width: '100%',
                          padding: '10px',
                          marginBottom: '10px',
                          borderRadius: '5px',
                          border: '1px solid #ddd'
                        }}
                      />
                    </div>

                    <button 
                      type="submit" 
                      className="btn btn-primary" 
                      disabled={loading || !selectedParameter}
                    >
                      {loading ? 'Cambiando...' : 'Cambiar Parámetro'}
                    </button>
                  </form>
                </div>
              </div>              <div className="admin-section">
                <h3>🚨 Control de Pánico</h3>
                <div className="panic-status">
                  <span className={`status-indicator ${panicModeActive ? 'panic-active' : 'panic-inactive'}`}>
                    Estado: {panicModeActive ? '🚨 PÁNICO ACTIVO' : '✅ Normal'}
                  </span>
                </div>
                <div style={{display: 'flex', gap: '10px'}}>
                  {isOwner && (
                    <button 
                      className="btn btn-danger" 
                      onClick={handlePanic}
                      disabled={loading || panicModeActive}
                    >
                      🚨 Activar Pánico
                    </button>
                  )}
                  {isPanicMultisig && (
                    <button 
                      className="btn btn-success" 
                      onClick={handleTranquility}
                      disabled={loading || !panicModeActive}
                    >
                      😌 Restaurar Tranquilidad
                    </button>
                  )}
                </div>
                <small style={{color: 'rgba(255,255,255,0.6)', marginTop: '10px', display: 'block'}}>
                  Pánico: Solo owner puede activar. Tranquilidad: Solo panic multisig puede activar.
                </small>
              </div>

              <div className="admin-section">
                <h3>👑 Transferir Ownership</h3>
                <form onSubmit={handleTransferOwnership}>
                  <div className="form-group">
                    <label>Nueva dirección owner:</label>
                    <input
                      type="text"
                      className="form-control"
                      value={newOwnerAddress}
                      onChange={(e) => setNewOwnerAddress(e.target.value)}
                      placeholder="0x..."
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-warning" disabled={loading}>
                    {loading ? 'Transfiriendo...' : 'Transferir Ownership'}
                  </button>
                  <small style={{color: 'rgba(255,255,255,0.6)', marginTop: '10px', display: 'block'}}>
                    ⚠️ Esta acción es irreversible. El nuevo owner tendrá control total del contrato.
                  </small>
                </form>
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
}

export default App;
