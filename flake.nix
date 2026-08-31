{
  inputs = {
    nixpkgs.url = "github:NixOS/nixpkgs/nixpkgs-unstable";
    flake-parts.url = "github:hercules-ci/flake-parts";
    nix-capsule.url = "gitlab:codnixus/nix-capsule?ref=v0.8.0";
  };

  outputs =
    inputs:
    (import ./template.nix) {
      inherit inputs;

      devShell = {
        socketPath = "/tmp/octadash/ncap-socket";
        containerName = "octadash";
        image = "ubuntu:latest";
        extraOptions = [
          "-e"
          "PNPM_HOME"
          "-v"
          "$PNPM_HOME:$PNPM_HOME"
          "-p"
          "4200:4200"
        ];
        wrappers = [
          "npm"
          "pnpm"
        ];
        preShellHook = ''
          export PNPM_HOME=''${PNPM_HOME:-$HOME/.local/share/pnpm}
          mkdir -p "$PNPM_HOME"
        '';
      };

      container =
        pkgs:
        pkgs.mkShellNoCC {
          packages = with pkgs; [
            nodejs-slim
            pnpm
            cacert

            skills
            git
          ];
        };
    };
}
