{
    pkgs,
    ...
}:

pkgs.mkShellNoCC {
  packages = with pkgs; [
    nodejs_20
    corepack_20

    kubectl
    act

    node2nix
    nil
    nixd
    nixfmt
  ];
}
