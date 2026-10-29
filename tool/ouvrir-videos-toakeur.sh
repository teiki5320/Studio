#!/bin/bash
# Ouvre videos.toakeur.com : la seule porte publique du Studio, qui ne laisse
# passer que les vidéos confiées à Buffer (/v/<jeton de 32 caractères>.mp4).
# Tout le reste du Studio reste derrière Cloudflare Access.
set -e
CONF="$HOME/.cloudflared/config.yml"
if grep -q "videos.toakeur.com" "$CONF"; then
  echo "Déjà en place."
else
  cp "$CONF" "$CONF.avant-videos"
  python3 - "$CONF" <<'EOF'
import sys
p = sys.argv[1]
s = open(p).read()
a = "  - service: http_status:404"
s = s.replace(a, """  # videos.toakeur.com : uniquement les vidéos confiées à Buffer, sans Access.
  - hostname: videos.toakeur.com
    path: ^/v/[a-f0-9]{32}\\.mp4$
    service: http://127.0.0.1:4600
""" + a)
open(p, "w").write(s)
EOF
fi
cloudflared tunnel ingress validate --config "$CONF"
cloudflared tunnel route dns drama-studio videos.toakeur.com || true
launchctl kickstart -k "gui/$(id -u)/com.teiki.drama-studio-tunnel"
echo "✅ videos.toakeur.com est ouvert."
