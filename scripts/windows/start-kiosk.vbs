' Put next to kiosk.exe. Prefers onedir kiosk-backend\kiosk-backend.exe.
' Start API, wait a few seconds so Django can boot, then kiosk.exe.
' If a previous backend is still running, kill it first so the port is free.
' Bale is scheduled in a separate hidden wscript so this script can exit.
Option Explicit

Dim fso, sh, dir, backend, kiosk, bootFile, bootId, myId
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
bootFile = sh.ExpandEnvironmentStrings("%TEMP%") & "\kiosk-desktop-boot.id"

backend = dir & "\kiosk-backend\kiosk-backend.exe"
If Not fso.FileExists(backend) Then
  backend = dir & "\kiosk-backend-x86_64-pc-windows-msvc.exe"
End If
If Not fso.FileExists(backend) Then
  backend = dir & "\kiosk-backend.exe"
End If
kiosk = dir & "\kiosk.exe"

' Delayed bale: this copy only sleeps then starts the bot, then exits.
If WScript.Arguments.Count > 0 Then
  If LCase(WScript.Arguments(0)) = "/bale" Then
    myId = ""
    If WScript.Arguments.Count > 1 Then myId = WScript.Arguments(1)
    WScript.Sleep 60000
    If myId <> "" And ReadBootId() = myId And fso.FileExists(backend) Then
      sh.Run """" & backend & """ bale_poll", 0, False
    End If
    WScript.Quit 0
  End If
End If

' Does not touch kiosk-backend-migrate.exe
sh.Run "cmd /c taskkill /F /IM kiosk-backend.exe >nul 2>&1", 0, True
WScript.Sleep 800

bootId = NewBootId()
WriteBootId bootId

If fso.FileExists(backend) Then
  sh.Run """" & backend & """", 0, False
  WScript.Sleep 4000
End If

If fso.FileExists(kiosk) Then
  sh.Run """" & kiosk & """", 1, False
End If

If fso.FileExists(backend) Then
  sh.Run "wscript.exe """ & WScript.ScriptFullName & """ /bale " & bootId, 0, False
End If

Function NewBootId()
  Randomize
  NewBootId = CStr(Int(Timer * 1000)) & "-" & CStr(Int(Rnd * 100000))
End Function

Sub WriteBootId(id)
  Dim ts
  Set ts = fso.CreateTextFile(bootFile, True)
  ts.Write id
  ts.Close
End Sub

Function ReadBootId()
  Dim ts
  If Not fso.FileExists(bootFile) Then
    ReadBootId = ""
    Exit Function
  End If
  Set ts = fso.OpenTextFile(bootFile, 1)
  If ts.AtEndOfStream Then
    ReadBootId = ""
  Else
    ReadBootId = Trim(ts.ReadAll)
  End If
  ts.Close
End Function
