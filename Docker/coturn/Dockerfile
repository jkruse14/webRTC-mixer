FROM ubuntu:bionic

RUN apt-get update
RUN apt-get install -y coturn

ENV TURN_PORT 3488
ENV TURN_LISTEN_ADDRESS 192.168.0.46
ENV TLS_LISTENING_PORT 5349
ENV TURN_PORT_START 10000
ENV TURN_PORT_END 20000
ENV TURN_SECRET mysecret
ENV TURN_SERVER_NAME coturn
ENV TURN_REALM north.gov

COPY start-coturn.sh /start-coturn.sh
COPY server.cert /server.cert
COPY server.key /server.key
RUN chmod +x start-coturn.sh

CMD ["sh", "./start-coturn.sh"]
