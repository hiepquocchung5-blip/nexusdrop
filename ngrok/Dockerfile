FROM ngrok/ngrok:latest

USER root
COPY avast-web-mail-shield-root.pem /usr/local/share/ca-certificates/avast-web-mail-shield-root.crt
RUN apt-get update \
    && apt-get install -y --no-install-recommends ca-certificates \
    && update-ca-certificates \
    && cat /etc/ssl/certs/ca-certificates.crt /usr/local/share/ca-certificates/avast-web-mail-shield-root.crt > /etc/ssl/certs/ngrok-ca-bundle.crt \
    && rm -rf /var/lib/apt/lists/*

USER ngrok
