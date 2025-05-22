// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IMultiSigOwner {
    /// @dev Devuelve el owner en la posición dada
    function owners(uint index) external view returns (address);

    /// @dev Devuelve si la dirección es owner
    function isOwner(address owner) external view returns (bool);

    /// @dev Devuelve cuántas confirmaciones requiere una transacción
    function required() external view returns (uint);

    /// @notice Permite enviar una nueva transacción para ser aprobada
    /// @dev Solo un owner puede llamar, de lo contrario revertir con "Not_an_owner"
    /// @param destination Dirección destino
    /// @param value ETH a enviar
    /// @param data Calldata de la transacción
    function submitTransaction(address destination, uint value, bytes calldata data) external returns (uint txIndex);

    /// @notice Permite confirmar una transacción pendiente
    /// @dev Solo un owner puede llamar, de lo contrario revertir con "Not_an_owner"
    /// @dev Revertir si ya confirmó la transacción, con "Already_confirmed"
    function confirmTransaction(uint txIndex) external;

    /// @notice Permite ejecutar la transacción si tiene suficientes confirmaciones
    /// @dev Solo un owner puede llamar, de lo contrario revertir con "Not_an_owner"
    /// @dev Revertir si no hay suficientes confirmaciones, con "Insufficient_confirmations"
    function executeTransaction(uint txIndex) external;

    /// @dev Devuelve la cantidad de transacciones enviadas
    function getTransactionCount() external view returns (uint);

    /// @dev Devuelve los datos de una transacción específica
    function getTransaction(uint txIndex) external view returns (
        address destination,
        uint value,
        bytes memory data,
        bool executed,
        uint confirmations
    );
}
