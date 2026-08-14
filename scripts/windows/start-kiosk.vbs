' Put next to kiosk.exe. Prefers onedir kiosk-backend\kiosk-backend.exe.
' Starts API + Bale poll + POS worker as SEPARATE processes.
Option Explicit

Dim fso, sh, dir, backend, kiosk
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

backend = dir & "\kiosk-backend\kiosk-backend.exe"
If Not fso.FileExists(backend) Then
  backend = dir & "\kiosk-backend-x86_64-pc-windows-msvc.exe"
End If
If Not fso.FileExists(backend) Then
  backend = dir & "\kiosk-backend.exe"
End If
kiosk = dir & "\kiosk.exe"

If fso.FileExists(backend) Then
  sh.Run """" & backend & """", 0, False
  sh.Run """" & backend & """ bale_poll", 0, False
  sh.Run """" & backend & """ pos_worker", 0, False
End If

WScript.Sleep 3000

If fso.FileExists(kiosk) Then
  sh.Run """" & kiosk & """", 1, False
End If
