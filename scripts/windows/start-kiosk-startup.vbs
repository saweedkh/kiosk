' Copy this file next to kiosk.exe.
' Startup folder: Win+R → shell:startup → shortcut to THIS .vbs only.
' Prefers onedir folder (fast). Falls back to a single .exe beside kiosk.exe.
' Starts API, waits a few seconds, then kiosk.exe.
' If a previous backend is still running, kill it first so the port is free.
' Bale: copy migrate exe → kiosk-bale.exe (has a console; windowed kiosk-backend.exe dies).
' Watch progress: kiosk-start.log next to this script.

Option Explicit
Dim sh, fso, dir, backend, kiosk, f
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

backend = ""
For Each f In Array( _
  dir & "\kiosk-backend\kiosk-backend.exe", _
  dir & "\kiosk-backend-x86_64-pc-windows-msvc.exe", _
  dir & "\kiosk-backend.exe" _
)
  If fso.FileExists(f) Then
    backend = f
    Exit For
  End If
Next

kiosk = dir & "\kiosk.exe"

LogLine "===== start-kiosk-startup.vbs ====="
LogLine "dir=" & dir
LogLine "backend=" & backend
LogLine "kiosk=" & kiosk

If backend = "" Or Not fso.FileExists(kiosk) Then
  LogLine "ERROR: kiosk.exe / kiosk-backend not found"
  MsgBox "kiosk.exe / kiosk-backend not found next to this script:" & vbCrLf & dir, 16, "Kiosk"
  WScript.Quit 1
End If

' Does not touch kiosk-backend-migrate.exe
sh.Run "cmd /c taskkill /F /IM kiosk-backend.exe >nul 2>&1", 0, True
sh.Run "cmd /c taskkill /F /IM kiosk-bale.exe >nul 2>&1", 0, True
LogLine "taskkill kiosk-backend.exe / kiosk-bale.exe done"
WScript.Sleep 800

sh.Run """" & backend & """", 0, False
LogLine "started API"
WScript.Sleep 4000
sh.Run """" & kiosk & """", 1, False
LogLine "started kiosk.exe"

ScheduleBale
LogLine "launcher finished"

Function BaleExePath()
  Dim migrate, baleExe
  migrate = dir & "\kiosk-backend\kiosk-backend-migrate.exe"
  baleExe = dir & "\kiosk-backend\kiosk-bale.exe"
  If fso.FileExists(migrate) Then
    On Error Resume Next
    fso.CopyFile migrate, baleExe, True
    On Error GoTo 0
  End If
  If fso.FileExists(baleExe) Then
    BaleExePath = baleExe
  Else
    BaleExePath = backend
  End If
End Function

Sub ScheduleBale()
  Dim exe, cmd
  exe = BaleExePath()
  cmd = "cmd /c ping 127.0.0.1 -n 61 >nul & start """" /MIN """ & exe & """ bale_poll"
  LogLine "scheduling bale_poll in ~60s exe=" & exe
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
