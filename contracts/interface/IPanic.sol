// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IPanicMultiSig {
    /// @dev Devuelve el owner de pánico en la posición dada
    function panicOwners(uint index) external view returns (address);

    /// @dev Devuelve si la dirección es owner de pánico
    function isPanicOwner(address owner) external view returns (bool);

    /// @dev Devuelve el mínimo de confirmaciones requeridas
    function required() external view returns (uint);

    /// @notice Envía una nueva transacción de pánico (por ejemplo, activar tranquilidad)
    /// @dev Solo un panic owner puede llamar, de lo contrario revertir con "Not_a_panic_owner"
    function submitPanicTransaction(bytes calldata data) external returns (uint txIndex);

    /// @notice Confirma una transacción de pánico pendiente
    /// @dev Solo un panic owner puede llamar, de lo contrario revertir con "Not_a_panic_owner"
    function confirmPanicTransaction(uint txIndex) external;

    /// @notice Ejecuta una transacción de pánico si tiene suficientes confirmaciones
    /// @dev Solo un panic owner puede llamar, de lo contrario revertir con "Not_a_panic_owner"
    /// @dev Revertir si no hay suficientes confirmaciones, con "Insufficient_confirmations"
    function executePanicTransaction(uint txIndex) external;

    /// @dev Devuelve la cantidad de transacciones de pánico
    function getPanicTransactionCount() external view returns (uint);

    /// @dev Devuelve los datos de una transacción de pánico específica
    function getPanicTransaction(uint txIndex) external view returns (
        bytes memory data,
        bool executed,
        uint confirmations
    );
}
