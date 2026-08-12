# POS .NET wrapper (Windows x86)

`pna.pcpos.dll` is a .NET assembly. Rust loads a thin **C ABI** wrapper DLL here:

- `pos_init(host, port) -> int`
- `pos_pay(amount_rial, order_number, out_txn_id, out_len) -> int`
- `pos_cancel() -> int`

Build as **x86** to match the vendor DLL. Copy output next to `kiosk.exe` or into `src-tauri/resources/`.

Until this ships, set `KIOSK_POS_MOCK=1` for development.
