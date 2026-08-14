' Put this file NEXT TO kiosk.exe. Add a shortcut to THIS script in
' Windows Startup — not the two EXEs. Backend runs hidden; kiosk comes to front.
Option Explicit

Dim fso, sh, dir, backend, kiosk
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

backend = dir & "\kiosk-backend-x86_64-pc-windows-msvc.exe"
If Not fso.FileExists(backend) Then
  backend = dir & "\kiosk-backend.exe"
End If
kiosk = dir & "\kiosk.exe"

If fso.FileExists(backend) Then
  sh.Run """" & backend & """", 0, False
End If

WScript.Sleep 12000

If fso.FileExists(kiosk) Then
  sh.Run """" & kiosk & """", 1, False
End If
