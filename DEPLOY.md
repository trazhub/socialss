# Deploying TrazLinks to a VPS with Cloudflare Tunnel

This app should run on a VPS, then be published through Cloudflare Tunnel at
`https://link.trazz.art`. It is not a Cloudflare Pages-only deployment because it
uses Express, SQLite, and the native `better-sqlite3` module.

The Express server serves both the built React app and the `/api` on one local
port. Keep it bound to `127.0.0.1:3001`; Cloudflare Tunnel forwards public HTTPS
traffic to that local address.

## 1. Prerequisites on the VPS

Use Ubuntu/Debian with Node 20+.

```bash
sudo apt update
sudo apt install -y curl git rsync build-essential python3

# If your distro does not already provide Node 20+, install Node 20 from NodeSource.
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

node -v
npm -v
```

## 2. Get the code

```bash
git clone <your-repo-url> trazlinks
cd trazlinks/builder-app
```

If you upload the zip instead of using Git, upload `trazlinks-vps-upload.zip`,
then extract it into a clean `builder-app` directory. Do not copy `node_modules`
or `db/` from Windows; `better-sqlite3` must install on the VPS.

## 3. Configure environment

```bash
cat > .env <<'EOF'
JWT_SECRET=<paste a long random secret>
PORT=3001
HOST=127.0.0.1
NODE_ENV=production
EOF
nano .env
```

Generate a secret:

```bash
node -e "console.log(require('crypto').randomBytes(48).toString('base64url'))"
```

R2 avatar storage can stay blank while testing. The app will still run and
avatar uploads will fall back to local disk storage in `uploads/`.

## 4. Install, build, and test locally

```bash
npm install
npm run build
npm start
```

You should see:

```text
[trazlinks] Server running on http://127.0.0.1:3001 (production)
```

From another SSH session:

```bash
curl http://127.0.0.1:3001/api/health
```

Stop the foreground server with `Ctrl+C` after the local check passes.

## 5. Keep the app running with systemd

Edit `deploy/systemd/trazlinks.service.example` if your deployment path is not
`/opt/trazlinks/builder-app`, then install it:

```bash
sudo useradd --system --home /opt/trazlinks --shell /usr/sbin/nologin trazlinks || true
sudo mkdir -p /opt/trazlinks
sudo rsync -a --delete ./ /opt/trazlinks/builder-app/
sudo chown -R trazlinks:trazlinks /opt/trazlinks
sudo cp /opt/trazlinks/builder-app/deploy/systemd/trazlinks.service.example /etc/systemd/system/trazlinks.service
sudo systemctl daemon-reload
sudo systemctl enable --now trazlinks
sudo systemctl status trazlinks
```

Check the origin again:

```bash
curl http://127.0.0.1:3001/api/health
```

## 6. Install cloudflared

These are Cloudflare's Debian/Ubuntu APT install steps:

```bash
sudo mkdir -p --mode=0755 /usr/share/keyrings
curl -fsSL https://pkg.cloudflare.com/cloudflare-main.gpg | sudo tee /usr/share/keyrings/cloudflare-main.gpg >/dev/null
echo "deb [signed-by=/usr/share/keyrings/cloudflare-main.gpg] https://pkg.cloudflare.com/cloudflared any main" | sudo tee /etc/apt/sources.list.d/cloudflared.list
sudo apt-get update
sudo apt-get install -y cloudflared
cloudflared --version
```

## 7. Create and route the Cloudflare Tunnel

Prerequisites in Cloudflare:

- `trazz.art` is added to your Cloudflare account.
- The domain's nameservers point to Cloudflare.

Create a locally managed tunnel:

```bash
cloudflared tunnel login
cloudflared tunnel create trazlinks
cloudflared tunnel route dns trazlinks link.trazz.art
cloudflared tunnel list
```

Copy the tunnel UUID from `cloudflared tunnel list`, then install the tunnel
config:

```bash
TUNNEL_ID=<paste-the-tunnel-uuid>

sudo mkdir -p /etc/cloudflared
sudo cp ~/.cloudflared/$TUNNEL_ID.json /etc/cloudflared/
sudo cp deploy/cloudflared/config.yml.example /etc/cloudflared/config.yml
sudo sed -i "s/<tunnel-id>/$TUNNEL_ID/g" /etc/cloudflared/config.yml
sudo chmod 600 /etc/cloudflared/$TUNNEL_ID.json
sudo cat /etc/cloudflared/config.yml
```

The config should route `link.trazz.art` to `http://127.0.0.1:3001`.

Test the tunnel in the foreground:

```bash
sudo cloudflared --config /etc/cloudflared/config.yml tunnel run trazlinks
```

In another terminal, check:

```bash
curl https://link.trazz.art/api/health
```

Stop the foreground tunnel with `Ctrl+C` after the HTTPS check passes.

## 8. Run cloudflared as a service

```bash
sudo cloudflared --config /etc/cloudflared/config.yml service install
sudo systemctl enable --now cloudflared
sudo systemctl status cloudflared
```

Useful checks:

```bash
systemctl status trazlinks
systemctl status cloudflared
journalctl -u trazlinks -n 100 --no-pager
journalctl -u cloudflared -n 100 --no-pager
cloudflared tunnel info trazlinks
curl https://link.trazz.art/api/health
```

## 9. Firewall

Do not expose port `3001` publicly. With Cloudflare Tunnel, only SSH needs
inbound access on the VPS firewall:

```bash
sudo ufw allow OpenSSH
sudo ufw enable
sudo ufw status
```

Cloudflare terminates HTTPS for `https://link.trazz.art` and forwards traffic
through the outbound tunnel to `http://127.0.0.1:3001`.

## 10. R2 avatar storage, optional

To enable avatar uploads:

1. Create an R2 bucket, for example `trazlinks-avatars`.
2. Create R2 API credentials with object read/write access to that bucket.
3. Add a public/custom domain for the bucket or use the public R2 URL.
4. Set `R2_ACCOUNT_ID`, `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`,
   `R2_BUCKET`, and `R2_PUBLIC_URL` in `.env`.
5. Restart the app:

```bash
sudo systemctl restart trazlinks
```

## Maintenance

After a code change:

```bash
git pull
npm install
npm run build
sudo systemctl restart trazlinks
```

The SQLite database lives at `db/app.db`. Back up that file, plus any WAL files
next to it, before replacing the server.
