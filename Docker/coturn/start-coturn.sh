#!/bin/bash

echo "Starting TURN/STUN server"
turnserver -a -v -L "127.0.0.1" -r "${TURN_REALM}" -p ${TURN_PORT} /
--relay-ip="${TURN_LISTEN_ADDRESS}" /
--server-name "${TURN_SERVER_NAME}" /
--static-auth-secret="${TURN_SECRET}"
--tls-listening-port ${TLS_LISTENING_PORT} /
--min-port ${TURN_PORT_START} /
--max-port ${TURN_PORT_END} /
--static-auth-secret="${TURN_SECRET}" /
--cert="server.cert" /
--pkey="server.key" /
--cli-password="FloRun1404"
