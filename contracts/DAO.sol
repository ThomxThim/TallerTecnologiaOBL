// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

import "./interfaces/IDAO.sol";
import "./interfaces/IDAOERC20.sol";
import "./interfaces/IMultiSigOwner.sol";
import "./interfaces/IPanicMultiSig.sol";
import "./interfaces/ITreasuryProposal.sol";

contract DAO is IDAO {
    // --- Referencias externas ---
    IDAOERC20 public immutable token;
    IMultiSigOwner public ownerMultiSig;
    IPanicMultiSig public panicMultiSig;
    ITreasuryProposal public treasuryProposal;

    // --- Parámetros de la DAO ---
    uint256 public tokenPriceEth = 1e15;
    uint256 public minStakeForVoting = 1000 * 1e18;
    uint256 public minStakeForProposal = 500 * 1e18;
    uint256 public minStakingTime = 1 days;
    uint256 public proposalDuration = 3 days;
    uint256 public votingPowerPerTokens = 1000 * 1e18; // 1000 tokens = 1 voto

    // --- Estado de staking por usuario ---
    struct Stake {
        uint256 amount;
        uint256 unlockTimestamp;
    }
    mapping(address => Stake) public votingStakes;
    mapping(address => Stake) public proposalStakes;

    // --- Propuestas ---
    enum ProposalState { ACTIVA, RECHAZADA, ACEPTADA }
    struct Proposal {
        string title;
        string description;
        address proposer;
        uint256 votesFor;
        uint256 votesAgainst;
        uint256 startTime;
        uint256 endTime;
        bool executed;
        ProposalState state;
        mapping(address => bool) hasVoted;
    }
    Proposal[] public proposals;

    bool public panicActive = false;

    // --- Eventos ---
    event PanicActivated(address indexed by);
    event TranquilityRestored(address indexed by);
    event TokensStaked(address indexed user, uint256 amount, bool forVoting);
    event TokensUnstaked(address indexed user, uint256 amount, bool forVoting);
    event ProposalCreated(uint256 indexed id, address indexed proposer, string title);
    event Voted(uint256 indexed id, address indexed voter, bool support, uint256 power);

    // --- Modificadores ---
    modifier notPanic() {
        require(!panicActive, "DAO: Panic mode active");
        _;
    }
    modifier onlyOwnerMultiSig() {
        require(ownerMultiSig.isOwner(msg.sender), "DAO: Not an owner multisig");
        _;
    }
    modifier onlyPanicMultiSig() {
        require(panicMultiSig.isPanicOwner(msg.sender), "DAO: Not a panic multisig owner");
        _;
    }

    // --- Constructor ---
    constructor(
        address _token,
        address _ownerMultiSig,
        address _panicMultiSig,
        address _treasuryProposal
    ) {
        token = IDAOERC20(_token);
        ownerMultiSig = IMultiSigOwner(_ownerMultiSig);
        panicMultiSig = IPanicMultiSig(_panicMultiSig);
        treasuryProposal = ITreasuryProposal(_treasuryProposal);
    }

    // --------- Métodos de la interfaz IDAO ---------

    function panicActive() external view override returns (bool) {
        return panicActive;
    }

    function setPanic(bool status) external override onlyOwnerMultiSig {
        panicActive = status;
        if (status) {
            emit PanicActivated(msg.sender);
        } else {
            emit TranquilityRestored(msg.sender);
        }
    }

    function stakeTokensForVoting(uint256 amount) external override notPanic {
        require(token.balanceOf(msg.sender) >= amount, "DAO: Insufficient tokens");
        require(amount >= minStakeForVoting, "DAO: Below min stake for voting");
        require(token.transferFrom(msg.sender, address(this), amount), "DAO: Transfer failed");
        votingStakes[msg.sender].amount += amount;
        votingStakes[msg.sender].unlockTimestamp = block.timestamp + minStakingTime;
        emit TokensStaked(msg.sender, amount, true);
    }

    function stakeTokensForProposal(uint256 amount) external override notPanic {
        require(token.balanceOf(msg.sender) >= amount, "DAO: Insufficient tokens");
        require(amount >= minStakeForProposal, "DAO: Below min stake for proposal");
        require(token.transferFrom(msg.sender, address(this), amount), "DAO: Transfer failed");
        proposalStakes[msg.sender].amount += amount;
        proposalStakes[msg.sender].unlockTimestamp = block.timestamp + minStakingTime;
        emit TokensStaked(msg.sender, amount, false);
    }

    function withdrawStakeForVoting(uint256 amount) external override notPanic {
        Stake storage stake = votingStakes[msg.sender];
        require(block.timestamp >= stake.unlockTimestamp, "DAO: Staking locked");
        require(stake.amount >= amount, "DAO: Not enough staked");
        stake.amount -= amount;
        require(token.transfer(msg.sender, amount), "DAO: Transfer failed");
        emit TokensUnstaked(msg.sender, amount, true);
    }

    function withdrawStakeForProposal(uint256 amount) external override notPanic {
        Stake storage stake = proposalStakes[msg.sender];
        require(block.timestamp >= stake.unlockTimestamp, "DAO: Staking locked");
        require(stake.amount >= amount, "DAO: Not enough staked");
        stake.amount -= amount;
        require(token.transfer(msg.sender, amount), "DAO: Transfer failed");
        emit TokensUnstaked(msg.sender, amount, false);
    }

    function getVotingStake(address user) external view override returns (uint256) {
        return votingStakes[user].amount;
    }

    function getProposalStake(address user) external view override returns (uint256) {
        return proposalStakes[user].amount;
    }

    function createProposal(string calldata title, string calldata description) external override notPanic returns (uint256) {
        require(proposalStakes[msg.sender].amount >= minStakeForProposal, "DAO: Insufficient proposal stake");
        Proposal storage newProp = proposals.push();
        newProp.title = title;
        newProp.description = description;
        newProp.proposer = msg.sender;
        newProp.startTime = block.timestamp;
        newProp.endTime = block.timestamp + proposalDuration;
        newProp.state = ProposalState.ACTIVA;
        emit ProposalCreated(proposals.length - 1, msg.sender, title);
        return proposals.length - 1;
    }

    function vote(uint256 proposalId, bool support) external override notPanic {
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp < prop.endTime, "DAO: Voting ended");
        require(prop.state == ProposalState.ACTIVA, "DAO: Proposal not active");
        require(!prop.hasVoted[msg.sender], "DAO: Already voted");
        uint256 userPower = votingStakes[msg.sender].amount / votingPowerPerTokens;
        require(userPower > 0, "DAO: No voting power");
        prop.hasVoted[msg.sender] = true;
        if (support) {
            prop.votesFor += userPower;
        } else {
            prop.votesAgainst += userPower;
        }
        emit Voted(proposalId, msg.sender, support, userPower);
    }

    function getProposal(uint256 proposalId) external view override returns (
        string memory title,
        string memory description,
        address proposer,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 endTime,
        bool executed
    ) {
        Proposal storage p = proposals[proposalId];
        return (
            p.title,
            p.description,
            p.proposer,
            p.votesFor,
            p.votesAgainst,
            p.endTime,
            p.executed
        );
    }

    function getProposalState(uint256 proposalId) external view override returns (uint8) {
        return uint8(proposals[proposalId].state);
    }

    function getAllProposals() external view override returns (uint256[] memory) {
        uint256[] memory ids = new uint256[](proposals.length);
        for (uint i = 0; i < proposals.length; i++) {
            ids[i] = i;
        }
        return ids;
    }

    // --------- Métodos extra (no interfaz) ---------

    // Comprar tokens
    function buyTokens() external payable notPanic {
        require(msg.value > 0, "DAO: Send ETH to buy tokens");
        uint256 amount = (msg.value * 1e18) / tokenPriceEth;
        token.mint(msg.sender, amount);
        // Forward ETH a la tesorería, si lo deseas
    }

    // Finalizar una propuesta
    function finalizeProposal(uint256 proposalId) external notPanic {
        Proposal storage prop = proposals[proposalId];
        require(block.timestamp >= prop.endTime, "DAO: Not finished");
        require(!prop.executed, "DAO: Already executed");
        require(prop.state == ProposalState.ACTIVA, "DAO: Not active");
        prop.executed = true;
        if (prop.votesFor > prop.votesAgainst) {
            prop.state = ProposalState.ACEPTADA;
        } else {
            prop.state = ProposalState.RECHAZADA;
        }
    }

    // Propuestas de Tesorería (Conjunto C)
    function createTreasuryProposal(
        address payable to,
        uint256 amount,
        string calldata title,
        string calldata description
    ) external notPanic returns (uint256) {
        require(proposalStakes[msg.sender].amount >= minStakeForProposal, "DAO: Insufficient proposal stake");
        uint256 proposalId = treasuryProposal.createTreasuryProposal(to, amount, title, description);
        return proposalId;
    }

    function executeTreasuryProposal(uint256 proposalId) external notPanic {
        treasuryProposal.executeTreasuryProposal(proposalId);
    }
}
