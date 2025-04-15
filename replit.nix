{pkgs}: {
  deps = [
    pkgs.gcc
    pkgs.giflib
    pkgs.pango
    pkgs.libjpeg
    pkgs.cairo
    pkgs.pkg-config
    pkgs.libuuid
    pkgs.jq
    pkgs.postgresql
  ];
}
