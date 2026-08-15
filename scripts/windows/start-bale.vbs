' Put next to kiosk.exe. Starts ONLY the Bale worker (does not restart kiosk/API).
' Use this when the panel says polling is stale. Then open kiosk-start.log.
Option Explicit

Dim fso, sh, dir, backend, f
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
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

If backend = "" Then
  MsgBox "kiosk-backend.exe not found next to this script:" & vbCrLf & dir, 16, "Kiosk"
  WScript.Quit 1
End If

LogLine "===== start-bale.vbs ====="
LogLine "backend=" & backend
sh.Run """" & backend & """ bale_poll", 0, False
LogLine "launched bale_poll immediately"
Dim dataLog
dataLog = sh.ExpandEnvironmentStrings("%APPDATA%\com.kiosk.desktop\bale_poll.log")
MsgBox "ربات بله استارت شد (پنجره ندارد)." & vbCrLf & vbCrLf & _
  "اگر باز کار نکرد این فایل‌ها را باز کنید:" & vbCrLf & _
  dir & "\kiosk-start.log" & vbCrLf & _
  dataLog, 64, "Kiosk"

Sub LogLine(msg)
  Dim ts, p
  On Error Resume Next
  p = dir & "\kiosk-start.log"
  Set ts = fso.OpenTextFile(p, 8, True)
  ts.WriteLine Now & "  " & msg
  ts.Close
  On Error GoTo 0
End Sub
