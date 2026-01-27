{
  description = "Shinoa flake";

  inputs = {
    nixpkgs.url = "github:nixos/nixpkgs?ref=nixos-unstable";

    snowfall-lib = {
      url = "github:snowfallorg/lib";
      inputs.nixpkgs.follows = "nixpkgs";
    };
  };

  outputs = inputs:
    inputs.snowfall-lib.mkFlake {
      inherit inputs;

      src = ./.;

      channels-config = {
        allowUnfree = true;
      };

      outputs-builder = channels: {
        formatter = channels.nixpkgs.nixfmt;
      };

      snowfall = {
        root = ./nix;

        namespace = "shinoa";

        meta = {
          name = "shinoa";
          title = "Shinoa";
        };
      };
    };
}
