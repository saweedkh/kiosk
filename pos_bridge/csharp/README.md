# Optional C# PosBridge (same HTTP contract as pos_bridge/).
# Prefer the Python service under ../pos_bridge/ unless you must stay in .NET Framework.
#
# Build on Windows with Visual Studio / MSBuild (.NET Framework 4.8):
#   - Add reference to pna.pcpos.dll
#   - HttpListener on :9000 with /health and /pay
#   - Same flow: PCPOS { ConnectionType=LAN, Ip, Port, Amount },
#     TestConnection(), GetResponse +=, send_transaction(), wait.
#
# Full steps and Python reference implementation: ../../docs/POS_BRIDGE.md
