// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface ITreasuryProposal {
    /// @notice Crea una propuesta de tesorería
    /// @dev Requiere suficiente staking. Solo DAO puede llamar.
    function createTreasuryProposal(
        address payable to, 
        uint256 amount, 
        string calldata title, 
        string calldata description
    ) external returns (uint256 proposalId);

    /// @notice Ejecuta la transferencia de ETH si la propuesta fue aceptada
    /// @dev Solo DAO puede llamar. Revertir si ya fue ejecutada.
    function executeTreasuryProposal(uint256 proposalId) external;

    /// @dev Devuelve los datos de la propuesta de tesorería
    function getTreasuryProposal(uint256 proposalId) external view returns (
        address to,
        uint256 amount,
        string memory title,
        string memory description,
        bool executed
    );
}
