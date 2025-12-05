# Systemd Service Files for IBKR Services

## Installation

Copy the service files to `/etc/systemd/system/` and enable them:

```bash
sudo cp scripts/infra/systemd/ibkr-gateway.service /etc/systemd/system/
sudo cp scripts/infra/systemd/ibkr-bridge.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable ibkr-gateway.service ibkr-bridge.service
sudo systemctl start ibkr-gateway.service ibkr-bridge.service
```

## Status Checks

Check the status of each service:

```bash
sudo systemctl status ibkr-gateway.service
sudo systemctl status ibkr-bridge.service
```

View logs:

```bash
sudo journalctl -u ibkr-gateway.service -f
sudo journalctl -u ibkr-bridge.service -f
```

## Important Notes

- **IBKR Gateway** must have a valid login session via browser / phone once in a while to maintain authentication
- Both services are configured to restart automatically on failure
- Services start after network is online

