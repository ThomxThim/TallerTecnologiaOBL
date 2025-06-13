// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

interface IDAO {
    // Enums
    enum ProposalState { Active, Accepted, Rejected }
    enum ProposalType { Standard, Treasury }
    
    // Structs
    struct Proposal {
        uint256 id;
        string title;
        string description;
        address proposer;
        uint256 forVotes;
        uint256 againstVotes;
        uint256 startTime;
        uint256 endTime;
        ProposalState state;
        ProposalType proposalType;
        address treasuryTarget; // For treasury proposals
        uint256 treasuryAmount; // For treasury proposals
        bool executed;
    }
    
    struct UserStaking {
        uint256 votingStake;
        uint256 proposalStake;
        uint256 votingUnlockTime;
        uint256 proposalUnlockTime;
    }
    
    // Events
    event ProposalCreated(uint256 indexed proposalId, address indexed proposer, string title, ProposalType proposalType);
    event VoteCast(uint256 indexed proposalId, address indexed voter, bool support, uint256 votingPower);
    event ProposalExecuted(uint256 indexed proposalId, ProposalState result);
    event TokensStaked(address indexed user, uint256 amount, bool forVoting);
    event TokensUnstaked(address indexed user, uint256 amount, bool forVoting);
    event TokensPurchased(address indexed buyer, uint256 amount, uint256 ethSpent);
    event PanicActivated();
    event TranquilityRestored();
    event TreasuryTransfer(address indexed to, uint256 amount);
    
    // Owner functions
    function mintTokens(address to, uint256 amount) external;
    function setParameter(bytes32 param, uint256 value) external;
    function setPanicMultisig(address _panicMultisig) external;
    function transferOwnership(address newOwner) external;
    function panic() external;
    
    // Panic multisig functions
    function tranquility() external;
    
    // User functions
    function buyTokens() external payable;
    function stakeTokens(uint256 amount, bool forVoting) external;
    function unstakeTokens(uint256 amount, bool forVoting) external;
    function createProposal(string memory title, string memory description) external returns (uint256);
    function createTreasuryProposal(string memory title, string memory description, address target, uint256 amount) external returns (uint256);
    function vote(uint256 proposalId, bool support) external;
    function executeProposal(uint256 proposalId) external;
    
    // View functions
    function getTokenBalance(address user) external view returns (uint256);
    function getUserStaking(address user) external view returns (UserStaking memory);
    function getProposal(uint256 proposalId) external view returns (Proposal memory);
    function getProposalCount() external view returns (uint256);
    function getVotingPower(address user) external view returns (uint256);
    function hasVoted(uint256 proposalId, address user) external view returns (bool);
    function getParameter(bytes32 param) external view returns (uint256);
}
