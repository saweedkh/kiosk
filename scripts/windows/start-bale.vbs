' Put NEXT TO kiosk.exe on the Windows kiosk.
' Uses a console copy of the migrate exe so bale_poll errors are visible.
Option Explicit

Dim fso, sh, dir, migrate, baleExe, backend
Set fso = CreateObject("Scripting.FileSystemObject")
Set sh = CreateObject("WScript.Shell")
dir = fso.GetParentFolderName(WScript.ScriptFullName)

migrate = dir & "\kiosk-backend\kiosk-backend-migrate.exe"
baleExe = dir & "\kiosk-backend\kiosk-bale.exe"
backend = dir & "\kiosk-backend\kiosk-backend.exe"

If fso.FileExists(migrate) Then
  fso.CopyFile migrate, baleExe, True
  sh.CurrentDirectory = dir & "\kiosk-backend"
  sh.Run """" & baleExe & """ bale_poll", 1, False
  MsgBox "پنجره سیاه باید باز شود و بماند." & vbCrLf & _
    "اگر فوری بسته شد، متن خطا همان‌جاست." & vbCrLf & _
    "اگر باز شد، ۲۰ ثانیه بعد پنل ربات بله را رفرش کن.", 64, "Kiosk"
ElseIf fso.FileExists(backend) Then
  sh.CurrentDirectory = dir & "\kiosk-backend"
  sh.Run """" & backend & """ bale_poll", 1, False
  MsgBox "migrate exe نبود؛ همان backend بدون کنسول زده شد. اگر باز کار نکرد start-bale.bat را بزن.", 48, "Kiosk"
Else
  MsgBox "kiosk-backend.exe پیدا نشد. این فایل باید کنار kiosk.exe باشد:" & vbCrLf & dir, 16, "Kiosk"
End If
