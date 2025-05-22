// SPDX-License-Identifier: MIT
pragma solidity 0.8.24;

interface IDAOERC20 {
    /// @dev Devuelve el total de tokens existentes.
    function totalSupply() external view returns (uint256);

    /// @dev Devuelve el saldo de tokens de una cuenta.
    function balanceOf(address account) external view returns (uint256);

    /// @dev Devuelve la cantidad de tokens que el owner permitió gastar al spender.
    function allowance(address owner, address spender) external view returns (uint256);

    /// @notice Permite transferir tokens a otra dirección.
    /// @dev Revertir si el saldo es insuficiente.
    function transfer(address to, uint256 amount) external returns (bool);

    /// @notice Permite aprobar a un spender para gastar tokens del msg.sender.
    function approve(address spender, uint256 amount) external returns (bool);

    /// @notice Permite transferir tokens en nombre de otro usuario (debe haber aprobado).
    /// @dev Revertir si no hay suficiente allowance.
    function transferFrom(address from, address to, uint256 amount) external returns (bool);

    /// @notice Permite que solo el owner mintee nuevos tokens.
    /// @dev Solo puede ser llamado por el owner, de lo contrario revertir con "Not_owner"
    function mint(address to, uint256 amount) external;

    // Añadir eventos según el estándar ERC20 si se desea
}
