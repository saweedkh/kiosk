' Put next to kiosk.exe. Prefers onedir kiosk-backend\kiosk-backend.exe.
' Start API, wait a few seconds so Django can boot, then kiosk.exe.
' If a previous backend is still running, kill it first so the port is free.
' Bale starts ~60s later via cmd (not a sleeping wscript — those get killed).
' Watch progress: kiosk-start.log next to this script.
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

LogLine "===== start-kiosk.vbs ====="
LogLine "dir=" & dir
LogLine "backend=" & backend & " exists=" & CStr(fso.FileExists(backend))
LogLine "kiosk=" & kiosk & " exists=" & CStr(fso.FileExists(kiosk))

' Does not touch kiosk-backend-migrate.exe
sh.Run "cmd /c taskkill /F /IM kiosk-backend.exe >nul 2>&1", 0, True
LogLine "taskkill kiosk-backend.exe done"
WScript.Sleep 800

If fso.FileExists(backend) Then
  sh.Run """" & backend & """", 0, False
  LogLine "started API"
  WScript.Sleep 4000
Else
  LogLine "ERROR: backend exe not found — API not started"
End If

If fso.FileExists(kiosk) Then
  sh.Run """" & kiosk & """", 1, False
  LogLine "started kiosk.exe"
Else
  LogLine "ERROR: kiosk.exe not found"
End If

If fso.FileExists(backend) Then
  ScheduleBale
Else
  LogLine "skip bale — no backend"
End If

LogLine "launcher finished (bale still scheduled if logged above)"

Sub ScheduleBale()
  ' ping -n 61 ≈ 60 seconds. start /B so no extra console.
  Dim cmd
  cmd = "cmd /c ping 127.0.0.1 -n 61 >nul & start """" /B """ & backend & """ bale_poll"
  LogLine "scheduling bale_poll in ~60s"
  sh.Run cmd, 0, False
End Sub

Sub LogLine(msg)
  Dim ts, p
  On Error Resume Next
  p = dir & "\kiosk-start.log"
  Set ts = fso.OpenTextFile(p, 8, True)
  ts.WriteLine Now & "  " & msg
  ts.Close
  On Error GoTo 0
End Sub
