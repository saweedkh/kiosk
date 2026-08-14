' Copy this file next to kiosk.exe and kiosk-backend-*.exe.
' Startup folder: Win+R → shell:startup → shortcut to THIS .vbs only
' (remove the two .exe shortcuts). Backend runs hidden; kiosk stays in front.

Option Explicit
Dim sh, fso, dir, backend, kiosk, f
Set sh = CreateObject("WScript.Shell")
Set fso = CreateObject("Scripting.FileSystemObject")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

backend = ""
For Each f In Array( _
  dir & "\kiosk-backend-x86_64-pc-windows-msvc.exe", _
  dir & "\kiosk-backend.exe" _
)
  If fso.FileExists(f) Then
    backend = f
    Exit For
  End If
Next

kiosk = dir & "\kiosk.exe"
If backend = "" Or Not fso.FileExists(kiosk) Then
  MsgBox "kiosk.exe / kiosk-backend.exe not found next to this script:" & vbCrLf & dir, 16, "Kiosk"
  WScript.Quit 1
End If

' 0 = hidden (no black console). Do not wait.
sh.Run """" & backend & """", 0, False
WScript.Sleep 2500
' 1 = normal window, focused
sh.Run """" & kiosk & """", 1, False
