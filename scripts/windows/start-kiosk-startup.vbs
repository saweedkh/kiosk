' Copy this file next to kiosk.exe.
' Startup folder: Win+R → shell:startup → shortcut to THIS .vbs only.
' Prefers onedir folder (fast). Falls back to a single .exe beside kiosk.exe.
' Starts API, waits a few seconds, then kiosk.exe.
' If a previous backend is still running, kill it first so the port is free.
' Bale is scheduled in a separate hidden wscript so this script can exit.

Option Explicit
Dim sh, fso, dir, backend, kiosk, f, bootFile, bootId, myId
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)
bootFile = sh.ExpandEnvironmentStrings("%TEMP%") & "\kiosk-desktop-boot.id"

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

' Delayed bale: this copy only sleeps then starts the bot, then exits.
If WScript.Arguments.Count > 0 Then
  If LCase(WScript.Arguments(0)) = "/bale" Then
    myId = ""
    If WScript.Arguments.Count > 1 Then myId = WScript.Arguments(1)
    WScript.Sleep 60000
    If myId <> "" And ReadBootId() = myId And backend <> "" Then
      sh.Run """" & backend & """ bale_poll", 0, False
    End If
    WScript.Quit 0
  End If
End If

If backend = "" Or Not fso.FileExists(kiosk) Then
  MsgBox "kiosk.exe / kiosk-backend not found next to this script:" & vbCrLf & dir, 16, "Kiosk"
  WScript.Quit 1
End If

' Does not touch kiosk-backend-migrate.exe
sh.Run "cmd /c taskkill /F /IM kiosk-backend.exe >nul 2>&1", 0, True
WScript.Sleep 800

bootId = NewBootId()
WriteBootId bootId

' 0 = hidden
sh.Run """" & backend & """", 0, False
WScript.Sleep 4000
sh.Run """" & kiosk & """", 1, False
sh.Run "wscript.exe """ & WScript.ScriptFullName & """ /bale " & bootId, 0, False

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
