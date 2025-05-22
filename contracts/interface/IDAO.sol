// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IDAO {
    /// @dev Devuelve si la DAO está en modo pánico
    function panicActive() external view returns (bool);

    /// @notice Permite al owner activar o desactivar pánico
    /// @dev Solo owner puede llamar, revertir con "Not_owner" si no
    function setPanic(bool status) external;

    //Staking 

    /// @notice Hace staking para votar
    /// @dev Revertir si no tiene suficientes tokens, con "Insufficient_balance"
    function stakeTokensForVoting(uint256 amount) external;

    /// @notice Hace staking para propuestas
    function stakeTokensForProposal(uint256 amount) external;

    /// @notice Quita staking para votar
    function withdrawStakeForVoting(uint256 amount) external;

    /// @notice Quita staking para propuestas
    function withdrawStakeForProposal(uint256 amount) external;

    /// @dev Devuelve la cantidad de tokens en staking para votar/propuestas
    function getVotingStake(address user) external view returns (uint256);
    function getProposalStake(address user) external view returns (uint256);

    //Propuestas
    
    /// @notice Crea una propuesta
    /// @dev Debe tener suficiente staking, revertir con "Insufficient_stake"
    function createProposal(string calldata title, string calldata description) external returns (uint256 proposalId);

    /// @notice Vota por una propuesta
    /// @dev Debe tener suficiente staking, revertir con "Insufficient_stake"
    function vote(uint256 proposalId, bool support) external;

    /// @dev Devuelve datos de la propuesta
    function getProposal(uint256 proposalId) external view returns (
        string memory title,
        string memory description,
        address proposer,
        uint256 votesFor,
        uint256 votesAgainst,
        uint256 endTime,
        bool executed
    );

    /// @dev Devuelve estado de la propuesta (ej: 0=ACTIVA, 1=RECHAZADA, 2=ACEPTADA)
    function getProposalState(uint256 proposalId) external view returns (uint8);

    /// @dev Devuelve todas las propuestas
    function getAllProposals() external view returns (uint256[] memory);
}
