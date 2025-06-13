// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/access/Ownable.sol";
import "@openzeppelin/contracts/utils/ReentrancyGuard.sol";
import "./interface/IDAO.sol";

contract DAO is ERC20, Ownable, ReentrancyGuard, IDAO {
    // State variables
    mapping(address => UserStaking) public userStaking;
    mapping(uint256 => Proposal) public proposals;
    mapping(uint256 => mapping(address => bool)) public hasVotedOnProposal;
    mapping(uint256 => mapping(address => bool)) public userVotes; // true = for, false = against
    mapping(bytes32 => uint256) public parameters;
    
    uint256 public proposalCount;
    address public panicMultisig;
    bool public isPanicMode;
    
    // Parameter keys
    bytes32 public constant MIN_VOTING_STAKE = keccak256("MIN_VOTING_STAKE");
    bytes32 public constant MIN_PROPOSAL_STAKE = keccak256("MIN_PROPOSAL_STAKE");
    bytes32 public constant TOKEN_PRICE = keccak256("TOKEN_PRICE");
    bytes32 public constant VOTING_DURATION = keccak256("VOTING_DURATION");
    bytes32 public constant STAKING_LOCK_TIME = keccak256("STAKING_LOCK_TIME");
    bytes32 public constant TOKENS_PER_VOTE = keccak256("TOKENS_PER_VOTE");
    
    modifier notInPanic() {
        require(!isPanicMode, "DAO is in panic mode");
        _;
    }
    
    modifier onlyPanicMultisig() {
        require(msg.sender == panicMultisig, "Only panic multisig");
        _;
    }
    
    modifier panicMultisigConfigured() {
        require(panicMultisig != address(0), "Panic multisig not configured");
        _;
    }
    
    constructor(
        string memory name,
        string memory symbol,
        address initialOwner
    ) ERC20(name, symbol) Ownable(initialOwner) {
        // Set default parameters
        parameters[MIN_VOTING_STAKE] = 1000 * 10**decimals(); // 1000 tokens
        parameters[MIN_PROPOSAL_STAKE] = 5000 * 10**decimals(); // 5000 tokens
        parameters[TOKEN_PRICE] = 0.001 ether; // 0.001 ETH per token
        parameters[VOTING_DURATION] = 7 days;
        parameters[STAKING_LOCK_TIME] = 1 days;
        parameters[TOKENS_PER_VOTE] = 1000 * 10**decimals(); // 1000 tokens = 1 vote
    }
    
    // Owner functions
    function mintTokens(address to, uint256 amount) external override onlyOwner {
        _mint(to, amount);
    }
    
    function setParameter(bytes32 param, uint256 value) external override onlyOwner {
        require(value > 0, "Parameter value must be positive");
        parameters[param] = value;
    }
    
    function setPanicMultisig(address _panicMultisig) external override onlyOwner {
        require(_panicMultisig != address(0), "Invalid address");
        panicMultisig = _panicMultisig;
    }
    
    function transferOwnership(address newOwner) public override(Ownable, IDAO) onlyOwner {
        require(newOwner != address(0), "Invalid address");
        super.transferOwnership(newOwner);
    }
    
    function panic() external override onlyOwner panicMultisigConfigured {
        isPanicMode = true;
        emit PanicActivated();
    }
    
    // Panic multisig functions
    function tranquility() external override onlyPanicMultisig {
        isPanicMode = false;
        emit TranquilityRestored();
    }
    
    // User functions
    function buyTokens() external payable override notInPanic panicMultisigConfigured {
        require(msg.value > 0, "Must send ETH");
        uint256 tokenPrice = parameters[TOKEN_PRICE];
        require(tokenPrice > 0, "Token price not set");
        
        uint256 tokenAmount = (msg.value * 10**decimals()) / tokenPrice;
        require(tokenAmount > 0, "Insufficient ETH for tokens");
        
        _mint(msg.sender, tokenAmount);
        emit TokensPurchased(msg.sender, tokenAmount, msg.value);
    }
    
    function stakeTokens(uint256 amount, bool forVoting) external override notInPanic panicMultisigConfigured {
        require(amount > 0, "Amount must be positive");
        require(balanceOf(msg.sender) >= amount, "Insufficient balance");
        
        UserStaking storage staking = userStaking[msg.sender];
        
        if (forVoting) {
            require(amount >= parameters[MIN_VOTING_STAKE], "Below minimum voting stake");
            staking.votingStake += amount;
            staking.votingUnlockTime = block.timestamp + parameters[STAKING_LOCK_TIME];
        } else {
            require(amount >= parameters[MIN_PROPOSAL_STAKE], "Below minimum proposal stake");
            staking.proposalStake += amount;
            staking.proposalUnlockTime = block.timestamp + parameters[STAKING_LOCK_TIME];
        }
        
        _transfer(msg.sender, address(this), amount);
        emit TokensStaked(msg.sender, amount, forVoting);
    }
    
    function unstakeTokens(uint256 amount, bool forVoting) external override notInPanic {
        require(amount > 0, "Amount must be positive");
        
        UserStaking storage staking = userStaking[msg.sender];
        
        if (forVoting) {
            require(staking.votingStake >= amount, "Insufficient voting stake");
            require(block.timestamp >= staking.votingUnlockTime, "Voting stake still locked");
            staking.votingStake -= amount;
        } else {
            require(staking.proposalStake >= amount, "Insufficient proposal stake");
            require(block.timestamp >= staking.proposalUnlockTime, "Proposal stake still locked");
            staking.proposalStake -= amount;
        }
        
        _transfer(address(this), msg.sender, amount);
        emit TokensUnstaked(msg.sender, amount, forVoting);
    }
    
    function createProposal(string memory title, string memory description) external override notInPanic panicMultisigConfigured returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(userStaking[msg.sender].proposalStake >= parameters[MIN_PROPOSAL_STAKE], "Insufficient proposal stake");
        
        uint256 proposalId = proposalCount++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            proposer: msg.sender,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + parameters[VOTING_DURATION],
            state: ProposalState.Active,
            proposalType: ProposalType.Standard,
            treasuryTarget: address(0),
            treasuryAmount: 0,
            executed: false
        });
        
        emit ProposalCreated(proposalId, msg.sender, title, ProposalType.Standard);
        return proposalId;
    }
    
    function createTreasuryProposal(
        string memory title, 
        string memory description, 
        address target, 
        uint256 amount
    ) external override notInPanic panicMultisigConfigured returns (uint256) {
        require(bytes(title).length > 0, "Title cannot be empty");
        require(bytes(description).length > 0, "Description cannot be empty");
        require(target != address(0), "Invalid target address");
        require(amount > 0, "Amount must be positive");
        require(amount <= address(this).balance, "Insufficient treasury balance");
        require(userStaking[msg.sender].proposalStake >= parameters[MIN_PROPOSAL_STAKE], "Insufficient proposal stake");
        
        uint256 proposalId = proposalCount++;
        
        proposals[proposalId] = Proposal({
            id: proposalId,
            title: title,
            description: description,
            proposer: msg.sender,
            forVotes: 0,
            againstVotes: 0,
            startTime: block.timestamp,
            endTime: block.timestamp + parameters[VOTING_DURATION],
            state: ProposalState.Active,
            proposalType: ProposalType.Treasury,
            treasuryTarget: target,
            treasuryAmount: amount,
            executed: false
        });
        
        emit ProposalCreated(proposalId, msg.sender, title, ProposalType.Treasury);
        return proposalId;
    }
    
    function vote(uint256 proposalId, bool support) external override notInPanic panicMultisigConfigured {
        require(proposalId < proposalCount, "Proposal does not exist");
        require(!hasVotedOnProposal[proposalId][msg.sender], "Already voted");
        require(userStaking[msg.sender].votingStake >= parameters[MIN_VOTING_STAKE], "Insufficient voting stake");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp <= proposal.endTime, "Voting period ended");
        
        uint256 votingPower = getVotingPower(msg.sender);
        require(votingPower > 0, "No voting power");
        
        hasVotedOnProposal[proposalId][msg.sender] = true;
        userVotes[proposalId][msg.sender] = support;
        
        if (support) {
            proposal.forVotes += votingPower;
        } else {
            proposal.againstVotes += votingPower;
        }
        
        emit VoteCast(proposalId, msg.sender, support, votingPower);
    }
    
    function executeProposal(uint256 proposalId) external override notInPanic {
        require(proposalId < proposalCount, "Proposal does not exist");
        
        Proposal storage proposal = proposals[proposalId];
        require(proposal.state == ProposalState.Active, "Proposal not active");
        require(block.timestamp > proposal.endTime, "Voting period not ended");
        require(!proposal.executed, "Proposal already executed");
        
        // Determine result
        if (proposal.forVotes > proposal.againstVotes) {
            proposal.state = ProposalState.Accepted;
            
            // Execute treasury proposal if accepted
            if (proposal.proposalType == ProposalType.Treasury) {
                require(proposal.treasuryAmount <= address(this).balance, "Insufficient treasury balance");
                
                (bool success, ) = proposal.treasuryTarget.call{value: proposal.treasuryAmount}("");
                require(success, "Treasury transfer failed");
                
                emit TreasuryTransfer(proposal.treasuryTarget, proposal.treasuryAmount);
            }
        } else {
            proposal.state = ProposalState.Rejected;
        }
        
        proposal.executed = true;
        emit ProposalExecuted(proposalId, proposal.state);
    }
    
    // View functions
    function getTokenBalance(address user) external view override returns (uint256) {
        return balanceOf(user);
    }
    
    function getUserStaking(address user) external view override returns (UserStaking memory) {
        return userStaking[user];
    }
    
    function getProposal(uint256 proposalId) external view override returns (Proposal memory) {
        require(proposalId < proposalCount, "Proposal does not exist");
        return proposals[proposalId];
    }
    
    function getProposalCount() external view override returns (uint256) {
        return proposalCount;
    }
    
    function getVotingPower(address user) public view override returns (uint256) {
        uint256 stakedTokens = userStaking[user].votingStake;
        uint256 tokensPerVote = parameters[TOKENS_PER_VOTE];
        
        if (tokensPerVote == 0) return 0;
        return stakedTokens / tokensPerVote;
    }
    
    function hasVoted(uint256 proposalId, address user) external view override returns (bool) {
        return hasVotedOnProposal[proposalId][user];
    }
    
    function getParameter(bytes32 param) external view override returns (uint256) {
        return parameters[param];
    }
    
    // Function to receive ETH for treasury
    receive() external payable {
        // ETH sent to contract goes to treasury
    }
    
    // Function to check treasury balance
    function getTreasuryBalance() external view returns (uint256) {
        return address(this).balance;
    }
}
