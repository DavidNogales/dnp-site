{
  description = "Astro personal website with a Typst CV";

  inputs.nixpkgs.url = "github:NixOS/nixpkgs/nixos-unstable";

  outputs = { self, nixpkgs }:
    let
      systems = [ "x86_64-linux" "aarch64-linux" ];
      forAllSystems = nixpkgs.lib.genAttrs systems;
    in {
      devShells = forAllSystems (system:
        let pkgs = import nixpkgs { inherit system; };
        in {
          test = pkgs.mkShell {
            inputsFrom = [ self.devShells.${system}.default ];
            packages = [ pkgs.chromium ];
            shellHook = ''
              export PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH="${pkgs.chromium}/bin/chromium"
              export CHROME_PATH="${pkgs.chromium}/bin/chromium"
            '';
          };
          fonts = pkgs.mkShell {
            packages = [ (pkgs.python3.withPackages (ps: [ ps.fonttools ps.brotli ])) ];
          };
          default = pkgs.mkShell {
            packages = with pkgs; [ nodejs_22 pnpm typst gnumake font-awesome ];
            shellHook = ''
              export TYPST_FONT_PATHS="${pkgs.font-awesome}/share/fonts/opentype"
            '';
          };
        });
    };
}
